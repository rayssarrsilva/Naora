'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { auth, currentUserId, signOut } from '@/auth';
import {
  addService,
  createBusiness,
  deleteService,
  removeMercadoPagoConnection,
  saveHours,
  setServiceActive,
} from '@/lib/business/repository';
import { cancelBooking } from '@/lib/booking/repository';
import { cancelPro, subscribePro } from '@/lib/billing/service';
import { businessSchema, hoursSchema, serviceSchema } from '@/lib/business/schema';

/**
 * Every action trusts nothing from the browser: it reads the user from the session, validates the
 * input with the same Zod schema as the form, and lets the repository scope the write to the
 * user's own business. Errors come back as message keys for the form to translate.
 */
export type ActionResult =
  { ok: true } | { ok: false; error?: string; fields?: Record<string, string> };

function fieldErrors(error: z.ZodError): ActionResult {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    fields[key] ??= issue.message;
  }
  return { ok: false, fields };
}

const refreshPanel = () => revalidatePath('/[locale]/painel', 'page');
const refreshPublic = (slug?: string) => slug && revalidatePath(`/[locale]/b/${slug}`, 'page');

export async function createBusinessAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'signedOut' };
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  // Demo accounts get a demo business: deposits are simulated there, never charged.
  const result = await createBusiness(userId, parsed.data, { demo: session.user.isDemo });
  if (!result.ok) {
    return result.error === 'slugTaken'
      ? { ok: false, fields: { slug: 'slugTaken' } }
      : { ok: false, error: result.error };
  }
  refreshPanel();
  return { ok: true };
}

export async function addServiceAction(input: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'signedOut' };
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await addService(userId, parsed.data))) return { ok: false, error: 'generic' };
  refreshPanel();
  return { ok: true };
}

export async function deleteServiceAction(serviceId: string, slug: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'signedOut' };
  if (!(await deleteService(userId, String(serviceId)))) return { ok: false, error: 'generic' };
  refreshPanel();
  refreshPublic(slug);
  return { ok: true };
}

export async function setServiceActiveAction(
  serviceId: string,
  active: boolean,
  slug: string,
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'signedOut' };
  if (!(await setServiceActive(userId, String(serviceId), Boolean(active)))) {
    return { ok: false, error: 'generic' };
  }
  refreshPanel();
  refreshPublic(slug);
  return { ok: true };
}

export async function saveHoursAction(input: unknown, slug: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'signedOut' };
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await saveHours(userId, parsed.data.days))) return { ok: false, error: 'generic' };
  refreshPanel();
  refreshPublic(slug);
  return { ok: true };
}

export async function cancelBookingAction(bookingId: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'signedOut' };
  if (!(await cancelBooking(userId, String(bookingId)))) return { ok: false, error: 'generic' };
  refreshPanel();
  return { ok: true };
}

export type SubscribeActionResult = ActionResult | { ok: true; checkoutUrl: string | null };

/**
 * Pro: returns Mercado Pago's checkout link for the monthly subscription (the browser goes there),
 * or null for demo businesses, which switch at once without any charge.
 */
export async function subscribeProAction(locale: string): Promise<SubscribeActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'signedOut' };
  const result = await subscribePro(
    session.user.id,
    String(session.user.email ?? ''),
    locale === 'en' ? 'en' : 'pt',
  );
  if (!result.ok) return { ok: false, error: result.error };
  refreshPanel();
  return result;
}

export async function cancelProAction(): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'signedOut' };
  try {
    if (!(await cancelPro(userId))) return { ok: false, error: 'generic' };
  } catch {
    return { ok: false, error: 'paymentUnavailable' };
  }
  refreshPanel();
  return { ok: true };
}

export async function disconnectMercadoPagoAction(): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'signedOut' };
  if (!(await removeMercadoPagoConnection(userId))) return { ok: false, error: 'generic' };
  refreshPanel();
  return { ok: true };
}

export async function signOutAction(locale: string) {
  await signOut({ redirectTo: `/${locale === 'en' ? 'en' : 'pt'}` });
}
