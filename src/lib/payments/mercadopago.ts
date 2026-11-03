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
  /** Naora's share, kept by Mercado Pago's split. Only with a token from Naora's OAuth app. */
  applicationFeeCents?: number;
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
    ...(request.applicationFeeCents ? { application_fee: request.applicationFeeCents / 100 } : {}),
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

// OAuth: the business connects its own account to Naora's Mercado Pago application.
// Docs: https://www.mercadopago.com.br/developers/en/docs/oauth/creation

export type OAuthApp = { clientId: string; clientSecret: string; redirectUri: string };

/** Where the owner goes to authorize Naora. `state` ties the answer to this request. */
export function authorizeUrl(app: Pick<OAuthApp, 'clientId' | 'redirectUri'>, state: string) {
  const params = new URLSearchParams({
    client_id: app.clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: app.redirectUri,
  });
  return `https://auth.mercadopago.com/authorization?${params}`;
}

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  expiresAt: Date;
};

async function token(
  fetchImpl: Fetch,
  body: Record<string, string>,
  now: Date,
): Promise<OAuthTokens> {
  const response = await fetchImpl(`${api}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new MercadoPagoError(response.status, await response.text());
  const json = (await response.json()) as Record<string, unknown>;
  if (typeof json.access_token !== 'string' || typeof json.refresh_token !== 'string') {
    throw new MercadoPagoError(502, 'token answer without tokens');
  }
  const seconds = Number(json.expires_in) || 15_552_000; // 180 days
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    userId: String(json.user_id ?? ''),
    expiresAt: new Date(now.getTime() + seconds * 1000),
  };
}

/** Trades the one-time code (valid for 10 minutes) for the business's tokens. */
export function exchangeCode(
  app: OAuthApp,
  code: string,
  fetchImpl: Fetch = fetch,
  now = new Date(),
) {
  return token(
    fetchImpl,
    {
      client_id: app.clientId,
      client_secret: app.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: app.redirectUri,
    },
    now,
  );
}

/** Access tokens last 180 days; the refresh token gets a new one without asking the owner again. */
export function refreshTokens(
  app: Pick<OAuthApp, 'clientId' | 'clientSecret'>,
  refreshToken: string,
  fetchImpl: Fetch = fetch,
  now = new Date(),
) {
  return token(
    fetchImpl,
    {
      client_id: app.clientId,
      client_secret: app.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
    now,
  );
}

// Subscriptions (Pro), charged on Naora's own account.
// Docs: https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval/post

export type SubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled';

export type SubscriptionRequest = {
  accessToken: string;
  reason: string;
  amountCents: number;
  payerEmail: string;
  /** Our business id. */
  externalReference: string;
  /** Where Mercado Pago sends the owner back after the checkout. */
  backUrl: string;
};

/** A monthly subscription waiting for the owner to pay; init_point is the checkout page. */
export async function createSubscription(
  request: SubscriptionRequest,
  fetchImpl: Fetch = fetch,
): Promise<{ id: string; initPoint: string }> {
  const json = await call(fetchImpl, '/preapproval', request.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      reason: request.reason,
      external_reference: request.externalReference,
      payer_email: request.payerEmail,
      back_url: request.backUrl,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: request.amountCents / 100,
        currency_id: 'BRL',
      },
    }),
  });
  if (!json.id || typeof json.init_point !== 'string') {
    throw new MercadoPagoError(502, 'subscription created without a checkout link');
  }
  return { id: String(json.id), initPoint: json.init_point };
}

export async function getSubscription(
  accessToken: string,
  id: string,
  fetchImpl: Fetch = fetch,
): Promise<{ id: string; status: SubscriptionStatus; externalReference: string }> {
  const json = await call(fetchImpl, `/preapproval/${encodeURIComponent(id)}`, accessToken);
  return {
    id: String(json.id),
    status: String(json.status) as SubscriptionStatus,
    externalReference: String(json.external_reference ?? ''),
  };
}

export async function cancelSubscription(
  accessToken: string,
  id: string,
  fetchImpl: Fetch = fetch,
) {
  await call(fetchImpl, `/preapproval/${encodeURIComponent(id)}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled' }),
  });
}
