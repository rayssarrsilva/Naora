import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { contactEmail } from '@/lib/site';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('Home');
  const mail = `mailto:${contactEmail}?subject=${encodeURIComponent(t('ctaSubject'))}`;

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

      <section
        aria-labelledby="cta-title"
        className="grid max-w-3xl gap-4 rounded-xl bg-bg-surface p-6"
      >
        <h2 id="cta-title" className="text-heading-md">
          {t('ctaTitle')}
        </h2>
        <p>{t('ctaText')}</p>
        <a
          href={mail}
          className="w-fit rounded-full bg-action-primary px-6 py-3 font-semibold text-text-on-accent no-underline"
        >
          {t('ctaButton')}
        </a>
      </section>
    </div>
  );
}
