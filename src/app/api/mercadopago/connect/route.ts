import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { siteUrl } from '@/lib/site';
import { routing } from '@/i18n/routing';
import { businessForUser } from '@/lib/business/repository';
import { oauthApp, oauthCookie, stateSecret } from '@/lib/payments/config';
import { authorizeUrl } from '@/lib/payments/mercadopago';
import { newNonce, signState } from '@/lib/payments/oauth-state';

/**
 * Starts "Connect with Mercado Pago": sends the signed-in owner to Mercado Pago to authorize
 * Naora's application on their own account. A one-time nonce goes both into the signed state and
 * into an HttpOnly cookie, so the answer is only accepted in the same browser, for the same business.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = (routing.locales as readonly string[]).includes(
    url.searchParams.get('locale') ?? '',
  )
    ? url.searchParams.get('locale')!
    : routing.defaultLocale;
  const panel = new URL(`/${locale}/painel`, siteUrl());

  const session = await auth();
  if (!session?.user?.id) return Response.redirect(new URL(`/${locale}/entrar`, siteUrl()), 303);
  const business = await businessForUser(session.user.id);
  const app = oauthApp();
  if (!business || !app || session.user.isDemo) {
    panel.searchParams.set('mp', 'unavailable');
    return Response.redirect(panel, 303);
  }

  const nonce = newNonce();
  const state = signState(
    { businessId: business.id, nonce, locale, exp: Date.now() + 10 * 60 * 1000 },
    stateSecret(),
  );
  (await cookies()).set(oauthCookie, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: siteUrl().startsWith('https://'),
    path: '/api/mercadopago',
    maxAge: 600,
  });
  return Response.redirect(authorizeUrl(app, state), 303);
}
