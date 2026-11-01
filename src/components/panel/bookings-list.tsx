'use client';

import { Badge, Button } from '@rayssarrsilva/ipe';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { cancelBookingAction } from '@/app/[locale]/painel/actions';
import { useErrorText } from './use-action-errors';

/** Ready to show: the server formats dates in the business's time zone. */
export type BookingItem = {
  id: string;
  when: string;
  serviceName: string;
  clientName: string;
  phone: string;
  whatsapp: string;
  awaitingPayment: boolean;
};

export function BookingsList({ bookings }: { bookings: BookingItem[] }) {
  const t = useTranslations('Panel');
  const errorText = useErrorText();
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  function cancel(id: string) {
    startTransition(async () => {
      const result = await cancelBookingAction(id);
      setStatus(result.ok ? t('bookingCancelled') : (errorText(result.error) ?? ''));
    });
  }

  return (
    <div className="grid gap-3">
      {bookings.length === 0 ? (
        <p className="text-text-secondary">{t('bookingsEmpty')}</p>
      ) : (
        <ul className="grid gap-3" aria-label={t('bookingsTitle')}>
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle p-4"
            >
              <div className="mr-auto grid gap-1">
                <p className="font-semibold">
                  {booking.when} {booking.awaitingPayment && <Badge>{t('awaitingPix')}</Badge>}
                </p>
                <p>
                  {booking.serviceName} · {booking.clientName} ·{' '}
                  <a
                    href={booking.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('whatsappLabel', { name: booking.clientName })}
                    className="underline underline-offset-4"
                  >
                    {booking.phone}
                  </a>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={t('cancelBookingLabel', {
                  name: booking.clientName,
                  when: booking.when,
                })}
                onClick={() => cancel(booking.id)}
              >
                {t('cancelBooking')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p role="status">{status}</p>
    </div>
  );
}
