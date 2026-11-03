'use client';

import { Badge, Button } from '@rayssarrsilva/ipe';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { cancelProAction, subscribeProAction } from '@/app/[locale]/painel/actions';
import { useRouter } from '@/i18n/navigation';
import { freeFeePercent, proPriceCents, type PlanName } from '@/lib/billing/pricing';
import { formatReais } from '@/lib/business/money';
import { useErrorText } from './use-action-errors';

export type PlanView = {
  plan: PlanName;
  demo: boolean;
  paidDeposits: number;
  feesCents: number;
  canSubscribe: boolean;
  /** Paid deposits of a typical size that make Pro cheaper, if the business has a deposit. */
  breakEven: number | null;
};

/** The two plans side by side, this month's numbers, and the switch between them. */
export function PlanSettings({ view }: { view: PlanView }) {
  const t = useTranslations('Plans');
  const locale = useLocale() === 'en' ? 'en' : 'pt';
  const money = (cents: number) => formatReais(cents, locale);
  const errorText = useErrorText();
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();
  const pro = view.plan === 'PRO';

  function subscribe() {
    startTransition(async () => {
      setStatus('');
      const result = await subscribeProAction(locale);
      if (!result.ok) return setStatus(errorText(result.error) ?? '');
      if ('checkoutUrl' in result && result.checkoutUrl) {
        // Mercado Pago's own checkout page: the owner pays there and comes back to the dashboard.
        window.location.assign(result.checkoutUrl);
        return;
      }
      setStatus(t('proOn'));
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      setStatus('');
      const result = await cancelProAction();
      setStatus(result.ok ? t('freeOn') : (errorText(result.error) ?? ''));
      router.refresh();
    });
  }

  const cards = [
    {
      key: 'FREE',
      name: t('freeName'),
      price: t('freePrice'),
      lines: [t('freeFee', { percent: freeFeePercent }), t('everything')],
    },
    {
      key: 'PRO',
      name: t('proName'),
      price: t('proPrice', { price: money(proPriceCents) }),
      lines: [t('proFee'), t('everything')],
    },
  ] as const;

  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const current = card.key === view.plan;
          return (
            <li
              key={card.key}
              aria-current={current ? 'true' : undefined}
              className={`grid gap-2 rounded-xl border p-4 ${current ? 'border-action-primary' : 'border-border-subtle'}`}
            >
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {card.name} {current && <Badge>{t('current')}</Badge>}
              </p>
              <p className="text-heading-md">{card.price}</p>
              <ul className="grid gap-1 text-text-secondary">
                {card.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <p>
        {pro
          ? t('monthPro', { count: view.paidDeposits })
          : t('monthFree', { count: view.paidDeposits, fees: money(view.feesCents) })}
      </p>
      {!pro && view.breakEven && (
        <p className="text-text-secondary">{t('breakEven', { count: view.breakEven })}</p>
      )}
      {view.demo && <p className="text-sm text-text-secondary">{t('demoNote')}</p>}

      <div className="flex flex-wrap items-center gap-4">
        {pro ? (
          <Button type="button" variant="ghost" loading={pending} onClick={cancel}>
            {t('cancel')}
          </Button>
        ) : view.canSubscribe ? (
          <Button type="button" loading={pending} onClick={subscribe}>
            {view.demo ? t('subscribeDemo') : t('subscribe', { price: money(proPriceCents) })}
          </Button>
        ) : (
          <p className="text-text-secondary">{t('subscribeOff')}</p>
        )}
        <p role="status">{status}</p>
      </div>
    </div>
  );
}
