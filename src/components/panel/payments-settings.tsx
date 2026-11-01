'use client';

import { Button, Input } from '@rayssarrsilva/ipe';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import {
  connectMercadoPagoAction,
  disconnectMercadoPagoAction,
} from '@/app/[locale]/painel/actions';
import { useErrorText } from './use-action-errors';

/** Connect or disconnect the business's own Mercado Pago account. The token is never shown back. */
export function PaymentsSettings({ connectedOn }: { connectedOn: string | null }) {
  const t = useTranslations('Panel');
  const errorText = useErrorText();
  const [token, setToken] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  function connect(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setStatus('');
      setFieldError(undefined);
      const result = await connectMercadoPagoAction({ token });
      if (result.ok) {
        setToken('');
        setStatus(t('connectedDone'));
      } else if (result.fields?.token) setFieldError(result.fields.token);
      else setStatus(errorText(result.error) ?? '');
    });
  }

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
          <p className="mr-auto">{t('connected', { date: connectedOn })}</p>
          <Button type="button" variant="ghost" loading={pending} onClick={disconnect}>
            {t('disconnect')}
          </Button>
        </div>
      ) : (
        <form onSubmit={connect} noValidate className="grid gap-4">
          <p className="text-text-secondary">{t('paymentsOff')}</p>
          <Input
            label={t('token')}
            type="password"
            autoComplete="off"
            spellCheck={false}
            hint={t('tokenHint')}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            error={errorText(fieldError)}
          />
          <Button type="submit" loading={pending} className="w-fit">
            {t('connect')}
          </Button>
        </form>
      )}
      <p role="status">{status}</p>
    </div>
  );
}
