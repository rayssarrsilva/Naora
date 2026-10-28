/**
 * Security headers, following the OWASP Secure Headers Project and the Mozilla Observatory.
 * The Content-Security-Policy is built per request in src/proxy.ts, with a fresh nonce.
 */

/** Origins the browser may call besides this site. Keep it short: each one is a trust decision. */
const connectSources: string[] = [];

/**
 * Scripts run only with this request's nonce. 'strict-dynamic' lets those scripts load the
 * Next.js chunks they need, and nothing else: no inline handlers, no eval, no other origins.
 * React needs eval in development only, for better stack traces.
 */
export function contentSecurityPolicy(nonce: string, dev = process.env.NODE_ENV === 'development') {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // Style sheets come from this site; a <style> element needs the nonce. In development the
    // error overlay injects its own styles (and browsers ignore 'unsafe-inline' next to a nonce).
    dev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    // Style attributes are allowed: they cannot run code, and img-src limits what a url()
    // inside them could reach.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${["'self'", ...connectSources, ...(dev ? ['ws:'] : [])].join(' ')}`,
    "object-src 'none'",
    "base-uri 'none'",
    // Payments will leave the site through a redirect, never through a form post.
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

/** A random nonce, 128 bits, base64. */
export function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** Sent on every response: pages, API routes, images and files. */
export const staticSecurityHeaders = [
  // Two years, all subdomains, eligible for the browsers' preload list.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Older browsers that ignore frame-ancestors.
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
] as const;

/** API responses are data, never pages: nothing may run or be framed. */
export const apiContentSecurityPolicy =
  "default-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'";
