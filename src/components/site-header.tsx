import { Badge, Button } from '@rayssarrsilva/ipe';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth, demoEnabled } from '@/auth';
import { leaveAccount, signInWithDemo } from '@/app/[locale]/entrar/actions';
import { Link } from '@/i18n/navigation';
import { ThemeToggle } from './theme-toggle';

const textLink = 'font-semibold underline-offset-4 hover:underline';

/**
 * Sticky, so signing in, trying the demo and leaving an account are always one click away. Before
 * this, someone who opened the demo had no visible way out and could not reach the Google sign-in.
 */
export async function SiteHeader() {
  const [t, locale, session] = await Promise.all([getTranslations('Header'), getLocale(), auth()]);
  const other = locale === 'pt' ? 'en' : 'pt';
  const user = session?.user?.id ? session.user : null;

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg-canvas">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-bg-surface focus:px-4 focus:py-2"
      >
        {t('skip')}
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
        <Link href="/" className="mr-auto font-display text-2xl no-underline">
          Naora
        </Link>
        <Link
          href="/"
          locale={other}
          hrefLang={other === 'pt' ? 'pt-BR' : 'en'}
          lang={other === 'pt' ? 'pt-BR' : 'en'}
          className={textLink}
        >
          {t('otherLocale')}
        </Link>
        <ThemeToggle className="grid size-11 place-items-center rounded-full border border-border-subtle" />

        <nav
          aria-label={t('accountLabel')}
          className="flex basis-full flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:basis-auto"
        >
          {user ? (
            <>
              {user.isDemo && <Badge>{t('demoAccount')}</Badge>}
              <Link href="/painel" className={textLink}>
                {t('panel')}
              </Link>
              <form action={leaveAccount.bind(null, locale)}>
                <Button type="submit" variant="secondary" size="sm">
                  {user.isDemo ? t('leaveDemo') : t('signOut')}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className={textLink}>
                {t('signIn')}
              </Link>
              {demoEnabled && (
                <form action={signInWithDemo.bind(null, locale)}>
                  <Button type="submit" variant="primary" size="sm">
                    {t('tryDemo')}
                  </Button>
                </form>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
