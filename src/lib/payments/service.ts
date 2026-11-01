import 'server-only';
import { isoWithOffset } from '@/lib/booking/time';
import { db, lockedTransaction } from '@/lib/db/client';
import { decryptSecret } from '@/lib/security/secrets';
import { siteUrl } from '@/lib/site';
import { createPixCharge, getPayment } from './mercadopago';

/**
 * The Pix deposit of a booking. Two providers:
 * - "mercadopago": a real charge on the business's own Mercado Pago account;
 * - "demo": for demo businesses, a fake Pix code and a "simulate payment" button, never a charge.
 *
 * A booking is confirmed only by `markPaid`, which runs after Mercado Pago itself says "approved"
 * (read with the business's token) or, for demo businesses only, after the simulate button.
 */

export type DepositRequest = {
  bookingId: string;
  businessId: string;
  timezone: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  expiresAt: Date;
};

/** A Pix-looking code that every banking app rejects, so nobody can pay a demo by mistake. */
export const demoPixCode = (bookingId: string) =>
  `NAORA-DEMO-PIX-${bookingId}-NAO-E-UM-PIX-DE-VERDADE`;

/** Creates the charge and stores it. False when it could not be created. */
export async function startDeposit(
  request: DepositRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const business = await db().business.findUnique({
    where: { id: request.businessId },
    select: { demo: true, mpAccessToken: true },
  });
  if (!business) return false;
  const base = {
    bookingId: request.bookingId,
    businessId: request.businessId,
    amountCents: request.amountCents,
    expiresAt: request.expiresAt,
  };

  if (business.demo) {
    await db().payment.create({
      data: { ...base, provider: 'demo', pixCode: demoPixCode(request.bookingId) },
    });
    return true;
  }
  if (!business.mpAccessToken) return false;

  try {
    const charge = await createPixCharge(
      {
        accessToken: decryptSecret(business.mpAccessToken),
        amountCents: request.amountCents,
        description: request.description,
        payerEmail: request.payerEmail,
        externalReference: request.bookingId,
        notificationUrl: `${siteUrl()}/api/webhooks/mercadopago/${request.businessId}`,
        expiresAt: isoWithOffset(request.expiresAt, request.timezone),
        idempotencyKey: request.bookingId,
      },
      fetchImpl,
    );
    await db().payment.create({
      data: {
        ...base,
        provider: 'mercadopago',
        providerPaymentId: charge.providerPaymentId,
        pixCode: charge.pixCode,
        ticketUrl: charge.ticketUrl,
        status: charge.status === 'approved' ? 'APPROVED' : 'PENDING',
      },
    });
    return true;
  } catch (error) {
    console.error('[payments] could not create the Pix charge', error);
    return false;
  }
}

export type PaidOutcome = 'confirmed' | 'alreadyConfirmed' | 'conflict' | 'notFound';

/**
 * Records a paid deposit and confirms the booking. A payment that arrives after the hold ended is
 * still recorded; the booking is confirmed only if nobody took the time meanwhile ("conflict"
 * means the business must refund it). Runs under the same per-business lock as new bookings.
 */
export async function markPaid(paymentId: string, now = new Date()): Promise<PaidOutcome> {
  return db().$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        businessId: true,
        booking: { select: { id: true, status: true, startsAt: true, endsAt: true } },
      },
    });
    if (!payment) return 'notFound';
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${payment.businessId}))`;
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'APPROVED', paidAt: now },
    });
    const { booking } = payment;
    if (booking.status === 'CONFIRMED') return 'alreadyConfirmed';

    const clash = await tx.booking.count({
      where: {
        businessId: payment.businessId,
        id: { not: booking.id },
        startsAt: { lt: booking.endsAt },
        endsAt: { gt: booking.startsAt },
        OR: [{ status: 'CONFIRMED' }, { status: 'PENDING_PAYMENT', holdUntil: { gt: now } }],
      },
    });
    if (clash > 0) return 'conflict';
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED', holdUntil: null, cancelledAt: null },
    });
    return 'confirmed';
  }, lockedTransaction);
}

/** The demo's "simulate payment" button. Refused for any business that is not a demo. */
export async function simulateDemoPayment(slug: string, bookingId: string): Promise<boolean> {
  const payment = await db().payment.findFirst({
    where: {
      provider: 'demo',
      status: 'PENDING',
      booking: { id: bookingId, status: 'PENDING_PAYMENT', business: { slug, demo: true } },
    },
    select: { id: true },
  });
  if (!payment) return false;
  return (await markPaid(payment.id)) === 'confirmed';
}

export type SyncOutcome = PaidOutcome | 'pending' | 'failed' | 'ignored';

/**
 * Reads a Mercado Pago payment with the business's token and applies what it says. Called by the
 * webhook and by the client's "I have paid" button. The notification is never trusted on its own:
 * a forged one can only make Naora ask Mercado Pago again.
 */
export async function syncMercadoPagoPayment(
  businessId: string,
  providerPaymentId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SyncOutcome> {
  const payment = await db().payment.findFirst({
    where: { provider: 'mercadopago', providerPaymentId, businessId },
    select: { id: true, bookingId: true, business: { select: { mpAccessToken: true } } },
  });
  if (!payment?.business.mpAccessToken) return 'ignored';

  const remote = await getPayment(
    decryptSecret(payment.business.mpAccessToken),
    providerPaymentId,
    fetchImpl,
  );
  if (remote.externalReference && remote.externalReference !== payment.bookingId) return 'ignored';
  if (remote.status === 'approved') return markPaid(payment.id);
  if (remote.status === 'failed') {
    await db().$transaction([
      db().payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } }),
      db().booking.updateMany({
        where: { id: payment.bookingId, status: 'PENDING_PAYMENT' },
        data: { status: 'CANCELLED', cancelledAt: new Date(), holdUntil: null },
      }),
    ]);
    return 'failed';
  }
  return 'pending';
}

/** The "I have paid" button: asks Mercado Pago again for this booking's payment. */
export async function refreshPayment(slug: string, bookingId: string): Promise<SyncOutcome> {
  const payment = await db().payment.findFirst({
    where: { provider: 'mercadopago', booking: { id: bookingId, business: { slug } } },
    select: { businessId: true, providerPaymentId: true },
  });
  if (!payment?.providerPaymentId) return 'ignored';
  return syncMercadoPagoPayment(payment.businessId, payment.providerPaymentId);
}
