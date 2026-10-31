import { addDays, localDay, weekdayOf, zonedInstant } from './time';

/** Start times are offered every 30 minutes from opening time. */
export const slotStepMin = 30;
/** Nobody can book a time that starts in less than an hour: the professional needs to see it. */
export const minNoticeMin = 60;
/** How far ahead clients can book. */
export const bookingWindowDays = 14;

export type Busy = { startsAt: Date; endsAt: Date };
/** Opening hours of one weekday in minutes after midnight; null when closed. */
export type OpenHours = { opensAt: number; closesAt: number } | null;

export type SlotQuery = {
  day: string;
  hours: OpenHours;
  durationMin: number;
  busy: Busy[];
  now: Date;
  timeZone: string;
};

const overlaps = (a: Busy, b: Busy) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

/**
 * Free start times on one day: inside opening hours, the whole service fits before closing, at
 * least `minNoticeMin` from now, and not overlapping any confirmed booking.
 */
export function freeSlots({ day, hours, durationMin, busy, now, timeZone }: SlotQuery): Date[] {
  if (!hours) return [];
  const earliest = now.getTime() + minNoticeMin * 60_000;
  const slots: Date[] = [];
  for (let m = hours.opensAt; m + durationMin <= hours.closesAt; m += slotStepMin) {
    const startsAt = zonedInstant(day, m, timeZone);
    if (startsAt.getTime() < earliest) continue;
    const candidate = { startsAt, endsAt: new Date(startsAt.getTime() + durationMin * 60_000) };
    if (!busy.some((b) => overlaps(b, candidate))) slots.push(startsAt);
  }
  return slots;
}

/** Today and the following days a client can book, in the business's time zone. */
export function bookableDays(now: Date, timeZone: string, count = bookingWindowDays): string[] {
  const today = localDay(now, timeZone);
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

/** Opening hours of a calendar day, from the week's rows. */
export function hoursOn(
  day: string,
  week: { weekday: number; opensAt: number; closesAt: number }[],
): OpenHours {
  const row = week.find((r) => r.weekday === weekdayOf(day));
  return row ? { opensAt: row.opensAt, closesAt: row.closesAt } : null;
}
