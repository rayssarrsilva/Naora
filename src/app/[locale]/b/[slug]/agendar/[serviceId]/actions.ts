'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/[locale]/painel/actions';
import { createBooking } from '@/lib/booking/repository';
import { refreshPayment, simulateDemoPayment } from '@/lib/payments/service';
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
  if (!result.ok) {
    return result.error === 'emailRequired'
      ? { ok: false, fields: { email: 'emailRequired' } }
      : { ok: false, error: result.error };
  }
  revalidatePath('/[locale]/painel', 'page');
  return { ok: true, bookingId: result.bookingId };
}

/** "Simulate payment", only on demo businesses: the server refuses it anywhere else. */
export async function simulatePaymentAction(
  slug: string,
  bookingId: string,
): Promise<ActionResult> {
  if (!(await simulateDemoPayment(String(slug), String(bookingId)))) {
    return { ok: false, error: 'generic' };
  }
  revalidatePath('/[locale]/painel', 'page');
  return { ok: true };
}

/** "I have paid": asks Mercado Pago again, in case its notification has not arrived yet. */
export async function checkPaymentAction(slug: string, bookingId: string): Promise<ActionResult> {
  try {
    const outcome = await refreshPayment(String(slug), String(bookingId));
    if (outcome === 'confirmed' || outcome === 'alreadyConfirmed') {
      revalidatePath('/[locale]/painel', 'page');
      return { ok: true };
    }
    return { ok: false, error: outcome === 'pending' ? 'notPaidYet' : 'generic' };
  } catch {
    return { ok: false, error: 'paymentUnavailable' };
  }
}
