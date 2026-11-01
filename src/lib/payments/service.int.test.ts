import { POST as webhook } from '@/app/api/webhooks/mercadopago/[businessId]/route';
import {
  availability,
  bookingContext,
  bookingSummary,
  createBooking,
} from '@/lib/booking/repository';
import { addService, createBusiness, saveMercadoPagoToken } from '@/lib/business/repository';
import { db } from '@/lib/db/client';
import { encryptSecret } from '@/lib/security/secrets';
import { markPaid, simulateDemoPayment, syncMercadoPagoPayment } from './service';

// Sunday noon in São Paulo; Monday 2 November 09:00 is a free time.
const now = new Date('2026-11-01T15:00:00Z');
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
const monday9 = '2026-11-02T12:00:00.000Z';
const client = { name: 'Bia', phone: '11912345678', email: 'bia@example.com' };

process.env.PAYMENTS_KEY = Buffer.alloc(32, 3).toString('base64');

async function salon(slug: string, options: { demo?: boolean; mercadoPago?: boolean } = {}) {
  const owner = await db().user.create({
    data: { email: `${slug}-${crypto.randomUUID()}@test.naora.app` },
  });
  await createBusiness(owner.id, { name: slug, slug }, { demo: options.demo });
  if (options.mercadoPago)
    await saveMercadoPagoToken(owner.id, encryptSecret('APP_USR-owner-token'));
  const service = (await addService(owner.id, {
    name: 'Escova',
    durationMin: 60,
    price: 4500,
    deposit: 1000,
  }))!;
  const business = (await db().business.findUnique({ where: { slug } }))!;
  return { owner, service, business };
}

const book = (slug: string, serviceId: string, at = now, extra: Partial<typeof client> = {}) =>
  createBooking(slug, { serviceId, startsAt: monday9, ...client, ...extra }, at);

const idOf = (result: Awaited<ReturnType<typeof book>>) => (result.ok ? result.bookingId : '');

function mercadoPagoAnswers(...bodies: [number, unknown][]) {
  const spy = jest.spyOn(global, 'fetch');
  for (const [status, body] of bodies) {
    spy.mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }
  return spy;
}

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await db().$executeRawUnsafe(
    'TRUNCATE "Payment", "Booking", "OpeningHours", "Service", "Membership", "Business", "User" CASCADE',
  );
});

afterAll(async () => {
  await db().$disconnect();
});

describe('demo deposit', () => {
  it('holds the time, shows a fake Pix, and confirms with the simulate button', async () => {
    const { service } = await salon('studio-demo', { demo: true });
    const result = await book('studio-demo', service.id);
    const id = idOf(result);

    const pending = await bookingSummary('studio-demo', id, now);
    expect(pending).toMatchObject({ state: 'awaitingPayment', payment: { provider: 'demo' } });
    expect(pending!.payment!.pixCode).toContain('NAO-E-UM-PIX-DE-VERDADE');

    // Held: nobody else can take it while the client pays.
    expect(await book('studio-demo', service.id)).toEqual({ ok: false, error: 'slotTaken' });

    expect(await simulateDemoPayment('studio-demo', id)).toBe(true);
    expect(await bookingSummary('studio-demo', id, now)).toMatchObject({ state: 'confirmed' });
    expect(await simulateDemoPayment('studio-demo', id)).toBe(false); // only once
  });

  it('asks for the email that Mercado Pago needs', async () => {
    const { service } = await salon('studio-demo', { demo: true });
    expect(await book('studio-demo', service.id, now, { email: undefined })).toEqual({
      ok: false,
      error: 'emailRequired',
    });
  });

  it('releases the time when the hold ends unpaid', async () => {
    const { service } = await salon('studio-demo', { demo: true });
    const id = idOf(await book('studio-demo', service.id));
    const context = (await bookingContext('studio-demo', service.id))!;
    const mondayAt = async (at: Date) =>
      (await availability(context, at))
        .find((d) => d.day === '2026-11-02')!
        .slots.map((s) => s.toISOString());

    expect(await mondayAt(later(29))).not.toContain(monday9);
    expect(await mondayAt(later(31))).toContain(monday9);
    expect(await bookingSummary('studio-demo', id, later(31))).toMatchObject({ state: 'expired' });
    expect((await book('studio-demo', service.id, later(31))).ok).toBe(true);
  });

  it('records a late payment but never double-books the time', async () => {
    const { service } = await salon('studio-demo', { demo: true });
    const first = idOf(await book('studio-demo', service.id));
    // The hold ends, someone else books the same time.
    expect((await book('studio-demo', service.id, later(31))).ok).toBe(true);
    const payment = (await db().payment.findUnique({ where: { bookingId: first } }))!;
    expect(await markPaid(payment.id, later(32))).toBe('conflict');
    expect(await db().booking.count({ where: { status: 'CONFIRMED' } })).toBe(0);
    expect((await db().payment.findUnique({ where: { id: payment.id } }))!.status).toBe('APPROVED');
  });
});

describe('Mercado Pago deposit', () => {
  const created = {
    id: 987654321,
    status: 'pending',
    point_of_interaction: {
      transaction_data: { qr_code: '00020126REAL', ticket_url: 'https://mpago.la/1' },
    },
  };

  it('charges with the business token and confirms only when Mercado Pago says approved', async () => {
    const { service, business } = await salon('studio-mp', { mercadoPago: true });
    const fetchSpy = mercadoPagoAnswers([201, created]);
    const id = idOf(await book('studio-mp', service.id));
    expect(fetchSpy.mock.calls[0]![1]!.headers).toMatchObject({
      Authorization: 'Bearer APP_USR-owner-token',
      'X-Idempotency-Key': id,
    });
    expect(await bookingSummary('studio-mp', id, now)).toMatchObject({
      state: 'awaitingPayment',
      payment: { provider: 'mercadopago', pixCode: '00020126REAL' },
    });

    // Still pending on Mercado Pago's side: nothing changes.
    mercadoPagoAnswers([200, { id: 987654321, status: 'pending', external_reference: id }]);
    expect(await syncMercadoPagoPayment(business.id, '987654321')).toBe('pending');

    // The webhook only says "look again"; the approval comes from reading the payment.
    mercadoPagoAnswers([200, { id: 987654321, status: 'approved', external_reference: id }]);
    const response = await webhook(
      new Request(
        `https://naora.app/api/webhooks/mercadopago/${business.id}?data.id=987654321&type=payment`,
        { method: 'POST', body: JSON.stringify({ type: 'payment', data: { id: '987654321' } }) },
      ),
      { params: Promise.resolve({ businessId: business.id }) },
    );
    expect(await response.json()).toEqual({ received: true, outcome: 'confirmed' });
    expect(await bookingSummary('studio-mp', id, now)).toMatchObject({ state: 'confirmed' });
  });

  it('ignores a notification sent to another business’s address', async () => {
    const mp = await salon('studio-mp', { mercadoPago: true });
    const other = await salon('studio-other', { mercadoPago: true });
    mercadoPagoAnswers([201, created]);
    await book('studio-mp', mp.service.id);
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy.mockClear();
    expect(await syncMercadoPagoPayment(other.business.id, '987654321')).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('releases the time at once when the Pix is rejected', async () => {
    const { service, business } = await salon('studio-mp', { mercadoPago: true });
    mercadoPagoAnswers([201, created]);
    const id = idOf(await book('studio-mp', service.id));
    mercadoPagoAnswers([200, { id: 987654321, status: 'cancelled', external_reference: id }]);
    expect(await syncMercadoPagoPayment(business.id, '987654321')).toBe('failed');
    expect(await bookingSummary('studio-mp', id, now)).toMatchObject({ state: 'cancelled' });
  });

  it('does not hold the time when Mercado Pago is down', async () => {
    const { service } = await salon('studio-mp', { mercadoPago: true });
    mercadoPagoAnswers([503, { message: 'unavailable' }]);
    expect(await book('studio-mp', service.id)).toEqual({ ok: false, error: 'paymentUnavailable' });
    mercadoPagoAnswers([201, created]);
    expect((await book('studio-mp', service.id)).ok).toBe(true);
  });

  it('refuses the simulate button on a real business', async () => {
    const { service } = await salon('studio-mp', { mercadoPago: true });
    mercadoPagoAnswers([201, created]);
    const id = idOf(await book('studio-mp', service.id));
    expect(await simulateDemoPayment('studio-mp', id)).toBe(false);
  });

  it('ignores webhook calls that are not about a payment', async () => {
    const { business } = await salon('studio-mp', { mercadoPago: true });
    const response = await webhook(
      new Request(`https://naora.app/api/webhooks/mercadopago/${business.id}?type=plan&data.id=x`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ businessId: business.id }) },
    );
    expect(await response.json()).toEqual({ received: true, ignored: true });
  });
});

describe('without a payment account', () => {
  it('books services with a deposit as confirmed, and the deposit is arranged in person', async () => {
    const { service } = await salon('studio-plain');
    const id = idOf(await book('studio-plain', service.id, now, { email: undefined }));
    expect(await bookingSummary('studio-plain', id, now)).toMatchObject({
      state: 'confirmed',
      payment: null,
    });
  });
});
