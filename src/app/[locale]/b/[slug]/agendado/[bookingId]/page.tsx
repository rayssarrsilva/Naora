import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import QRCode from 'qrcode';
import { PixPanel } from '@/components/booking/pix-panel';
import { primaryLink } from '@/components/booking/styles';
import { Link } from '@/i18n/navigation';
import { formatTime, formatWhen, googleCalendarUrl } from '@/lib/booking/format';
import { bookingSummary } from '@/lib/booking/repository';
import { formatReais } from '@/lib/business/money';

type Params = Promise<{ locale: string; slug: string; bookingId: string }>;

export const metadata: Metadata = { robots: { index: false } };

/**
 * The booking's own page: pay the deposit, then the confirmation. Its address is the receipt; the
 * id is long and random. It is rendered on every visit, so the state always follows the database.
 */
export default async function BookedPage({ params }: { params: Params }) {
  const { locale, slug, bookingId } = await params;
  setRequestLocale(locale);
  const booking = await bookingSummary(slug, bookingId);
  if (!booking) notFound();
  const t = await getTranslations('Booking');
  const money = (cents: number) => formatReais(cents, locale === 'en' ? 'en' : 'pt');
  const when = formatWhen(booking.startsAt, locale, booking.timezone);
  const { state, payment } = booking;
  const ended = state === 'cancelled' || state === 'expired';

  const title = {
    confirmed: t('doneTitle'),
    awaitingPayment: t('payTitle'),
    expired: t('expiredTitle'),
    cancelled: t('cancelledTitle'),
  }[state];
  const lead = {
    confirmed: t('doneLead', { name: booking.clientName, business: booking.businessName }),
    awaitingPayment: t('payLead', {
      deposit: money(booking.depositCents),
      time: booking.holdUntil ? formatTime(booking.holdUntil, locale, booking.timezone) : '',
    }),
    expired: t('expiredLead'),
    cancelled: t('cancelledLead'),
  }[state];

  return (
    <div className="mx-auto grid max-w-2xl gap-8 px-5 py-12">
      <div className="grid gap-2">
        <h1 className="text-display">{title}</h1>
        <p className="text-text-secondary">{lead}</p>
      </div>

      {state === 'awaitingPayment' && payment && booking.holdUntil && (
        <PixPanel
          slug={slug}
          bookingId={booking.id}
          pixCode={payment.pixCode}
          qrCode={`data:image/svg+xml;base64,${Buffer.from(
            await QRCode.toString(payment.pixCode, { type: 'svg', margin: 1 }),
          ).toString('base64')}`}
          ticketUrl={payment.ticketUrl}
          holdUntil={booking.holdUntil.toISOString()}
          demo={payment.provider === 'demo'}
        />
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-xl border border-border-subtle p-5">
        <dt className="font-semibold">{t('service')}</dt>
        <dd>{booking.serviceName}</dd>
        <dt className="font-semibold">{t('when')}</dt>
        <dd className={ended ? 'line-through' : ''}>{when}</dd>
        <dt className="font-semibold">{t('price')}</dt>
        <dd>{money(booking.priceCents)}</dd>
        {booking.depositCents > 0 && (
          <>
            <dt className="font-semibold">{t('deposit')}</dt>
            <dd>
              {money(booking.depositCents)}
              {state === 'confirmed' && payment && ` · ${t('depositPaid')}`}
            </dd>
          </>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-4">
        {state === 'confirmed' && (
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
          {ended ? t('bookAnother') : t('back', { name: booking.businessName })}
        </Link>
      </div>

      {state === 'confirmed' && booking.depositCents > 0 && !payment && (
        <p className="text-sm text-text-secondary">{t('depositAtBusiness')}</p>
      )}
    </div>
  );
}
