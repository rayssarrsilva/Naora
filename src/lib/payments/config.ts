import 'server-only';
import { siteUrl } from '@/lib/site';
import type { OAuthApp } from './mercadopago';

/** HttpOnly cookie that ties the OAuth answer to the browser that started it. */
export const oauthCookie = 'naora_mp_oauth';

/** Naora's Mercado Pago application (OAuth), or null when this server has none configured. */
export function oauthApp(): OAuthApp | null {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: `${siteUrl()}/api/mercadopago/callback` };
}

/** Naora's own production token: it charges the Pro subscriptions. */
export const platformToken = () => process.env.MP_PLATFORM_ACCESS_TOKEN || null;

/** Signs the OAuth state. Same secret as the sessions; the dev fallback matches src/auth.ts. */
export function stateSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'naora-dev-secret-do-not-use-in-production');
  if (!secret) throw new Error('AUTH_SECRET is required');
  return secret;
}
