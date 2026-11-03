import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { siteUrl } from '@/lib/site';
import { businessForUser, saveMercadoPagoConnection } from '@/lib/business/repository';
import { oauthApp, oauthCookie, stateSecret } from '@/lib/payments/config';
import { exchangeCode } from '@/lib/payments/mercadopago';
import { readState } from '@/lib/payments/oauth-state';
import { encryptSecret } from '@/lib/security/secrets';

/**
 * Mercado Pago sends the owner back here with a one-time code. It is accepted only when the state
 * is Naora's, has not expired, matches this browser's cookie and the signed-in owner's business.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const nonce = jar.get(oauthCookie)?.value;
  jar.delete({ name: oauthCookie, path: '/api/mercadopago' });

  const state = readState(url.searchParams.get('state') ?? '', nonce, stateSecret());
  const panel = new URL(`/${state?.locale ?? 'pt'}/painel`, siteUrl());
  const fail = (reason: string) => {
    panel.searchParams.set('mp', reason);
    return Response.redirect(panel, 303);
  };

  const code = url.searchParams.get('code');
  if (!state || !code) return fail('error');
  const session = await auth();
  const business = session?.user?.id ? await businessForUser(session.user.id) : null;
  const app = oauthApp();
  if (!business || business.id !== state.businessId || !app) return fail('error');

  try {
    const tokens = await exchangeCode(app, code);
    await saveMercadoPagoConnection(business.id, {
      userId: tokens.userId,
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: encryptSecret(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
    });
  } catch (error) {
    console.error('[oauth] could not connect Mercado Pago', error);
    return fail('error');
  }
  panel.searchParams.set('mp', 'connected');
  return Response.redirect(panel, 303);
}
