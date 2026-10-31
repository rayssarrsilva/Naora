'use client';

import { useTranslations } from 'next-intl';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ActionResult } from '@/app/[locale]/painel/actions';

/** Turns a message key from Zod or the server into text in the page's language. */
export function useErrorText() {
  const t = useTranslations('Errors');
  return (key?: string) => (key ? (t.has(key) ? t(key) : t('generic')) : undefined);
}

/** Puts the server's field errors on the form fields; returns the general error key, if any. */
export function applyServerErrors<T extends FieldValues>(
  result: ActionResult,
  setError: UseFormSetError<T>,
): string | undefined {
  if (result.ok) return undefined;
  for (const [field, message] of Object.entries(result.fields ?? {})) {
    setError(field as Path<T>, { type: 'server', message });
  }
  return result.error;
}
