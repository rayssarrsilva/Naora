import { db } from '@/lib/db/client';
import {
  addService,
  createBusiness,
  deleteService,
  setServiceActive,
} from '@/lib/business/repository';
import {
  availability,
  bookingContext,
  bookingSummary,
  cancelBooking,
  createBooking,
  upcomingBookings,
} from './repository';

// Sunday noon in São Paulo. Monday 2 November is open 09:00–18:00 (the default week).
const now = new Date('2026-11-01T15:00:00Z');
const monday9 = '2026-11-02T12:00:00.000Z';
const monday930 = '2026-11-02T12:30:00.000Z';
const client = { name: 'Bia', phone: '11912345678' };

async function newUser(name: string) {
  return db().user.create({
    data: { email: `${name}-${crypto.randomUUID()}@test.naora.app`, name },
  });
}

/** An owner with a business and a 60-minute service. */
async function salon(slug: string) {
  const owner = await newUser(slug);
  await createBusiness(owner.id, { name: slug, slug });
  const service = (await addService(owner.id, {
    name: 'Escova',
    durationMin: 60,
    price: 4500,
    deposit: 1000,
  }))!;
  return { owner, service };
}

const book = (slug: string, serviceId: string, startsAt: string) =>
  createBooking(slug, { serviceId, startsAt, ...client }, now);

beforeEach(async () => {
  await db().$executeRawUnsafe(
    'TRUNCATE "Booking", "OpeningHours", "Service", "Membership", "Account", "Business", "User" CASCADE',
  );
});

afterAll(async () => {
  await db().$disconnect();
});

describe('createBooking', () => {
  it('books a free time and keeps a copy of the service', async () => {
    const { owner, service } = await salon('studio-ana');
    const result = await book('studio-ana', service.id, monday9);
    expect(result.ok).toBe(true);

    const summary = await bookingSummary('studio-ana', result.ok ? result.bookingId : '');
    expect(summary).toMatchObject({ serviceName: 'Escova', depositCents: 1000, clientName: 'Bia' });

    // Editing the catalog later does not change what the client booked.
    await deleteService(owner.id, service.id);
    expect(await bookingSummary('studio-ana', summary!.id)).toMatchObject({
      serviceName: 'Escova',
    });
  });

  it('never books the same time twice, nor a time that overlaps another booking', async () => {
    const { service } = await salon('studio-ana');
    expect((await book('studio-ana', service.id, monday9)).ok).toBe(true);
    expect(await book('studio-ana', service.id, monday9)).toEqual({
      ok: false,
      error: 'slotTaken',
    });
    // 60 minutes from 09:00 runs until 10:00, so 09:30 overlaps.
    expect(await book('studio-ana', service.id, monday930)).toEqual({
      ok: false,
      error: 'slotTaken',
    });
  });

  it('lets exactly one of many simultaneous requests for the same time win', async () => {
    const { service } = await salon('studio-ana');
    const results = await Promise.all(
      Array.from({ length: 8 }, () => book('studio-ana', service.id, monday9)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db().booking.count()).toBe(1);
  });

  it('refuses times outside the opening hours, off the grid, too soon or too far ahead', async () => {
    const { service } = await salon('studio-ana');
    const refused = { ok: false, error: 'slotTaken' };
    expect(await book('studio-ana', service.id, '2026-11-02T21:00:00.000Z')).toEqual(refused); // 18:00
    expect(await book('studio-ana', service.id, '2026-11-02T12:10:00.000Z')).toEqual(refused); // 09:10
    expect(await book('studio-ana', service.id, '2026-11-01T15:30:00.000Z')).toEqual(refused); // Sunday
    expect(await book('studio-ana', service.id, '2026-12-01T12:00:00.000Z')).toEqual(refused); // a month on
  });

  it('cannot book a paused service, or a service through another business’s address', async () => {
    const ana = await salon('studio-ana');
    const bia = await salon('studio-bia');
    expect(await book('studio-bia', ana.service.id, monday9)).toEqual({
      ok: false,
      error: 'notFound',
    });
    await setServiceActive(ana.owner.id, ana.service.id, false);
    expect(await book('studio-ana', ana.service.id, monday9)).toEqual({
      ok: false,
      error: 'notFound',
    });
    expect(await bookingContext('studio-bia', bia.service.id)).not.toBeNull();
  });
});

describe('availability', () => {
  it('lists two weeks and hides the time a booking took', async () => {
    const { service } = await salon('studio-ana');
    const context = (await bookingContext('studio-ana', service.id))!;
    const before = await availability(context, now);
    expect(before).toHaveLength(14);
    expect(before[0]).toMatchObject({ day: '2026-11-01', slots: [] }); // Sunday: closed

    await book('studio-ana', service.id, monday9);
    const monday = (await availability(context, now)).find((d) => d.day === '2026-11-02')!;
    const times = monday.slots.map((s) => s.toISOString());
    expect(times).not.toContain(monday9);
    expect(times).not.toContain(monday930);
    expect(times[0]).toBe('2026-11-02T13:00:00.000Z'); // 10:00
  });
});

describe('the owner’s bookings', () => {
  it('lists only the owner’s own bookings, and cancelling frees the time', async () => {
    const ana = await salon('studio-ana');
    const bia = await salon('studio-bia');
    const anaBooking = await book('studio-ana', ana.service.id, monday9);
    await book('studio-bia', bia.service.id, monday9);
    const id = anaBooking.ok ? anaBooking.bookingId : '';

    expect((await upcomingBookings(ana.owner.id, now)).map((b) => b.id)).toEqual([id]);

    // Bia cannot cancel Ana's booking; the answer is the same as for a booking that does not exist.
    expect(await cancelBooking(bia.owner.id, id)).toBe(false);
    expect(await cancelBooking(bia.owner.id, 'does-not-exist')).toBe(false);

    expect(await cancelBooking(ana.owner.id, id)).toBe(true);
    expect(await cancelBooking(ana.owner.id, id)).toBe(false); // already cancelled
    expect(await upcomingBookings(ana.owner.id, now)).toEqual([]);
    expect((await book('studio-ana', ana.service.id, monday9)).ok).toBe(true);
  });
});
