import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { apiContentSecurityPolicy, staticSecurityHeaders } from './src/lib/security/headers';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A self-contained server in .next/standalone, so the Docker image ships only what runs.
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: [...staticSecurityHeaders] },
      {
        source: '/api/:path*',
        headers: [{ key: 'Content-Security-Policy', value: apiContentSecurityPolicy }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
