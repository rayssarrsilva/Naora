import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * The OAuth `state`: which business started the connection, a one-time nonce that must match the
 * cookie set in the same browser, and an expiry. Signed with AUTH_SECRET, so it cannot be forged
 * to attach someone's Mercado Pago account to another business.
 */

export type OAuthState = { businessId: string; nonce: string; locale: string; exp: number };

const encode = (value: string) => Buffer.from(value).toString('base64url');

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export const newNonce = () => randomBytes(16).toString('base64url');

export function signState(state: OAuthState, secret: string): string {
  const payload = encode(JSON.stringify(state));
  return `${payload}.${signature(payload, secret)}`;
}

/** The state if the signature is right, it has not expired and the nonce matches the cookie. */
export function readState(
  value: string,
  nonceFromCookie: string | undefined,
  secret: string,
  now = Date.now(),
): OAuthState | null {
  const [payload, sig] = value.split('.');
  if (!payload || !sig || !nonceFromCookie) return null;
  const expected = Buffer.from(signature(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, 'base64url').toString()) as OAuthState;
    if (state.exp < now || state.nonce !== nonceFromCookie) return null;
    return state;
  } catch {
    return null;
  }
}
