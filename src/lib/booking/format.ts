import { zonedInstant } from './time';

/** Dates are always shown in the business's time zone, the one the client will walk in at. */
const tag = (locale: string) => (locale === 'en' ? 'en-US' : 'pt-BR');

/** "seg., 2 de nov." / "Mon, Nov 2" for a calendar day. */
export function formatDayShort(day: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(zonedInstant(day, 12 * 60, timeZone));
}

/** "segunda-feira, 2 de novembro" / "Monday, November 2". */
export function formatDayLong(day: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(zonedInstant(day, 12 * 60, timeZone));
}

/** "09:00" / "9:00 AM". */
export function formatTime(instant: Date, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(instant);
}

/** "segunda-feira, 2 de novembro às 09:00" / "Monday, November 2 at 9:00 AM". */
export function formatWhen(instant: Date, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(instant);
}

/** A Google Calendar link that opens a ready-made event; nothing is sent anywhere by Naora. */
export function googleCalendarUrl(title: string, startsAt: Date, durationMin: number) {
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(startsAt)}/${stamp(endsAt)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
