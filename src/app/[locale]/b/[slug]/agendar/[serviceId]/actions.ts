'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/[locale]/painel/actions';
import { createBooking } from '@/lib/booking/repository';
import { bookingSchema } from '@/lib/booking/schema';

export type BookingActionResult = ActionResult | { ok: true; bookingId: string };

/**
 * Anyone can call this: clients do not sign in. Everything is checked again on the server: the
 * service must be active in this business, and the time must still be free under the lock.
 *
 * It returns the new booking's id instead of calling redirect(): the form calls this action from
 * its own submit handler, where Next.js's redirect would surface as an unhandled NEXT_REDIRECT
 * error. The form navigates to the confirmation page itself.
 */
export async function createBookingAction(
  slug: string,
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.')] ??= issue.message;
    return { ok: false, fields };
  }
  const result = await createBooking(String(slug), parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath('/[locale]/painel', 'page');
  return { ok: true, bookingId: result.bookingId };
}
