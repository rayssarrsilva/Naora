import { useTranslations } from 'next-intl';
import { sourceUrl } from '@/lib/site';

export function SiteFooter() {
  const t = useTranslations('Footer');
  return (
    <footer className="border-t border-border-subtle">
      <p className="mx-auto max-w-5xl px-5 py-6 text-text-secondary">
        {t('built')}{' '}
        <a href={sourceUrl} className="underline underline-offset-4">
          {t('source')}
        </a>
      </p>
    </footer>
  );
}
