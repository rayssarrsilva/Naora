import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const t = useTranslations('Header');
  const locale = useLocale();
  const other = locale === 'pt' ? 'en' : 'pt';

  return (
    <header className="border-b border-border-subtle">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-bg-surface focus:px-4 focus:py-2"
      >
        {t('skip')}
      </a>
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
        <Link href="/" className="mr-auto font-display text-2xl no-underline">
          Naora
        </Link>
        <Link href="/painel" className="font-semibold underline-offset-4 hover:underline">
          {t('panel')}
        </Link>
        <Link
          href="/"
          locale={other}
          hrefLang={other === 'pt' ? 'pt-BR' : 'en'}
          lang={other === 'pt' ? 'pt-BR' : 'en'}
          className="font-semibold underline-offset-4 hover:underline"
        >
          {t('otherLocale')}
        </Link>
        <ThemeToggle className="grid size-11 place-items-center rounded-full border border-border-subtle" />
      </div>
    </header>
  );
}
