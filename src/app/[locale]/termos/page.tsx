import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/legal-page';
import { legalDoc } from '@/content/legal';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  return { title: legalDoc('terms', locale).title };
}

export default async function Page({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage doc={legalDoc('terms', locale)} />;
}
