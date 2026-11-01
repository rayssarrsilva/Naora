import { formatPhone, normalizePhone, bookingSchema } from './schema';
import { bookableDays, freeSlots, hoursOn } from './slots';
import { addDays, isDay, localDay, localMinutes, weekdayOf, zonedInstant } from './time';

const sp = 'America/Sao_Paulo';
const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

describe('time zones', () => {
  it('turns 09:00 in São Paulo into 12:00 UTC', () => {
    expect(zonedInstant('2026-11-02', 9 * 60, sp).toISOString()).toBe('2026-11-02T12:00:00.000Z');
  });

  it('follows daylight saving time where it exists', () => {
    // New York: UTC-4 in October, UTC-5 in December.
    expect(zonedInstant('2026-10-15', 9 * 60, 'America/New_York').toISOString()).toBe(
      '2026-10-15T13:00:00.000Z',
    );
    expect(zonedInstant('2026-12-15', 9 * 60, 'America/New_York').toISOString()).toBe(
      '2026-12-15T14:00:00.000Z',
    );
  });

  it('reads the local day and time of an instant, not the server’s', () => {
    const lateNight = new Date('2026-11-03T02:30:00Z'); // still Nov 2 in São Paulo
    expect(localDay(lateNight, sp)).toBe('2026-11-02');
    expect(localMinutes(lateNight, sp)).toBe(23 * 60 + 30);
  });

  it('does calendar arithmetic across months', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(weekdayOf('2026-11-02')).toBe(1); // Monday
    expect(isDay('2026-02-29')).toBe(false);
    expect(isDay('2028-02-29')).toBe(true);
    expect(isDay('02/11/2026')).toBe(false);
  });
});

describe('freeSlots', () => {
  const monday = '2026-11-02';
  const sundayBefore = new Date('2026-11-01T12:00:00Z');
  const base = {
    day: monday,
    hours: { opensAt: 9 * 60, closesAt: 12 * 60 },
    durationMin: 60,
    busy: [],
    now: sundayBefore,
    timeZone: sp,
  };

  it('offers a time every 30 minutes while the whole service fits before closing', () => {
    expect(iso(freeSlots(base))).toEqual([
      '2026-11-02T12:00:00.000Z',
      '2026-11-02T12:30:00.000Z',
      '2026-11-02T13:00:00.000Z',
      '2026-11-02T13:30:00.000Z',
      '2026-11-02T14:00:00.000Z', // 11:00 local, ends exactly at closing
    ]);
  });

  it('offers nothing on a closed day', () => {
    expect(freeSlots({ ...base, hours: null })).toEqual([]);
  });

  it('skips every time that overlaps a booking, and keeps the ones that only touch it', () => {
    const busy = [
      { startsAt: new Date('2026-11-02T13:00:00Z'), endsAt: new Date('2026-11-02T13:45:00Z') },
    ];
    // Busy 10:00–10:45 local: 09:00 ends at 10:00 (touches, fine); 09:30, 10:00 and 10:30 overlap.
    expect(iso(freeSlots({ ...base, busy }))).toEqual([
      '2026-11-02T12:00:00.000Z',
      '2026-11-02T14:00:00.000Z',
    ]);
  });

  it('needs at least an hour of notice', () => {
    const now = new Date('2026-11-02T12:10:00Z'); // 09:10 local
    expect(iso(freeSlots({ ...base, now }))[0]).toBe('2026-11-02T13:30:00.000Z'); // 10:30
  });
});

describe('bookable days', () => {
  it('starts today in the business’s time zone and covers two weeks', () => {
    const days = bookableDays(new Date('2026-11-03T02:30:00Z'), sp);
    expect(days).toHaveLength(14);
    expect(days[0]).toBe('2026-11-02');
    expect(days.at(-1)).toBe('2026-11-15');
  });

  it('finds the opening hours of a calendar day', () => {
    const week = [{ weekday: 1, opensAt: 540, closesAt: 1080 }];
    expect(hoursOn('2026-11-02', week)).toEqual({ opensAt: 540, closesAt: 1080 });
    expect(hoursOn('2026-11-01', week)).toBeNull();
  });
});

describe('client details', () => {
  it.each([
    ['(11) 91234-5678', '11912345678'],
    ['+55 11 91234-5678', '11912345678'],
    ['11 3333-4444', '1133334444'],
  ])('accepts the phone %s', (typed, digits) => {
    expect(normalizePhone(typed)).toBe(digits);
  });

  it.each(['99128-2814', '0011912345678', '(34) 1234', 'abc'])('rejects the phone %s', (typed) => {
    expect(normalizePhone(typed)).toBeNull();
  });

  it('formats a phone for reading', () => {
    expect(formatPhone('11912345678')).toBe('(11) 91234-5678');
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('validates the whole booking with message keys', () => {
    const result = bookingSchema.safeParse({
      serviceId: 'svc',
      startsAt: 'tomorrow',
      name: 'A',
      phone: '123',
    });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((i) => `${i.path.join('.')}:${i.message}`);
    expect(messages).toEqual(['startsAt:slotInvalid', 'name:nameShort', 'phone:phoneInvalid']);

    const ok = bookingSchema.parse({
      serviceId: 'svc',
      startsAt: '2026-11-02T12:00:00.000Z',
      name: ' Bia ',
      phone: '(11) 91234-5678',
    });
    expect(ok).toMatchObject({ name: 'Bia', phone: '11912345678' });
  });
});
