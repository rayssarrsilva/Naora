import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { primaryLink } from '@/components/booking/styles';
import { Link } from '@/i18n/navigation';
import { formatWhen, googleCalendarUrl } from '@/lib/booking/format';
import { bookingSummary } from '@/lib/booking/repository';
import { formatReais } from '@/lib/business/money';

type Params = Promise<{ locale: string; slug: string; bookingId: string }>;

export const metadata: Metadata = { robots: { index: false } };

/** The confirmation. Its address is the receipt: the booking id is long and random. */
export default async function BookedPage({ params }: { params: Params }) {
  const { locale, slug, bookingId } = await params;
  setRequestLocale(locale);
  const booking = await bookingSummary(slug, bookingId);
  if (!booking) notFound();
  const t = await getTranslations('Booking');
  const money = (cents: number) => formatReais(cents, locale === 'en' ? 'en' : 'pt');
  const when = formatWhen(booking.startsAt, locale, booking.timezone);
  const cancelled = booking.status === 'CANCELLED';

  return (
    <div className="mx-auto grid max-w-2xl gap-8 px-5 py-12">
      <div className="grid gap-2">
        <h1 className="text-display">{cancelled ? t('cancelledTitle') : t('doneTitle')}</h1>
        <p className="text-text-secondary">
          {cancelled
            ? t('cancelledLead')
            : t('doneLead', { name: booking.clientName, business: booking.businessName })}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-xl border border-border-subtle p-5">
        <dt className="font-semibold">{t('service')}</dt>
        <dd>{booking.serviceName}</dd>
        <dt className="font-semibold">{t('when')}</dt>
        <dd className={cancelled ? 'line-through' : ''}>{when}</dd>
        <dt className="font-semibold">{t('price')}</dt>
        <dd>{money(booking.priceCents)}</dd>
        {booking.depositCents > 0 && (
          <>
            <dt className="font-semibold">{t('deposit')}</dt>
            <dd>{money(booking.depositCents)}</dd>
          </>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-4">
        {!cancelled && (
          <a
            href={googleCalendarUrl(
              t('calendarTitle', { service: booking.serviceName, business: booking.businessName }),
              booking.startsAt,
              booking.durationMin,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={primaryLink}
          >
            {t('addToCalendar')}
          </a>
        )}
        <Link href={`/b/${slug}`} className="font-semibold underline underline-offset-4">
          {cancelled ? t('bookAnother') : t('back', { name: booking.businessName })}
        </Link>
      </div>

      {!cancelled && booking.depositCents > 0 && (
        <p className="text-sm text-text-secondary">{t('paymentSoon')}</p>
      )}
    </div>
  );
}
