/**
 * @jest-environment node
 */
import { isoWithOffset } from '@/lib/booking/time';
import { decryptSecret, encryptSecret } from '@/lib/security/secrets';
import { breakEven, feeFor } from '@/lib/billing/pricing';
import {
  authorizeUrl,
  cancelSubscription,
  createPixCharge,
  createSubscription,
  exchangeCode,
  getPayment,
  getSubscription,
  mapStatus,
  MercadoPagoError,
  refreshTokens,
} from './mercadopago';
import { readState, signState } from './oauth-state';

const key = Buffer.alloc(32, 7).toString('base64');

function fakeFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('secrets', () => {
  const before = process.env.PAYMENTS_KEY;
  beforeEach(() => {
    process.env.PAYMENTS_KEY = key;
  });
  afterAll(() => {
    process.env.PAYMENTS_KEY = before;
  });

  it('encrypts with a new nonce every time and decrypts back', () => {
    const a = encryptSecret('APP_USR-123');
    const b = encryptSecret('APP_USR-123');
    expect(a).not.toBe(b);
    expect(a).not.toContain('APP_USR');
    expect(decryptSecret(a)).toBe('APP_USR-123');
  });

  it('refuses a stored value that was changed', () => {
    const [v, iv, tag, data] = encryptSecret('APP_USR-123').split(':');
    const flipped = Buffer.from(data!, 'base64');
    flipped[0]! ^= 1;
    expect(() => decryptSecret([v, iv, tag, flipped.toString('base64')].join(':'))).toThrow();
  });

  it('needs a 32-byte key', () => {
    process.env.PAYMENTS_KEY = 'short';
    expect(() => encryptSecret('x')).toThrow(/PAYMENTS_KEY/);
  });
});

describe('Mercado Pago client', () => {
  const request = {
    accessToken: 'APP_USR-token',
    amountCents: 1050,
    description: 'Escova · Studio Ana',
    payerEmail: 'bia@example.com',
    externalReference: 'booking-1',
    notificationUrl: 'https://naora.app/api/webhooks/mercadopago/biz-1',
    expiresAt: '2026-11-02T09:30:00.000-03:00',
    idempotencyKey: 'booking-1',
  };

  it('creates a Pix charge with the business token, an idempotency key and the expiry', async () => {
    const fetchImpl = fakeFetch(201, {
      id: 123456,
      status: 'pending',
      point_of_interaction: {
        transaction_data: { qr_code: '00020126PIX', ticket_url: 'https://mpago.la/x' },
      },
    });
    const charge = await createPixCharge(request, fetchImpl);
    expect(charge).toEqual({
      providerPaymentId: '123456',
      status: 'pending',
      pixCode: '00020126PIX',
      ticketUrl: 'https://mpago.la/x',
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/payments');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer APP_USR-token',
      'X-Idempotency-Key': 'booking-1',
    });
    expect(JSON.parse(init.body)).toEqual({
      transaction_amount: 10.5,
      payment_method_id: 'pix',
      description: 'Escova · Studio Ana',
      payer: { email: 'bia@example.com' },
      external_reference: 'booking-1',
      date_of_expiration: '2026-11-02T09:30:00.000-03:00',
      notification_url: 'https://naora.app/api/webhooks/mercadopago/biz-1',
    });
  });

  it('leaves out the notification address when it is not public https (local development)', async () => {
    const fetchImpl = fakeFetch(201, {
      id: 1,
      status: 'pending',
      point_of_interaction: { transaction_data: { qr_code: 'PIX' } },
    });
    await createPixCharge({ ...request, notificationUrl: 'http://localhost:3000/x' }, fetchImpl);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty('notification_url');
  });

  it('fails clearly on an error answer or a charge without a Pix code', async () => {
    await expect(createPixCharge(request, fakeFetch(400, { message: 'bad' }))).rejects.toThrow(
      MercadoPagoError,
    );
    await expect(
      createPixCharge(request, fakeFetch(201, { id: 1, status: 'pending' })),
    ).rejects.toThrow(/without a Pix code/);
  });

  it('reads a payment and reduces its status', async () => {
    const fetchImpl = fakeFetch(200, {
      id: 9,
      status: 'approved',
      external_reference: 'booking-1',
    });
    expect(await getPayment('APP_USR-token', '9', fetchImpl)).toEqual({
      id: '9',
      status: 'approved',
      externalReference: 'booking-1',
    });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.mercadopago.com/v1/payments/9');
  });

  it.each([
    ['approved', 'approved'],
    ['pending', 'pending'],
    ['in_process', 'pending'],
    ['rejected', 'failed'],
    ['cancelled', 'failed'],
    ['refunded', 'failed'],
  ])('maps %s to %s', (from, to) => {
    expect(mapStatus(from)).toBe(to);
  });

  it("sends Naora's share as the application fee, in reais, only when there is one", async () => {
    const answer = {
      id: 1,
      status: 'pending',
      point_of_interaction: { transaction_data: { qr_code: 'PIX' } },
    };
    const withFee = fakeFetch(201, answer);
    await createPixCharge({ ...request, applicationFeeCents: 158 }, withFee);
    expect(JSON.parse(withFee.mock.calls[0][1].body).application_fee).toBe(1.58);
    const noFee = fakeFetch(201, answer);
    await createPixCharge({ ...request, applicationFeeCents: 0 }, noFee);
    expect(JSON.parse(noFee.mock.calls[0][1].body)).not.toHaveProperty('application_fee');
  });
});

describe('isoWithOffset', () => {
  it('writes the instant in the business’s local time with its offset', () => {
    expect(isoWithOffset(new Date('2026-11-02T12:30:00.000Z'), 'America/Sao_Paulo')).toBe(
      '2026-11-02T09:30:00.000-03:00',
    );
    expect(isoWithOffset(new Date('2026-07-01T12:00:00.000Z'), 'Europe/Lisbon')).toBe(
      '2026-07-01T13:00:00.000+01:00',
    );
  });
});

describe('pricing', () => {
  it('keeps 15% of the deposit on Free and nothing on Pro', () => {
    expect(feeFor(2400, 'FREE')).toBe(360);
    expect(feeFor(1050, 'FREE')).toBe(158); // 157.5 rounds to the nearest cent
    expect(feeFor(2400, 'PRO')).toBe(0);
    expect(feeFor(0, 'FREE')).toBe(0);
  });

  it('tells after how many deposits Pro is cheaper', () => {
    expect(breakEven(2400)).toBe(12); // R$ 39,90 / R$ 3,60
    expect(breakEven(0)).toBeNull();
  });
});

describe('Mercado Pago OAuth', () => {
  const app = {
    clientId: '123',
    clientSecret: 'shh',
    redirectUri: 'https://naora.app/api/mercadopago/callback',
  };

  it('sends the owner to Mercado Pago with the state and the exact redirect address', () => {
    const url = new URL(authorizeUrl(app, 'the-state'));
    expect(url.origin + url.pathname).toBe('https://auth.mercadopago.com/authorization');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: '123',
      response_type: 'code',
      platform_id: 'mp',
      state: 'the-state',
      redirect_uri: 'https://naora.app/api/mercadopago/callback',
    });
  });

  it('trades the code for tokens and works out when they expire', async () => {
    const now = new Date('2026-11-03T12:00:00Z');
    const fetchImpl = fakeFetch(200, {
      access_token: 'APP_USR-seller',
      refresh_token: 'TG-refresh',
      user_id: 98765,
      expires_in: 15552000,
    });
    expect(await exchangeCode(app, 'TG-code', fetchImpl, now)).toEqual({
      accessToken: 'APP_USR-seller',
      refreshToken: 'TG-refresh',
      userId: '98765',
      expiresAt: new Date('2027-05-02T12:00:00Z'),
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/oauth/token');
    expect(JSON.parse(init.body)).toEqual({
      client_id: '123',
      client_secret: 'shh',
      grant_type: 'authorization_code',
      code: 'TG-code',
      redirect_uri: 'https://naora.app/api/mercadopago/callback',
    });
  });

  it('refreshes with the refresh token', async () => {
    const fetchImpl = fakeFetch(200, {
      access_token: 'APP_USR-new',
      refresh_token: 'TG-new',
      user_id: 1,
    });
    await refreshTokens(app, 'TG-old', fetchImpl);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      client_id: '123',
      client_secret: 'shh',
      grant_type: 'refresh_token',
      refresh_token: 'TG-old',
    });
  });

  it('accepts only its own, fresh state, in the browser that started it', () => {
    const now = Date.parse('2026-11-03T12:00:00Z');
    const state = signState(
      { businessId: 'biz', nonce: 'n1', locale: 'pt', exp: now + 600_000 },
      'secret',
    );
    expect(readState(state, 'n1', 'secret', now)).toMatchObject({
      businessId: 'biz',
      locale: 'pt',
    });
    expect(readState(state, 'other-cookie', 'secret', now)).toBeNull();
    expect(readState(state, undefined, 'secret', now)).toBeNull();
    expect(readState(state, 'n1', 'another-secret', now)).toBeNull();
    expect(readState(state, 'n1', 'secret', now + 600_001)).toBeNull();
    const [payload, sig] = state.split('.');
    const forged = Buffer.from(
      JSON.stringify({ businessId: 'victim', nonce: 'n1', locale: 'pt', exp: now + 600_000 }),
    ).toString('base64url');
    expect(readState(`${forged}.${sig}`, 'n1', 'secret', now)).toBeNull();
    expect(payload).toBeTruthy();
  });
});

describe('Pro subscription', () => {
  it("creates a monthly subscription on Naora's account and returns its checkout link", async () => {
    const fetchImpl = fakeFetch(201, {
      id: 'sub-1',
      init_point: 'https://mercadopago.com.br/subscriptions/checkout?x=1',
      status: 'pending',
    });
    expect(
      await createSubscription(
        {
          accessToken: 'APP_USR-naora',
          reason: 'Naora Pro',
          amountCents: 3990,
          payerEmail: 'ana@example.com',
          externalReference: 'biz',
          backUrl: 'https://naora.app/pt/painel?pro=1',
        },
        fetchImpl,
      ),
    ).toEqual({ id: 'sub-1', initPoint: 'https://mercadopago.com.br/subscriptions/checkout?x=1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/preapproval');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer APP_USR-naora' });
    expect(JSON.parse(init.body)).toEqual({
      reason: 'Naora Pro',
      external_reference: 'biz',
      payer_email: 'ana@example.com',
      back_url: 'https://naora.app/pt/painel?pro=1',
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 39.9,
        currency_id: 'BRL',
      },
    });
  });

  it('reads and cancels a subscription', async () => {
    const read = fakeFetch(200, { id: 'sub-1', status: 'authorized', external_reference: 'biz' });
    expect(await getSubscription('APP_USR-naora', 'sub-1', read)).toEqual({
      id: 'sub-1',
      status: 'authorized',
      externalReference: 'biz',
    });
    const cancel = fakeFetch(200, { id: 'sub-1', status: 'cancelled' });
    await cancelSubscription('APP_USR-naora', 'sub-1', cancel);
    expect(cancel.mock.calls[0][0]).toBe('https://api.mercadopago.com/preapproval/sub-1');
    expect(cancel.mock.calls[0][1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    });
  });
});
