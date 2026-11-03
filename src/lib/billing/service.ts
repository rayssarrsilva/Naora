import 'server-only';
import { businessForUser } from '@/lib/business/repository';
import { localDay, zonedInstant } from '@/lib/booking/time';
import { db } from '@/lib/db/client';
import { platformToken } from '@/lib/payments/config';
import {
  cancelSubscription,
  createSubscription,
  getSubscription,
} from '@/lib/payments/mercadopago';
import { siteUrl } from '@/lib/site';
import { type PlanName, proPriceCents } from './pricing';

export type BillingOverview = {
  plan: PlanName;
  demo: boolean;
  /** Paid deposits this month, in the business's time zone. */
  paidDeposits: number;
  depositsCents: number;
  feesCents: number;
  canSubscribe: boolean;
};

/** The plan and this month's numbers, for the dashboard. */
export async function billingOverview(
  userId: string,
  now = new Date(),
): Promise<BillingOverview | null> {
  const mine = await businessForUser(userId);
  if (!mine) return null;
  const business = await db().business.findUnique({
    where: { id: mine.id },
    select: { plan: true, demo: true, timezone: true },
  });
  if (!business) return null;
  const monthStart = zonedInstant(
    `${localDay(now, business.timezone).slice(0, 8)}01`,
    0,
    business.timezone,
  );
  const totals = await db().payment.aggregate({
    where: { businessId: mine.id, status: 'APPROVED', paidAt: { gte: monthStart } },
    _count: true,
    _sum: { amountCents: true, feeCents: true },
  });
  return {
    plan: business.plan,
    demo: business.demo,
    paidDeposits: totals._count,
    depositsCents: totals._sum.amountCents ?? 0,
    feesCents: totals._sum.feeCents ?? 0,
    canSubscribe: business.demo || platformToken() !== null,
  };
}

export type SubscribeResult =
  | { ok: true; checkoutUrl: string | null }
  | { ok: false; error: 'notFound' | 'alreadyPro' | 'paymentsOff' | 'paymentUnavailable' };

/**
 * Starts the Pro subscription: Mercado Pago's checkout page for a monthly charge on Naora's own
 * account. The plan only changes when Mercado Pago says the subscription is authorized (webhook).
 * Demo businesses switch at once, nothing is charged.
 */
export async function subscribePro(
  userId: string,
  payerEmail: string,
  locale: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubscribeResult> {
  const mine = await businessForUser(userId);
  if (!mine) return { ok: false, error: 'notFound' };
  const business = await db().business.findUnique({
    where: { id: mine.id },
    select: { plan: true, demo: true },
  });
  if (!business) return { ok: false, error: 'notFound' };
  if (business.plan === 'PRO') return { ok: false, error: 'alreadyPro' };
  if (business.demo) {
    await db().business.update({ where: { id: mine.id }, data: { plan: 'PRO' } });
    return { ok: true, checkoutUrl: null };
  }
  const token = platformToken();
  if (!token) return { ok: false, error: 'paymentsOff' };
  try {
    const subscription = await createSubscription(
      {
        accessToken: token,
        reason: 'Naora Pro',
        amountCents: proPriceCents,
        payerEmail,
        externalReference: mine.id,
        backUrl: `${siteUrl()}/${locale}/painel?pro=1`,
      },
      fetchImpl,
    );
    await db().business.update({
      where: { id: mine.id },
      data: { proSubscriptionId: subscription.id },
    });
    return { ok: true, checkoutUrl: subscription.initPoint };
  } catch (error) {
    console.error('[billing] could not create the subscription', error);
    return { ok: false, error: 'paymentUnavailable' };
  }
}

/** Back to Free. Cancels the subscription on Mercado Pago first, so it is never charged again. */
export async function cancelPro(userId: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const mine = await businessForUser(userId);
  if (!mine) return false;
  const business = await db().business.findUnique({
    where: { id: mine.id },
    select: { demo: true, proSubscriptionId: true },
  });
  if (!business) return false;
  if (!business.demo && business.proSubscriptionId) {
    const token = platformToken();
    if (!token) return false;
    await cancelSubscription(token, business.proSubscriptionId, fetchImpl);
  }
  await db().business.update({
    where: { id: mine.id },
    data: { plan: 'FREE', proSubscriptionId: null },
  });
  return true;
}

export type SubscriptionOutcome = 'pro' | 'free' | 'pending' | 'ignored';

/**
 * Applies what Mercado Pago says about a subscription (webhook). Only the subscription Naora
 * created for that business counts: the id must match the one stored on the business.
 */
export async function syncSubscription(
  subscriptionId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubscriptionOutcome> {
  const token = platformToken();
  if (!token) return 'ignored';
  const remote = await getSubscription(token, subscriptionId, fetchImpl);
  const business = await db().business.findFirst({
    where: { id: remote.externalReference, proSubscriptionId: remote.id },
    select: { id: true },
  });
  if (!business) return 'ignored';
  if (remote.status === 'authorized') {
    await db().business.update({ where: { id: business.id }, data: { plan: 'PRO' } });
    return 'pro';
  }
  if (remote.status === 'cancelled' || remote.status === 'paused') {
    await db().business.update({
      where: { id: business.id },
      data: { plan: 'FREE', ...(remote.status === 'cancelled' ? { proSubscriptionId: null } : {}) },
    });
    return 'free';
  }
  return 'pending';
}
