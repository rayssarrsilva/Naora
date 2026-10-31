'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/[locale]/painel/actions';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { createBooking } from '@/lib/booking/repository';
import { bookingSchema } from '@/lib/booking/schema';

/**
 * Anyone can call this: clients do not sign in. Everything is checked again on the server: the
 * service must be active in this business, and the time must still be free under the lock.
 */
export async function createBookingAction(
  locale: string,
  slug: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.')] ??= issue.message;
    return { ok: false, fields };
  }
  const result = await createBooking(slug, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/[locale]/painel', 'page');
  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
  return redirect({ href: `/b/${slug}/agendado/${result.bookingId}`, locale: safeLocale });
}
