'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { currentUserId, signOut } from '@/auth';
import {
  addService,
  createBusiness,
  deleteService,
  saveHours,
  setServiceActive,
} from '@/lib/business/repository';
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
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'signedOut' };
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  const result = await createBusiness(userId, parsed.data);
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

export async function signOutAction(locale: string) {
  await signOut({ redirectTo: `/${locale === 'en' ? 'en' : 'pt'}` });
}
