/**
 * @jest-environment node
 */
import { isoWithOffset } from '@/lib/booking/time';
import { decryptSecret, encryptSecret } from '@/lib/security/secrets';
import {
  createPixCharge,
  getPayment,
  mapStatus,
  MercadoPagoError,
  tokenWorks,
} from './mercadopago';

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

  it('tells a rejected token from a Mercado Pago outage', async () => {
    expect(await tokenWorks('APP_USR-x', fakeFetch(200, { id: 1 }))).toBe(true);
    expect(await tokenWorks('APP_USR-x', fakeFetch(401, {}))).toBe(false);
    await expect(tokenWorks('APP_USR-x', fakeFetch(503, {}))).rejects.toThrow(MercadoPagoError);
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
