import '@fontsource/fraunces/400.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/600.css';
import '../globals.css';

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { themeScript } from '@/components/theme-toggle';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';

const htmlLang = { pt: 'pt-BR', en: 'en' } as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('title'), template: '%s · Naora' },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: { 'pt-BR': '/pt', en: '/en', 'x-default': '/pt' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Naora',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Set by src/proxy.ts. Reading it makes pages render per request, so each gets its own nonce.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    // The theme script sets data-theme before React loads, hence suppressHydrationWarning.
    <html lang={htmlLang[locale]} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <SiteHeader />
          <main id="content" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
