import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { sourceUrl } from '@/lib/site';

export function SiteFooter() {
  const t = useTranslations('Footer');
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-5 py-6 text-text-secondary">
        <p className="mr-auto">
          {t('built')}{' '}
          <a href={sourceUrl} className="underline underline-offset-4">
            {t('source')}
          </a>
        </p>
        <Link href="/privacidade" className="underline underline-offset-4">
          {t('privacy')}
        </Link>
        <Link href="/termos" className="underline underline-offset-4">
          {t('terms')}
        </Link>
      </div>
    </footer>
  );
}
