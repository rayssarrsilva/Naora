import { Button } from '@rayssarrsilva/ipe';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth, demoEnabled, googleEnabled } from '@/auth';
import { redirect } from '@/i18n/navigation';
import { signInWithDemo, signInWithGoogle } from './actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'SignIn' });
  return { title: t('title'), robots: { index: false } };
}

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await auth()) redirect({ href: '/painel', locale });
  const t = await getTranslations('SignIn');

  return (
    <div className="mx-auto grid max-w-md gap-6 px-5 py-14">
      <div className="grid gap-2">
        <h1 className="text-display">{t('title')}</h1>
        <p className="text-text-secondary">{t('lead')}</p>
      </div>
      {googleEnabled && (
        <form action={signInWithGoogle.bind(null, locale)}>
          <Button type="submit" variant="secondary" size="lg" fullWidth>
            {t('google')}
          </Button>
        </form>
      )}
      {demoEnabled && (
        <form action={signInWithDemo.bind(null, locale)} className="grid gap-2">
          <Button type="submit" size="lg" fullWidth>
            {t('demo')}
          </Button>
          <p className="text-sm text-text-secondary">{t('demoHint')}</p>
        </form>
      )}
      {!googleEnabled && !demoEnabled && <p role="alert">{t('noProviders')}</p>}
    </div>
  );
}
