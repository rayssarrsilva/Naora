import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookingForm } from '@/components/booking/booking-form';
import { choiceLink } from '@/components/booking/styles';
import { Link } from '@/i18n/navigation';
import { formatDayLong, formatDayShort, formatTime, formatWhen } from '@/lib/booking/format';
import { availability, bookingContext } from '@/lib/booking/repository';
import { formatReais } from '@/lib/business/money';

type Params = Promise<{ locale: string; slug: string; serviceId: string }>;
type Search = Promise<{ dia?: string | string[]; hora?: string | string[] }>;

export const metadata: Metadata = { robots: { index: false } };

const one = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

/**
 * Day → time → details, one step per section. Days and times are plain links (?dia=…&hora=…), so
 * the page works before JavaScript loads, the back button behaves, and a time can be shared.
 */
export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale, slug, serviceId } = await params;
  setRequestLocale(locale);
  const context = await bookingContext(slug, serviceId);
  if (!context) notFound();
  const { business, service } = context;
  const t = await getTranslations('Booking');
  const tz = business.timezone;
  const money = (cents: number) => formatReais(cents, locale === 'en' ? 'en' : 'pt');

  const days = await availability(context);
  const query = await searchParams;
  const firstOpen = days.find((d) => d.slots.length > 0);
  const chosenDay = days.find((d) => d.day === one(query.dia)) ?? firstOpen ?? days[0]!;
  const hora = one(query.hora);
  const chosenSlot = chosenDay.slots.find((slot) => slot.toISOString() === hora);
  const base = `/b/${slug}/agendar/${service.id}`;

  return (
    <div className="mx-auto grid max-w-3xl gap-10 px-5 py-12">
      <div className="grid gap-2">
        <Link href={`/b/${slug}`} className="w-fit underline underline-offset-4">
          {t('back', { name: business.name })}
        </Link>
        <h1 className="text-display">{service.name}</h1>
        <p className="text-text-secondary">
          {t('summary', { duration: service.durationMin, price: money(service.priceCents) })}
          {service.depositCents > 0 &&
            ` · ${t('depositNote', { deposit: money(service.depositCents) })}`}
        </p>
      </div>

      {!firstOpen ? (
        <p role="status">{t('noSlotsAtAll')}</p>
      ) : (
        <>
          <section aria-labelledby="day-title" className="grid gap-4">
            <h2 id="day-title" className="text-heading-md">
              {t('chooseDay')}
            </h2>
            <ul
              className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2"
              aria-label={t('daysLabel')}
            >
              {days.map(({ day, slots }) => {
                const label = formatDayShort(day, locale, tz);
                return (
                  <li key={day}>
                    {slots.length > 0 ? (
                      <Link
                        href={`${base}?dia=${day}`}
                        scroll={false}
                        aria-current={day === chosenDay.day ? 'date' : undefined}
                        className={`${choiceLink} w-full py-2`}
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-11 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle px-3 py-2 text-center text-sm text-text-secondary">
                        {label}
                        <span>{t('noSlotsDay')}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="time-title" className="grid gap-4">
            <h2 id="time-title" className="text-heading-md">
              {t('chooseTime', { day: formatDayLong(chosenDay.day, locale, tz) })}
            </h2>
            {hora && !chosenSlot && <p role="alert">{t('slotGone')}</p>}
            {chosenDay.slots.length === 0 ? (
              <p className="text-text-secondary">{t('noSlots')}</p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
                {chosenDay.slots.map((slot) => {
                  const iso = slot.toISOString();
                  return (
                    <li key={iso}>
                      <Link
                        href={`${base}?dia=${chosenDay.day}&hora=${encodeURIComponent(iso)}#details-title`}
                        aria-current={iso === hora ? 'time' : undefined}
                        className={`${choiceLink} w-full`}
                      >
                        {formatTime(slot, locale, tz)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {chosenSlot && (
            <section aria-labelledby="details-title" className="grid gap-4">
              <div className="grid gap-1">
                <h2 id="details-title" className="text-heading-md">
                  {t('detailsTitle')}
                </h2>
                <p className="font-semibold">
                  {t('chosen', { service: service.name, when: formatWhen(chosenSlot, locale, tz) })}
                </p>
              </div>
              <BookingForm
                key={chosenSlot.toISOString()}
                slug={slug}
                serviceId={service.id}
                startsAt={chosenSlot.toISOString()}
              />
              {service.depositCents > 0 && (
                <p className="text-sm text-text-secondary">{t('paymentSoon')}</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
