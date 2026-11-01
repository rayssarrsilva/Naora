import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { businessForUser } from '@/lib/business/repository';
import { db, lockedTransaction } from '@/lib/db/client';
import { startDeposit } from '@/lib/payments/service';
import type { BookingData } from './schema';
import { type Busy, bookableDays, freeSlots, hoursOn } from './slots';
import { addDays, localDay, zonedInstant } from './time';

/** How long an unpaid booking holds its time. Mercado Pago's shortest Pix expiry is 30 minutes. */
export const holdMinutes = 30;

export type BookingContext = {
  business: { id: string; name: string; slug: string; timezone: string; takesDeposits: boolean };
  service: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
    depositCents: number;
  };
  week: { weekday: number; opensAt: number; closesAt: number }[];
};

/**
 * The business and one of its active services, or null if either does not exist. A business takes
 * deposits when it connected Mercado Pago, or when it is a demo business (simulated Pix).
 */
export async function bookingContext(
  slug: string,
  serviceId: string,
): Promise<BookingContext | null> {
  const found = await db().business.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, timezone: true, demo: true, mpConnectedAt: true },
  });
  if (!found) return null;
  const { demo, mpConnectedAt, ...business } = found;
  const [service, week] = await Promise.all([
    db().service.findFirst({
      where: { id: serviceId, businessId: business.id, active: true },
      select: { id: true, name: true, durationMin: true, priceCents: true, depositCents: true },
    }),
    db().openingHours.findMany({
      where: { businessId: business.id },
      select: { weekday: true, opensAt: true, closesAt: true },
    }),
  ]);
  if (!service) return null;
  return {
    business: { ...business, takesDeposits: demo || mpConnectedAt !== null },
    service,
    week,
  };
}

/** True when booking this service asks for a Pix deposit. */
export const needsDeposit = (context: BookingContext) =>
  context.business.takesDeposits && context.service.depositCents > 0;

/** Bookings that block a time: confirmed ones, and unpaid ones still inside their hold. */
export const blockingAt = (now: Date): Prisma.BookingWhereInput => ({
  OR: [{ status: 'CONFIRMED' }, { status: 'PENDING_PAYMENT', holdUntil: { gt: now } }],
});

type Reader = Pick<ReturnType<typeof db>, 'booking'>;

/** Blocking bookings that touch [from, to). */
function busyBetween(
  reader: Reader,
  businessId: string,
  from: Date,
  to: Date,
  now: Date,
): Promise<Busy[]> {
  return reader.booking.findMany({
    where: { businessId, startsAt: { lt: to }, endsAt: { gt: from }, ...blockingAt(now) },
    select: { startsAt: true, endsAt: true },
  });
}

export type DaySlots = { day: string; slots: Date[] };

/** Free times for each bookable day, from one query for the whole window. */
export async function availability(context: BookingContext, now = new Date()): Promise<DaySlots[]> {
  const { business, service, week } = context;
  const days = bookableDays(now, business.timezone);
  const busy = await busyBetween(
    db(),
    business.id,
    zonedInstant(days[0]!, 0, business.timezone),
    zonedInstant(addDays(days.at(-1)!, 1), 0, business.timezone),
    now,
  );
  return days.map((day) => ({
    day,
    slots: freeSlots({
      day,
      hours: hoursOn(day, week),
      durationMin: service.durationMin,
      busy,
      now,
      timeZone: business.timezone,
    }),
  }));
}

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: 'notFound' | 'slotTaken' | 'emailRequired' | 'paymentUnavailable' };

/**
 * Books a time if it is still free. Two clients clicking the same time at once must never both
 * succeed, so the check and the insert run in one transaction holding a lock for this business:
 * the second request waits, then sees the first booking and gets "slotTaken".
 *
 * With a deposit, the booking starts as PENDING_PAYMENT and holds the time for `holdMinutes`;
 * then the Pix charge is created. If Mercado Pago is unavailable, the booking is cancelled at once
 * so the time is not held for nothing.
 */
export async function createBooking(
  slug: string,
  data: BookingData,
  now = new Date(),
): Promise<CreateBookingResult> {
  const context = await bookingContext(slug, data.serviceId);
  if (!context) return { ok: false, error: 'notFound' };
  const { business, service, week } = context;
  const deposit = needsDeposit(context);
  if (deposit && !data.email) return { ok: false, error: 'emailRequired' };
  const startsAt = new Date(data.startsAt);
  const day = localDay(startsAt, business.timezone);
  if (!bookableDays(now, business.timezone).includes(day)) return { ok: false, error: 'slotTaken' };
  const holdUntil = new Date(now.getTime() + holdMinutes * 60_000);

  const created = await db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${business.id}))`;
    const busy = await busyBetween(
      tx,
      business.id,
      zonedInstant(day, 0, business.timezone),
      zonedInstant(addDays(day, 1), 0, business.timezone),
      now,
    );
    const free = freeSlots({
      day,
      hours: hoursOn(day, week),
      durationMin: service.durationMin,
      busy,
      now,
      timeZone: business.timezone,
    });
    if (!free.some((slot) => slot.getTime() === startsAt.getTime())) return null;
    return tx.booking.create({
      data: {
        businessId: business.id,
        serviceId: service.id,
        serviceName: service.name,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
        depositCents: service.depositCents,
        clientName: data.name,
        clientPhone: data.phone,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
        status: deposit ? 'PENDING_PAYMENT' : 'CONFIRMED',
        holdUntil: deposit ? holdUntil : null,
      },
      select: { id: true },
    });
  }, lockedTransaction);
  if (!created) return { ok: false, error: 'slotTaken' };

  if (deposit) {
    const started = await startDeposit({
      bookingId: created.id,
      businessId: business.id,
      timezone: business.timezone,
      amountCents: service.depositCents,
      description: `${service.name} · ${business.name}`,
      payerEmail: data.email!,
      expiresAt: holdUntil,
    });
    if (!started) {
      await db().booking.update({
        where: { id: created.id },
        data: { status: 'CANCELLED', cancelledAt: now, holdUntil: null },
      });
      return { ok: false, error: 'paymentUnavailable' };
    }
  }
  return { ok: true, bookingId: created.id };
}

/** What the client sees on the booking's page, worked out from the status and the clock. */
export type BookingState = 'confirmed' | 'awaitingPayment' | 'expired' | 'cancelled';

export type BookingSummary = {
  id: string;
  businessName: string;
  slug: string;
  timezone: string;
  demo: boolean;
  serviceName: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  clientName: string;
  startsAt: Date;
  state: BookingState;
  holdUntil: Date | null;
  payment: { provider: string; pixCode: string; ticketUrl: string | null } | null;
};

export function stateOf(
  booking: { status: string; holdUntil: Date | null },
  now: Date,
): BookingState {
  if (booking.status === 'CONFIRMED') return 'confirmed';
  if (booking.status === 'PENDING_PAYMENT') {
    return booking.holdUntil && booking.holdUntil > now ? 'awaitingPayment' : 'expired';
  }
  return 'cancelled';
}

/** The page a client sees after booking. The id is long and random; no phone is shown. */
export async function bookingSummary(
  slug: string,
  bookingId: string,
  now = new Date(),
): Promise<BookingSummary | null> {
  const booking = await db().booking.findFirst({
    where: { id: bookingId, business: { slug } },
    select: {
      id: true,
      serviceName: true,
      durationMin: true,
      priceCents: true,
      depositCents: true,
      clientName: true,
      startsAt: true,
      status: true,
      holdUntil: true,
      business: { select: { name: true, slug: true, timezone: true, demo: true } },
      payment: { select: { provider: true, pixCode: true, ticketUrl: true } },
    },
  });
  if (!booking) return null;
  const { business, status, ...rest } = booking;
  return {
    ...rest,
    state: stateOf({ status, holdUntil: booking.holdUntil }, now),
    businessName: business.name,
    slug: business.slug,
    timezone: business.timezone,
    demo: business.demo,
  };
}

export type OwnerBooking = {
  id: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  endsAt: Date;
  awaitingPayment: boolean;
};

/** The owner's bookings that have not ended yet, confirmed or still waiting for the Pix. */
export async function upcomingBookings(userId: string, now = new Date()): Promise<OwnerBooking[]> {
  const business = await businessForUser(userId);
  if (!business) return [];
  const rows = await db().booking.findMany({
    where: { businessId: business.id, endsAt: { gt: now }, ...blockingAt(now) },
    select: {
      id: true,
      serviceName: true,
      clientName: true,
      clientPhone: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
    orderBy: { startsAt: 'asc' },
    take: 100,
  });
  return rows.map(({ status, ...row }) => ({
    ...row,
    awaitingPayment: status === 'PENDING_PAYMENT',
  }));
}

/** True when the booking was active in the user's own business and is now cancelled. */
export async function cancelBooking(userId: string, bookingId: string): Promise<boolean> {
  const business = await businessForUser(userId);
  if (!business) return false;
  const { count } = await db().booking.updateMany({
    where: {
      id: bookingId,
      businessId: business.id,
      status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
    },
    data: { status: 'CANCELLED', cancelledAt: new Date(), holdUntil: null },
  });
  return count === 1;
}
