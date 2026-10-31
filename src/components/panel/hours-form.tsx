'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Input } from '@rayssarrsilva/ipe';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { saveHoursAction } from '@/app/[locale]/painel/actions';
import type { DayHours } from '@/lib/business/hours';
import { type HoursInput, hoursSchema } from '@/lib/business/schema';
import { applyServerErrors, useErrorText } from './use-action-errors';

export function HoursForm({ days, slug }: { days: DayHours[]; slug: string }) {
  const t = useTranslations('Panel');
  const tw = useTranslations('Weekdays');
  const errorText = useErrorText();
  const [status, setStatus] = useState('');

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<HoursInput>({
    resolver: zodResolver(hoursSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { days },
  });
  const values = useWatch({ control, name: 'days' });

  async function save(input: HoursInput) {
    setStatus('');
    const result = await saveHoursAction(input, slug);
    const error = applyServerErrors(result, setError);
    setStatus(result.ok ? t('hoursSaved') : (errorText(error) ?? ''));
  }

  return (
    <form onSubmit={handleSubmit(save)} noValidate className="grid gap-4">
      {days.map((day, index) => {
        const open = values?.[index]?.open ?? day.open;
        const dayErrors = errors.days?.[index];
        return (
          <fieldset
            key={day.weekday}
            className="grid items-start gap-3 rounded-xl border border-border-subtle p-4 sm:grid-cols-[10rem_1fr_1fr]"
          >
            <legend className="sr-only">{tw(String(day.weekday))}</legend>
            <Controller
              control={control}
              name={`days.${index}.open`}
              render={({ field }) => (
                <Checkbox
                  label={tw(String(day.weekday))}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Input
              type="time"
              label={t('opensAt')}
              disabled={!open}
              error={errorText(dayErrors?.opensAt?.message)}
              {...register(`days.${index}.opensAt`)}
            />
            <Input
              type="time"
              label={t('closesAt')}
              disabled={!open}
              error={errorText(dayErrors?.closesAt?.message)}
              {...register(`days.${index}.closesAt`)}
            />
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" loading={isSubmitting}>
          {t('saveHours')}
        </Button>
        <p role="status">{status}</p>
      </div>
    </form>
  );
}
