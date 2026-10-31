/** "09:30" → 570 minutes after midnight; null for anything that is not a valid 24-hour time. */
export function timeToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** 570 → "09:30". */
export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Monday first, as people in Brazil read a week; values follow Date#getDay (0 = Sunday). */
export const weekOrder = [1, 2, 3, 4, 5, 6, 0] as const;

export type DayHours = { weekday: number; open: boolean; opensAt: string; closesAt: string };

/** What a new business starts with: Monday to Saturday, 9:00 to 18:00. */
export function defaultWeek(): DayHours[] {
  return weekOrder.map((weekday) => ({
    weekday,
    open: weekday !== 0,
    opensAt: '09:00',
    closesAt: '18:00',
  }));
}
