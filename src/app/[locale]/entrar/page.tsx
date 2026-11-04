import { Button } from '@rayssarrsilva/ipe';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth, demoEnabled, googleEnabled } from '@/auth';
import { Link, redirect } from '@/i18n/navigation';
import { signInWithDemo, signInWithGoogle, switchAccount } from './actions';

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
  const session = await auth();
  // A real account goes straight to its dashboard. A demo account stays here, so the visitor can
  // switch to Google instead of being sent back to the demo every time.
  if (session?.user?.id && !session.user.isDemo) redirect({ href: '/painel', locale });
  const t = await getTranslations('SignIn');

  if (session?.user?.isDemo) {
    return (
      <div className="mx-auto grid max-w-md gap-6 px-5 py-14">
        <div className="grid gap-2">
          <h1 className="text-display">{t('title')}</h1>
          <p className="text-text-secondary">{t('inDemo')}</p>
        </div>
        <form action={switchAccount.bind(null, locale)}>
          <Button type="submit" size="lg" fullWidth>
            {t('switchAccount')}
          </Button>
        </form>
        <Link href="/painel" className="w-fit font-semibold underline underline-offset-4">
          {t('backToDemo')}
        </Link>
      </div>
    );
  }

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
      <p className="text-sm text-text-secondary">
        {t.rich('legal', {
          terms: (chunks) => (
            <Link href="/termos" className="underline underline-offset-4">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacidade" className="underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
