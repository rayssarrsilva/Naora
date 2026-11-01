'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@rayssarrsilva/ipe';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createBookingAction } from '@/app/[locale]/b/[slug]/agendar/[serviceId]/actions';
import { useRouter } from '@/i18n/navigation';
import { applyServerErrors, useErrorText } from '@/components/panel/use-action-errors';
import { type BookingData, type BookingInput, bookingSchema } from '@/lib/booking/schema';

export function BookingForm({
  slug,
  serviceId,
  startsAt,
  askEmail,
}: {
  slug: string;
  serviceId: string;
  startsAt: string;
  /** Mercado Pago needs the payer's email for a Pix charge. */
  askEmail: boolean;
}) {
  const t = useTranslations('Booking');
  const errorText = useErrorText();
  const router = useRouter();
  const [error, setErrorMessage] = useState('');
  const [leaving, setLeaving] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BookingInput, unknown, BookingData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { serviceId, startsAt, name: '', phone: '', email: '' },
  });

  async function submit() {
    setErrorMessage('');
    const result = await createBookingAction(slug, getValues());
    if (result.ok && 'bookingId' in result) {
      setLeaving(true);
      router.push(`/b/${slug}/agendado/${result.bookingId}`);
      return;
    }
    const general = applyServerErrors(result, setError);
    if (general) setErrorMessage(errorText(general) ?? '');
    // Someone else took the time: reload the list so it no longer offers it.
    if (general === 'slotTaken') router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4">
      <Input
        label={t('name')}
        autoComplete="name"
        error={errorText(errors.name?.message)}
        {...register('name')}
      />
      <Input
        label={t('phone')}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(11) 91234-5678"
        hint={t('phoneHint')}
        error={errorText(errors.phone?.message)}
        {...register('phone')}
      />
      {askEmail && (
        <Input
          label={t('email')}
          type="email"
          autoComplete="email"
          hint={t('emailHint')}
          error={errorText(errors.email?.message)}
          {...register('email')}
        />
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" loading={isSubmitting || leaving}>
          {t('confirm')}
        </Button>
        <p role="alert">{error}</p>
      </div>
    </form>
  );
}
