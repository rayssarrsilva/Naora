'use client';

import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { MoonIcon, SunIcon } from './icons';

type Theme = 'light' | 'dark';
const storageKey = 'naora:theme';
const event = 'naora:theme-change';

/**
 * Runs in <head> before the first paint, so a saved choice never flashes the other theme.
 * Without a saved choice the CSS follows the device setting.
 */
export const themeScript = `try{var t=localStorage.getItem('${storageKey}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

function current(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribe(onChange: () => void) {
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  window.addEventListener(event, onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener(event, onChange);
  };
}

export function ThemeToggle({ className }: { className: string }) {
  const t = useTranslations('Theme');
  const theme = useSyncExternalStore<Theme | null>(subscribe, current, () => null);

  function toggle() {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
    window.dispatchEvent(new Event(event));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={theme === 'dark' ? t('light') : t('dark')}
      title={theme === 'dark' ? t('light') : t('dark')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
