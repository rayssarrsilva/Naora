/** @jest-environment node */
import { contentSecurityPolicy, createNonce, staticSecurityHeaders } from './headers';

describe('createNonce', () => {
  it('returns 128 random bits in base64, different every time', () => {
    const a = createNonce();
    const b = createNonce();
    expect(Buffer.from(a, 'base64')).toHaveLength(16);
    expect(a).not.toBe(b);
  });
});

describe('contentSecurityPolicy', () => {
  const policy = contentSecurityPolicy('abc123', false);
  const directive = (name: string) => policy.split('; ').find((d) => d.startsWith(`${name} `));

  it('only runs scripts that carry the nonce', () => {
    expect(directive('script-src')).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
  });

  it('never allows eval or inline scripts in production', () => {
    expect(policy).not.toContain('unsafe-eval');
    expect(directive('script-src')).not.toContain('unsafe-inline');
  });

  it('cannot be framed, and blocks plugins and base-tag tricks', () => {
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(directive('base-uri')).toBe("base-uri 'none'");
  });

  it('allows eval only in development, for React stack traces', () => {
    expect(contentSecurityPolicy('n', true)).toContain("'unsafe-eval'");
  });
});

describe('staticSecurityHeaders', () => {
  const header = (key: string) => staticSecurityHeaders.find((h) => h.key === key)?.value;

  it('forces HTTPS for two years, including subdomains', () => {
    expect(header('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
  });

  it('turns off MIME sniffing and framing', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('X-Frame-Options')).toBe('DENY');
  });
});
