/**
 * Dates in a business's own time zone. A day is a "YYYY-MM-DD" string in that zone; instants are
 * Date objects (UTC). The server may run in any time zone, so nothing here uses the machine's.
 */

const dayFormat = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let format = dayFormat.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    dayFormat.set(timeZone, format);
  }
  return format;
}

function parts(instant: Date, timeZone: string) {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return values as { year: number; month: number; day: number; hour: number; minute: number };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The day an instant falls on in the zone: "2026-11-02". */
export function localDay(instant: Date, timeZone: string): string {
  const { year, month, day } = parts(instant, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Minutes after local midnight of an instant in the zone. */
export function localMinutes(instant: Date, timeZone: string): number {
  const { hour, minute } = parts(instant, timeZone);
  return hour * 60 + minute;
}

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDay(value: string): boolean {
  const match = dayPattern.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().startsWith(value);
}

/** 0 = Sunday … 6 = Saturday, for a calendar day (the same everywhere). */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

/** The calendar day `count` days after `day`. */
export function addDays(day: string, count: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + count)).toISOString().slice(0, 10);
}

/** The instant of "day at minutes after midnight" in the zone, e.g. 09:00 in São Paulo → 12:00Z. */
export function zonedInstant(day: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const asUtc = Date.UTC(y!, m! - 1, d!, 0, minutes);
  // Guess with the zone's offset at that moment, then correct once in case the guess crossed a
  // daylight-saving change.
  let instant = asUtc - offsetMs(new Date(asUtc), timeZone);
  instant = asUtc - offsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

function offsetMs(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const utc = Math.floor(instant.getTime() / 60_000) * 60_000;
  return local - utc;
}
