'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Badge, Button, Input } from '@rayssarrsilva/ipe';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import {
  addServiceAction,
  deleteServiceAction,
  setServiceActiveAction,
} from '@/app/[locale]/painel/actions';
import { formatReais } from '@/lib/business/money';
import type { ServiceRow } from '@/lib/business/repository';
import { type ServiceData, type ServiceInput, serviceSchema } from '@/lib/business/schema';
import { applyServerErrors, useErrorText } from './use-action-errors';

const empty = { name: '', durationMin: '60', price: '', deposit: '0' };

export function ServicesManager({ services, slug }: { services: ServiceRow[]; slug: string }) {
  const t = useTranslations('Panel');
  const locale = useLocale() === 'en' ? 'en' : 'pt';
  const errorText = useErrorText();
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ServiceInput, unknown, ServiceData>({
    resolver: zodResolver(serviceSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: empty,
  });

  // The server validates the raw form again, so it gets what the person typed, not the parsed copy.
  async function add() {
    setStatus('');
    const result = await addServiceAction(getValues());
    const error = applyServerErrors(result, setError);
    if (result.ok) {
      reset(empty);
      setStatus(t('serviceAdded'));
    } else if (error) setStatus(errorText(error) ?? '');
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    startTransition(async () => {
      const result = await action();
      setStatus(result.ok ? done : (errorText(result.error) ?? ''));
    });
  }

  return (
    <div className="grid gap-6">
      {services.length === 0 ? (
        <p className="text-text-secondary">{t('servicesEmpty')}</p>
      ) : (
        <ul className="grid gap-3" aria-label={t('servicesTitle')}>
          {services.map((service) => (
            <li
              key={service.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle p-4"
            >
              <div className="mr-auto grid gap-1">
                <p className="font-semibold">
                  {service.name} {!service.active && <Badge>{t('paused')}</Badge>}
                </p>
                <p className="text-text-secondary">
                  {t('summary', {
                    duration: service.durationMin,
                    price: formatReais(service.priceCents, locale),
                    deposit: formatReais(service.depositCents, locale),
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                aria-label={t(service.active ? 'pauseLabel' : 'resumeLabel', {
                  name: service.name,
                })}
                onClick={() =>
                  run(
                    () => setServiceActiveAction(service.id, !service.active, slug),
                    t(service.active ? 'pause' : 'resume'),
                  )
                }
              >
                {t(service.active ? 'pause' : 'resume')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={t('deleteLabel', { name: service.name })}
                onClick={() => run(() => deleteServiceAction(service.id, slug), t('deleted'))}
              >
                {t('delete')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit(add)} noValidate className="grid gap-4">
        <Input
          label={t('serviceName')}
          placeholder={t('serviceNamePlaceholder')}
          error={errorText(errors.name?.message)}
          {...register('name')}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={t('duration')}
            inputMode="numeric"
            error={errorText(errors.durationMin?.message)}
            {...register('durationMin')}
          />
          <Input
            label={t('price')}
            inputMode="decimal"
            error={errorText(errors.price?.message)}
            {...register('price')}
          />
          <Input
            label={t('deposit')}
            inputMode="decimal"
            hint={t('depositHint')}
            error={errorText(errors.deposit?.message)}
            {...register('deposit')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" loading={isSubmitting}>
            {t('addService')}
          </Button>
          <p role="status">{status}</p>
        </div>
      </form>
    </div>
  );
}
