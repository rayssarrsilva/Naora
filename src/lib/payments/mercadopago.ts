/**
 * The few calls Naora makes to Mercado Pago's Payments API, with the business's own access token:
 * the money goes straight to the business's account. Network code takes `fetch` as a parameter so
 * the tests can check every request without reaching Mercado Pago.
 * Docs: https://www.mercadopago.com.br/developers/en/reference/payments/_payments/post
 */

const api = 'https://api.mercadopago.com';

export type ProviderStatus = 'pending' | 'approved' | 'failed';

/** Mercado Pago's many statuses, reduced to what a booking needs. */
export function mapStatus(status: string): ProviderStatus {
  if (status === 'approved') return 'approved';
  if (['pending', 'in_process', 'authorized', 'in_mediation'].includes(status)) return 'pending';
  return 'failed'; // rejected, cancelled, refunded, charged_back
}

export class MercadoPagoError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`Mercado Pago answered ${status}: ${detail.slice(0, 200)}`);
  }
}

type Fetch = typeof fetch;

async function call(fetchImpl: Fetch, path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetchImpl(`${api}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new MercadoPagoError(response.status, await response.text());
  return (await response.json()) as Record<string, unknown>;
}

export type PixRequest = {
  accessToken: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  /** Our booking id, to find the booking from Mercado Pago's side. */
  externalReference: string;
  /** Where Mercado Pago notifies changes; only sent when it is a public https address. */
  notificationUrl: string;
  /** Already written with the business's offset, e.g. 2026-11-02T09:30:00.000-03:00. */
  expiresAt: string;
  /** The same key never creates two charges, even if the request is retried. */
  idempotencyKey: string;
};

export type PixCharge = {
  providerPaymentId: string;
  status: ProviderStatus;
  pixCode: string;
  ticketUrl: string | null;
};

export async function createPixCharge(
  request: PixRequest,
  fetchImpl: Fetch = fetch,
): Promise<PixCharge> {
  const body = {
    transaction_amount: request.amountCents / 100,
    payment_method_id: 'pix',
    description: request.description,
    payer: { email: request.payerEmail },
    external_reference: request.externalReference,
    date_of_expiration: request.expiresAt,
    ...(request.notificationUrl.startsWith('https://')
      ? { notification_url: request.notificationUrl }
      : {}),
  };
  const json = await call(fetchImpl, '/v1/payments', request.accessToken, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': request.idempotencyKey },
    body: JSON.stringify(body),
  });
  const data = (json.point_of_interaction as { transaction_data?: Record<string, unknown> })
    ?.transaction_data;
  const pixCode = typeof data?.qr_code === 'string' ? data.qr_code : '';
  if (!json.id || !pixCode) throw new MercadoPagoError(502, 'payment created without a Pix code');
  return {
    providerPaymentId: String(json.id),
    status: mapStatus(String(json.status)),
    pixCode,
    ticketUrl: typeof data?.ticket_url === 'string' ? data.ticket_url : null,
  };
}

export type ProviderPayment = { id: string; status: ProviderStatus; externalReference: string };

/** The source of truth: notifications only say "look again", this says what happened. */
export async function getPayment(
  accessToken: string,
  paymentId: string,
  fetchImpl: Fetch = fetch,
): Promise<ProviderPayment> {
  const json = await call(fetchImpl, `/v1/payments/${encodeURIComponent(paymentId)}`, accessToken);
  return {
    id: String(json.id),
    status: mapStatus(String(json.status)),
    externalReference: String(json.external_reference ?? ''),
  };
}

/** Checks a token before saving it: Mercado Pago answers 401 for a wrong one. */
export async function tokenWorks(accessToken: string, fetchImpl: Fetch = fetch): Promise<boolean> {
  try {
    await call(fetchImpl, '/users/me', accessToken);
    return true;
  } catch (error) {
    if (error instanceof MercadoPagoError && (error.status === 401 || error.status === 403)) {
      return false;
    }
    throw error;
  }
}

/** Production tokens start with APP_USR-, sandbox ones with TEST-. */
export const tokenPattern = /^(APP_USR|TEST)-[\w-]{20,}$/;
