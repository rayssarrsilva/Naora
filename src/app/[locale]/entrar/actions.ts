'use server';

import { signIn } from '@/auth';
import { routing } from '@/i18n/routing';

const panelFor = (locale: string) =>
  `/${(routing.locales as readonly string[]).includes(locale) ? locale : routing.defaultLocale}/painel`;

export async function signInWithDemo(locale: string) {
  await signIn('demo', { redirectTo: panelFor(locale) });
}

export async function signInWithGoogle(locale: string) {
  await signIn('google', { redirectTo: panelFor(locale) });
}
