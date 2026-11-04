'use server';

import { signIn, signOut } from '@/auth';
import { routing } from '@/i18n/routing';

const panelFor = (locale: string) =>
  `/${(routing.locales as readonly string[]).includes(locale) ? locale : routing.defaultLocale}/painel`;

export async function signInWithDemo(locale: string) {
  await signIn('demo', { redirectTo: panelFor(locale) });
}

export async function signInWithGoogle(locale: string) {
  await signIn('google', { redirectTo: panelFor(locale) });
}

/** Leaves the current (demo) account and comes back here to sign in with another one. */
export async function switchAccount(locale: string) {
  await signOut({ redirectTo: panelFor(locale).replace('/painel', '/entrar') });
}
