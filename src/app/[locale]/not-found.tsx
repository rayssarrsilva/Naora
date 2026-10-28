import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('NotFound');
  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-5 py-14">
      <h1 className="text-display">{t('title')}</h1>
      <Link href="/" className="underline underline-offset-4">
        {t('back')}
      </Link>
    </div>
  );
}
