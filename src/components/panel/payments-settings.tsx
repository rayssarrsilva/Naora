'use client';

import { Button } from '@rayssarrsilva/ipe';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { disconnectMercadoPagoAction } from '@/app/[locale]/painel/actions';
import { primaryLink } from '@/components/booking/styles';
import { useErrorText } from './use-action-errors';

/**
 * "Connect with Mercado Pago" (OAuth). The owner authorizes Naora on Mercado Pago's own page; no
 * password or token is ever typed into Naora.
 */
export function PaymentsSettings({
  connectedOn,
  accountId,
  available,
}: {
  connectedOn: string | null;
  accountId: string | null;
  available: boolean;
}) {
  const t = useTranslations('Panel');
  const locale = useLocale();
  const errorText = useErrorText();
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectMercadoPagoAction();
      setStatus(result.ok ? t('disconnectedDone') : (errorText(result.error) ?? ''));
    });
  }

  return (
    <div className="grid gap-4">
      {connectedOn ? (
        <div className="flex flex-wrap items-center gap-4">
          <p className="mr-auto">
            {t('connected', { date: connectedOn })}
            {accountId && ` ${t('connectedAccount', { id: accountId })}`}
          </p>
          <Button type="button" variant="ghost" loading={pending} onClick={disconnect}>
            {t('disconnect')}
          </Button>
        </div>
      ) : available ? (
        <div className="grid gap-3">
          <p className="text-text-secondary">{t('paymentsOff')}</p>
          {/* A plain link: the connection starts on the server and leaves for Mercado Pago. */}
          <a href={`/api/mercadopago/connect?locale=${locale}`} className={`${primaryLink} w-fit`}>
            {t('connect')}
          </a>
          <p className="text-sm text-text-secondary">{t('connectHint')}</p>
        </div>
      ) : (
        <p className="text-text-secondary">{t('paymentsUnavailable')}</p>
      )}
      <p role="status">{status}</p>
    </div>
  );
}
