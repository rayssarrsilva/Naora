import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt', 'en'],
  // Naora is built first for salons and barbershops in Brazil.
  defaultLocale: 'pt',
  localePrefix: 'always',
  // hreflang comes from each page's metadata, so the automatic Link header is turned off.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
