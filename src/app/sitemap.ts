import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: `${siteUrl()}/${locale}`,
    alternates: { languages: { 'pt-BR': `${siteUrl()}/pt`, en: `${siteUrl()}/en` } },
  }));
}
