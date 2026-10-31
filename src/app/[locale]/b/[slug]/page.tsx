import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { formatReais } from '@/lib/business/money';
import { publicBusiness } from '@/lib/business/repository';

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const business = await publicBusiness(slug);
  return business ? { title: business.name } : {};
}

export default async function PublicBusinessPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const business = await publicBusiness(slug);
  if (!business) notFound();
  const t = await getTranslations('Public');
  const tw = await getTranslations('Weekdays');
  const money = (cents: number) => formatReais(cents, locale === 'en' ? 'en' : 'pt');

  return (
    <div className="mx-auto grid max-w-3xl gap-10 px-5 py-12">
      <div className="grid gap-2">
        <h1 className="text-display">{business.name}</h1>
        <p className="text-text-secondary">{t('bookingSoon')}</p>
      </div>

      <section aria-labelledby="services-title" className="grid gap-4">
        <h2 id="services-title" className="text-heading-md">
          {t('services')}
        </h2>
        {business.services.length === 0 ? (
          <p className="text-text-secondary">{t('noServices')}</p>
        ) : (
          <ul className="grid gap-3">
            {business.services.map((service) => (
              <li
                key={service.name}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl border border-border-subtle p-4"
              >
                <span className="mr-auto font-semibold">{service.name}</span>
                <span className="text-text-secondary">
                  {t('duration', { minutes: service.durationMin })}
                </span>
                <span className="font-semibold">{money(service.priceCents)}</span>
                <span className="w-full text-text-secondary">
                  {service.depositCents > 0
                    ? t('deposit', { deposit: money(service.depositCents) })
                    : t('noDeposit')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="hours-title" className="grid gap-4">
        <h2 id="hours-title" className="text-heading-md">
          {t('hours')}
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {business.hours.map((day) => (
            <div key={day.weekday} className="contents">
              <dt className="font-semibold">{tw(String(day.weekday))}</dt>
              <dd className={day.open ? '' : 'text-text-secondary'}>
                {day.open ? `${day.opensAt} – ${day.closesAt}` : t('closed')}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
