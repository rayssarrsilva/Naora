import { Button } from '@rayssarrsilva/ipe';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { type BookingItem, BookingsList } from '@/components/panel/bookings-list';
import { PaymentsSettings } from '@/components/panel/payments-settings';
import { HoursForm } from '@/components/panel/hours-form';
import { OnboardingForm } from '@/components/panel/onboarding-form';
import { ServicesManager } from '@/components/panel/services-manager';
import { Link, redirect } from '@/i18n/navigation';
import { formatWhen } from '@/lib/booking/format';
import { upcomingBookings } from '@/lib/booking/repository';
import { formatPhone } from '@/lib/booking/schema';
import {
  businessForUser,
  getHours,
  listServices,
  paymentSettings,
} from '@/lib/business/repository';
import { siteUrl } from '@/lib/site';
import { signOutAction } from './actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Panel' });
  return { title: t('title'), robots: { index: false } };
}

export default async function PanelPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) return redirect({ href: '/entrar', locale });

  const t = await getTranslations('Panel');
  const business = await businessForUser(session.user.id);
  const origin = siteUrl().replace(/^https?:\/\//, '');
  const bookings: BookingItem[] = business
    ? (await upcomingBookings(session.user.id)).map((b) => ({
        id: b.id,
        when: formatWhen(b.startsAt, locale, business.timezone),
        serviceName: b.serviceName,
        clientName: b.clientName,
        phone: formatPhone(b.clientPhone),
        whatsapp: `https://wa.me/55${b.clientPhone}`,
        awaitingPayment: b.awaitingPayment,
      }))
    : [];
  const payments = business ? await paymentSettings(session.user.id) : null;
  const connectedOn = payments?.connectedAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
        dateStyle: 'long',
        timeZone: business!.timezone,
      }).format(payments.connectedAt)
    : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-10 px-5 py-10">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="mr-auto text-display">{business?.name ?? t('title')}</h1>
        <form action={signOutAction.bind(null, locale)}>
          <Button type="submit" variant="ghost">
            {t('signOut')}
          </Button>
        </form>
      </div>

      {session.user.isDemo && (
        <p className="rounded-xl bg-bg-surface p-4" role="note">
          {t('demoBanner')}
        </p>
      )}

      {!business ? (
        <section aria-labelledby="onboarding-title" className="grid gap-4">
          <h2 id="onboarding-title" className="text-heading-md">
            {t('onboardingTitle')}
          </h2>
          <p className="text-text-secondary">{t('onboardingLead')}</p>
          <OnboardingForm origin={origin} />
        </section>
      ) : (
        <>
          <section aria-labelledby="public-title" className="grid gap-2">
            <h2 id="public-title" className="text-heading-md">
              {t('publicLink')}
            </h2>
            <p className="flex flex-wrap items-center gap-3">
              <code className="rounded-md bg-bg-surface px-2 py-1">
                {origin}/{locale}/b/{business.slug}
              </code>
              <Link
                href={`/b/${business.slug}`}
                className="font-semibold underline underline-offset-4"
              >
                {t('openPublic')}
              </Link>
            </p>
          </section>

          <section aria-labelledby="bookings-title" className="grid gap-4">
            <div className="grid gap-1">
              <h2 id="bookings-title" className="text-heading-md">
                {t('bookingsTitle')}
              </h2>
              <p className="text-text-secondary">{t('bookingsLead')}</p>
            </div>
            <BookingsList bookings={bookings} />
          </section>

          <section aria-labelledby="services-title" className="grid gap-4">
            <div className="grid gap-1">
              <h2 id="services-title" className="text-heading-md">
                {t('servicesTitle')}
              </h2>
              <p className="text-text-secondary">{t('servicesLead')}</p>
            </div>
            <ServicesManager services={await listServices(business.id)} slug={business.slug} />
          </section>

          <section aria-labelledby="payments-title" className="grid gap-4">
            <div className="grid gap-1">
              <h2 id="payments-title" className="text-heading-md">
                {t('paymentsTitle')}
              </h2>
              <p className="text-text-secondary">
                {payments?.demo ? t('paymentsDemo') : t('paymentsLead')}
              </p>
            </div>
            {!payments?.demo && <PaymentsSettings connectedOn={connectedOn} />}
          </section>

          <section aria-labelledby="hours-title" className="grid gap-4">
            <div className="grid gap-1">
              <h2 id="hours-title" className="text-heading-md">
                {t('hoursTitle')}
              </h2>
              <p className="text-text-secondary">{t('hoursLead')}</p>
            </div>
            <HoursForm days={await getHours(business.id)} slug={business.slug} />
          </section>
        </>
      )}
    </div>
  );
}
