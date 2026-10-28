import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { contentSecurityPolicy, createNonce } from './lib/security/headers';

const intl = createMiddleware(routing);

/**
 * Next.js 16 calls this file "proxy" (formerly "middleware"). For every page it:
 * - creates a nonce and a Content-Security-Policy that only allows scripts carrying it.
 *   Next.js reads the policy from the request and adds the nonce to its own scripts;
 * - redirects "/" to the visitor's language and keeps the locale in the URL (next-intl).
 */
export default function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce);
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', csp);

  const response = intl(request);
  response.headers.set('Content-Security-Policy', csp);

  // The language cookie only matters to the server (to redirect "/"), so scripts never read it.
  const locale = response.cookies.get('NEXT_LOCALE');
  if (locale) {
    response.cookies.set({
      ...locale,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:',
    });
  }
  return response;
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
