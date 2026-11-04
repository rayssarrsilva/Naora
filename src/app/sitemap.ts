import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';

/** Public pages, in both languages: home, privacy and terms. Business pages are not listed. */
const paths = ['', '/privacidade', '/termos'];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${siteUrl()}/${locale}${path}`,
      alternates: {
        languages: { 'pt-BR': `${siteUrl()}/pt${path}`, en: `${siteUrl()}/en${path}` },
      },
    })),
  );
}
