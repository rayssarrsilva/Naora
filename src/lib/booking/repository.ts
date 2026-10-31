import 'server-only';
import { db } from '@/lib/db/client';
import { businessForUser } from '@/lib/business/repository';
import type { BookingData } from './schema';
import { type Busy, bookableDays, freeSlots, hoursOn } from './slots';
import { addDays, localDay, zonedInstant } from './time';

export type BookingContext = {
  business: { id: string; name: string; slug: string; timezone: string };
  service: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
    depositCents: number;
  };
  week: { weekday: number; opensAt: number; closesAt: number }[];
};

/** The business and one of its active services, or null if either does not exist. */
export async function bookingContext(
  slug: string,
  serviceId: string,
): Promise<BookingContext | null> {
  const business = await db().business.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, timezone: true },
  });
  if (!business) return null;
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
  return service ? { business, service, week } : null;
}

type Reader = Pick<ReturnType<typeof db>, 'booking'>;

/** Confirmed bookings that touch [from, to). */
function busyBetween(reader: Reader, businessId: string, from: Date, to: Date): Promise<Busy[]> {
  return reader.booking.findMany({
    where: { businessId, status: 'CONFIRMED', startsAt: { lt: to }, endsAt: { gt: from } },
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
  { ok: true; bookingId: string } | { ok: false; error: 'notFound' | 'slotTaken' };

/**
 * Books a time if it is still free. Two clients clicking the same time at once must never both
 * succeed, so the check and the insert run in one transaction holding a lock for this business:
 * the second request waits, then sees the first booking and gets "slotTaken".
 */
export async function createBooking(
  slug: string,
  data: BookingData,
  now = new Date(),
): Promise<CreateBookingResult> {
  const context = await bookingContext(slug, data.serviceId);
  if (!context) return { ok: false, error: 'notFound' };
  const { business, service, week } = context;
  const startsAt = new Date(data.startsAt);
  const day = localDay(startsAt, business.timezone);
  if (!bookableDays(now, business.timezone).includes(day)) return { ok: false, error: 'slotTaken' };

  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${business.id}))`;
    const busy = await busyBetween(
      tx,
      business.id,
      zonedInstant(day, 0, business.timezone),
      zonedInstant(addDays(day, 1), 0, business.timezone),
    );
    const free = freeSlots({
      day,
      hours: hoursOn(day, week),
      durationMin: service.durationMin,
      busy,
      now,
      timeZone: business.timezone,
    });
    if (!free.some((slot) => slot.getTime() === startsAt.getTime())) {
      return { ok: false, error: 'slotTaken' } as const;
    }
    const booking = await tx.booking.create({
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
      },
      select: { id: true },
    });
    return { ok: true, bookingId: booking.id } as const;
  });
}

export type BookingSummary = {
  id: string;
  businessName: string;
  slug: string;
  timezone: string;
  serviceName: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  clientName: string;
  startsAt: Date;
  status: 'CONFIRMED' | 'CANCELLED';
};

/** The confirmation a client sees after booking. The id is long and random; no phone is shown. */
export async function bookingSummary(
  slug: string,
  bookingId: string,
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
      business: { select: { name: true, slug: true, timezone: true } },
    },
  });
  if (!booking) return null;
  const { business, ...rest } = booking;
  return { ...rest, businessName: business.name, slug: business.slug, timezone: business.timezone };
}

export type OwnerBooking = {
  id: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  endsAt: Date;
};

/** The owner's confirmed bookings that have not ended yet, soonest first. */
export async function upcomingBookings(userId: string, now = new Date()): Promise<OwnerBooking[]> {
  const business = await businessForUser(userId);
  if (!business) return [];
  return db().booking.findMany({
    where: { businessId: business.id, status: 'CONFIRMED', endsAt: { gt: now } },
    select: {
      id: true,
      serviceName: true,
      clientName: true,
      clientPhone: true,
      startsAt: true,
      endsAt: true,
    },
    orderBy: { startsAt: 'asc' },
    take: 100,
  });
}

/** True when the booking was confirmed in the user's own business and is now cancelled. */
export async function cancelBooking(userId: string, bookingId: string): Promise<boolean> {
  const business = await businessForUser(userId);
  if (!business) return false;
  const { count } = await db().booking.updateMany({
    where: { id: bookingId, businessId: business.id, status: 'CONFIRMED' },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
  return count === 1;
}
