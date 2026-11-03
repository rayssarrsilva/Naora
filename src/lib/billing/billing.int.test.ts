import { POST as platformWebhook } from '@/app/api/webhooks/mercadopago/platform/route';
import { createBooking } from '@/lib/booking/repository';
import { addService, createBusiness, saveMercadoPagoConnection } from '@/lib/business/repository';
import { db } from '@/lib/db/client';
import { businessAccessToken, markPaid } from '@/lib/payments/service';
import { decryptSecret, encryptSecret } from '@/lib/security/secrets';
import { billingOverview, cancelPro, subscribePro, syncSubscription } from './service';

process.env.PAYMENTS_KEY = Buffer.alloc(32, 5).toString('base64');

const now = new Date('2026-11-01T15:00:00Z');
const monday9 = '2026-11-02T12:00:00.000Z';
const pixAnswer = {
  id: 555,
  status: 'pending',
  point_of_interaction: { transaction_data: { qr_code: '00020126REAL' } },
};

function answers(...bodies: [number, unknown][]) {
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

async function salon(
  slug: string,
  options: { demo?: boolean; connected?: boolean; tokenExpiresAt?: Date } = {},
) {
  const owner = await db().user.create({ data: { email: `${slug}@test.naora.app` } });
  const created = await createBusiness(owner.id, { name: slug, slug }, { demo: options.demo });
  if (!created.ok) throw new Error('no business');
  if (options.connected) {
    await saveMercadoPagoConnection(created.business.id, {
      userId: '777',
      accessToken: encryptSecret('APP_USR-owner'),
      refreshToken: encryptSecret('TG-owner-refresh'),
      expiresAt: options.tokenExpiresAt ?? new Date('2030-01-01T00:00:00Z'),
    });
  }
  const service = (await addService(owner.id, {
    name: 'Corte',
    durationMin: 60,
    price: 8000,
    deposit: 2400,
  }))!;
  return { owner, service, businessId: created.business.id };
}

const book = (slug: string, serviceId: string) =>
  createBooking(
    slug,
    { serviceId, startsAt: monday9, name: 'Bia', phone: '11912345678', email: 'bia@example.com' },
    now,
  );

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  delete process.env.MP_PLATFORM_ACCESS_TOKEN;
  delete process.env.MP_CLIENT_ID;
  delete process.env.MP_CLIENT_SECRET;
  await db().$executeRawUnsafe(
    'TRUNCATE "Payment", "Booking", "OpeningHours", "Service", "Membership", "Business", "User" CASCADE',
  );
});

afterAll(async () => {
  await db().$disconnect();
});

describe("Naora's share of the deposit", () => {
  it('charges 15% as the application fee on Free, and records it', async () => {
    const { service, businessId } = await salon('studio-free', { connected: true });
    const fetchSpy = answers([201, pixAnswer]);
    const booked = await book('studio-free', service.id);
    expect(booked.ok).toBe(true);
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body)).application_fee).toBe(3.6);
    const payment = (await db().payment.findFirst({ where: { businessId } }))!;
    expect(payment).toMatchObject({ amountCents: 2400, feeCents: 360 });
  });

  it('charges no fee on Pro', async () => {
    const { service, businessId } = await salon('studio-pro', { connected: true });
    await db().business.update({ where: { id: businessId }, data: { plan: 'PRO' } });
    const fetchSpy = answers([201, pixAnswer]);
    await book('studio-pro', service.id);
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body))).not.toHaveProperty(
      'application_fee',
    );
    expect((await db().payment.findFirst({ where: { businessId } }))!.feeCents).toBe(0);
  });

  it("adds up this month's paid deposits and fees for the dashboard", async () => {
    const { owner, service, businessId } = await salon('studio-demo', { demo: true });
    await book('studio-demo', service.id);
    const payment = (await db().payment.findFirst({ where: { businessId } }))!;
    await markPaid(payment.id, new Date());
    expect(await billingOverview(owner.id)).toMatchObject({
      plan: 'FREE',
      demo: true,
      paidDeposits: 1,
      depositsCents: 2400,
      feesCents: 360,
      canSubscribe: true,
    });
  });
});

describe("the business's token", () => {
  it('is refreshed when it is about to expire, and stored encrypted again', async () => {
    process.env.MP_CLIENT_ID = 'app';
    process.env.MP_CLIENT_SECRET = 'secret';
    const { businessId } = await salon('studio-old', {
      connected: true,
      tokenExpiresAt: new Date(Date.now() + 86_400_000),
    });
    answers([
      200,
      {
        access_token: 'APP_USR-fresh',
        refresh_token: 'TG-fresh',
        user_id: 777,
        expires_in: 15552000,
      },
    ]);
    expect(await businessAccessToken(businessId)).toBe('APP_USR-fresh');
    const row = (await db().business.findUnique({ where: { id: businessId } }))!;
    expect(row.mpAccessToken).not.toContain('APP_USR');
    expect(decryptSecret(row.mpRefreshToken!)).toBe('TG-fresh');
    expect(row.mpTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 100 * 86_400_000);
  });
});

describe('Pro subscription', () => {
  it('switches a demo business at once, with no charge, and back', async () => {
    const { owner, businessId } = await salon('studio-demo', { demo: true });
    const fetchSpy = jest.spyOn(global, 'fetch');
    expect(await subscribePro(owner.id, 'ana@example.com', 'pt')).toEqual({
      ok: true,
      checkoutUrl: null,
    });
    expect((await db().business.findUnique({ where: { id: businessId } }))!.plan).toBe('PRO');
    expect(await cancelPro(owner.id)).toBe(true);
    expect((await db().business.findUnique({ where: { id: businessId } }))!.plan).toBe('FREE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is off when the server has no platform token', async () => {
    const { owner } = await salon('studio-real');
    expect(await subscribePro(owner.id, 'ana@example.com', 'pt')).toEqual({
      ok: false,
      error: 'paymentsOff',
    });
  });

  it('turns Pro on only when Mercado Pago says the subscription is authorized', async () => {
    process.env.MP_PLATFORM_ACCESS_TOKEN = 'APP_USR-naora';
    const { owner, businessId } = await salon('studio-real');
    answers([
      201,
      { id: 'sub-1', init_point: 'https://mercadopago.com.br/subscriptions/checkout?id=sub-1' },
    ]);
    expect(await subscribePro(owner.id, 'ana@example.com', 'pt')).toEqual({
      ok: true,
      checkoutUrl: 'https://mercadopago.com.br/subscriptions/checkout?id=sub-1',
    });
    expect((await db().business.findUnique({ where: { id: businessId } }))!.plan).toBe('FREE');

    answers([200, { id: 'sub-1', status: 'authorized', external_reference: businessId }]);
    const response = await platformWebhook(
      new Request(
        'https://naora.app/api/webhooks/mercadopago/platform?type=subscription_preapproval&data.id=sub-1',
        {
          method: 'POST',
        },
      ),
    );
    expect(await response.json()).toEqual({ received: true, outcome: 'pro' });
    expect((await db().business.findUnique({ where: { id: businessId } }))!.plan).toBe('PRO');

    // Cancelled on Mercado Pago's side: back to Free.
    answers([200, { id: 'sub-1', status: 'cancelled', external_reference: businessId }]);
    expect(await syncSubscription('sub-1')).toBe('free');
    expect((await db().business.findUnique({ where: { id: businessId } }))!).toMatchObject({
      plan: 'FREE',
      proSubscriptionId: null,
    });
  });

  it('ignores a subscription that Naora did not create for that business', async () => {
    process.env.MP_PLATFORM_ACCESS_TOKEN = 'APP_USR-naora';
    const { businessId } = await salon('studio-real');
    answers([200, { id: 'someone-elses', status: 'authorized', external_reference: businessId }]);
    expect(await syncSubscription('someone-elses')).toBe('ignored');
    expect((await db().business.findUnique({ where: { id: businessId } }))!.plan).toBe('FREE');
  });

  it('cancels on Mercado Pago before going back to Free', async () => {
    process.env.MP_PLATFORM_ACCESS_TOKEN = 'APP_USR-naora';
    const { owner, businessId } = await salon('studio-real');
    await db().business.update({
      where: { id: businessId },
      data: { plan: 'PRO', proSubscriptionId: 'sub-9' },
    });
    const fetchSpy = answers([200, { id: 'sub-9', status: 'cancelled' }]);
    expect(await cancelPro(owner.id)).toBe(true);
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://api.mercadopago.com/preapproval/sub-9');
    expect((await db().business.findUnique({ where: { id: businessId } }))!.plan).toBe('FREE');
  });
});
