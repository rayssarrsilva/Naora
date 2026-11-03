import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { primaryLink } from '@/components/booking/styles';
import { Link } from '@/i18n/navigation';
import { freeFeePercent, proPriceCents } from '@/lib/billing/pricing';
import { formatReais } from '@/lib/business/money';
import { contactEmail } from '@/lib/site';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('Home');
  const tp = useTranslations('Plans');
  const price = formatReais(proPriceCents, locale === 'en' ? 'en' : 'pt');

  return (
    <div className="mx-auto grid max-w-5xl gap-14 px-5 py-14">
      <section aria-labelledby="hero-title" className="grid max-w-3xl gap-5">
        <p className="w-fit rounded-full border border-border-subtle px-3 py-1 text-text-secondary">
          {t('status')}
        </p>
        <h1 id="hero-title" className="text-display">
          {t('title')}
        </h1>
        <p className="text-lg text-text-secondary">{t('lead')}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/entrar" className={primaryLink}>
            {t('ctaButton')}
          </Link>
          <a href="#plans-title" className="font-semibold underline underline-offset-4">
            {t('seePlans')}
          </a>
        </div>
      </section>

      <section aria-labelledby="steps-title" className="grid gap-5">
        <h2 id="steps-title" className="text-heading-md">
          {t('stepsTitle')}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {(['step1', 'step2', 'step3'] as const).map((key, index) => (
            <li key={key} className="grid gap-2 rounded-xl border border-border-subtle p-5">
              <span className="font-display text-3xl text-text-secondary" aria-hidden="true">
                {index + 1}
              </span>
              <p>{t(key)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="plans-title" className="grid gap-5">
        <div className="grid gap-1">
          <h2 id="plans-title" className="text-heading-md">
            {t('plansTitle')}
          </h2>
          <p className="text-text-secondary">{t('plansLead')}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          <li className="grid gap-2 rounded-xl border border-border-subtle p-5">
            <p className="font-semibold">{tp('freeName')}</p>
            <p className="text-heading-md">{tp('freePrice')}</p>
            <p className="text-text-secondary">{tp('freeFee', { percent: freeFeePercent })}</p>
          </li>
          <li className="grid gap-2 rounded-xl border border-border-subtle p-5">
            <p className="font-semibold">{tp('proName')}</p>
            <p className="text-heading-md">{tp('proPrice', { price })}</p>
            <p className="text-text-secondary">{tp('proFee')}</p>
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="cta-title"
        className="grid max-w-3xl gap-4 rounded-xl bg-bg-surface p-6"
      >
        <h2 id="cta-title" className="text-heading-md">
          {t('ctaTitle')}
        </h2>
        <p>{t('ctaText')}</p>
        <Link href="/entrar" className={`${primaryLink} w-fit`}>
          {t('ctaButton')}
        </Link>
        <p className="text-sm text-text-secondary">
          {t.rich('questions', {
            email: (chunks) => (
              <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>
    </div>
  );
}
