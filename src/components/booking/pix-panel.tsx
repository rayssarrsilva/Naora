'use client';

import { Button } from '@rayssarrsilva/ipe';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import {
  checkPaymentAction,
  simulatePaymentAction,
} from '@/app/[locale]/b/[slug]/agendar/[serviceId]/actions';
import { useErrorText } from '@/components/panel/use-action-errors';
import { useRouter } from '@/i18n/navigation';

/**
 * The Pix to pay: QR code, "copia e cola" and what to do next. While it waits, the page reloads its
 * data every few seconds, so the confirmation appears on its own when Mercado Pago tells Naora.
 */
export function PixPanel({
  slug,
  bookingId,
  pixCode,
  qrCode,
  ticketUrl,
  holdUntil,
  demo,
}: {
  slug: string;
  bookingId: string;
  pixCode: string;
  qrCode: string;
  ticketUrl: string | null;
  holdUntil: string;
  demo: boolean;
}) {
  const t = useTranslations('Booking');
  const errorText = useErrorText();
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const poll = setInterval(() => router.refresh(), 5000);
    // When the hold ends, reload once more to show that the time was released.
    const end = setTimeout(() => router.refresh(), Math.max(0, Date.parse(holdUntil) - Date.now()));
    return () => {
      clearInterval(poll);
      clearTimeout(end);
    };
  }, [router, holdUntil]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pixCode);
      setStatus(t('copied'));
    } catch {
      setStatus(t('copyFailed'));
    }
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      setStatus('');
      const result = await action();
      if (result.ok) router.refresh();
      else setStatus(errorText(result.error) ?? '');
    });
  }

  return (
    <section
      aria-labelledby="pix-title"
      className="grid gap-4 rounded-xl border border-border-subtle p-5"
    >
      <h2 id="pix-title" className="text-heading-md">
        {t('pixTitle')}
      </h2>
      {demo && (
        <p className="rounded-lg bg-bg-surface p-3" role="note">
          {t('demoPix')}
        </p>
      )}
      <div className="grid items-start gap-5 sm:grid-cols-[auto_1fr]">
        {/* QR codes need dark on light to scan, in any theme. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL, nothing to optimize */}
        <img
          src={qrCode}
          alt={t('qrAlt')}
          width={176}
          height={176}
          className="rounded-lg bg-white p-2"
        />
        <div className="grid gap-3">
          <label htmlFor="pix-code" className="font-semibold">
            {t('pixCode')}
          </label>
          <textarea
            id="pix-code"
            readOnly
            rows={3}
            value={pixCode}
            className="w-full resize-none rounded-lg border border-border-control bg-bg-canvas p-2 font-mono text-sm break-all"
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={copy}>
              {t('copy')}
            </Button>
            {demo ? (
              <Button
                type="button"
                variant="secondary"
                loading={pending}
                onClick={() => run(() => simulatePaymentAction(slug, bookingId))}
              >
                {t('simulate')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                loading={pending}
                onClick={() => run(() => checkPaymentAction(slug, bookingId))}
              >
                {t('paid')}
              </Button>
            )}
          </div>
          {ticketUrl && (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit underline underline-offset-4"
            >
              {t('ticket')}
            </a>
          )}
          <p role="status">{status}</p>
        </div>
      </div>
      <p className="text-sm text-text-secondary">{t('pixHow')}</p>
    </section>
  );
}
