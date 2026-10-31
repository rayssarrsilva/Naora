'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useSyncExternalStore } from 'react';
import { MoonIcon, SunIcon } from './icons';

type Theme = 'light' | 'dark';
const storageKey = 'naora:theme';
const event = 'naora:theme-change';

/**
 * Runs in <head> before the first paint, so a saved choice never flashes the other theme.
 * Without a saved choice the CSS follows the device setting.
 */
export const themeScript = `try{var t=localStorage.getItem('${storageKey}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

function saved(): Theme | null {
  try {
    const t = localStorage.getItem(storageKey);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

function current(): Theme {
  // The saved choice wins over the <html> attribute: React can drop that attribute (see below).
  const chosen = saved() ?? document.documentElement.dataset.theme;
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

  // When hydration fails (a browser extension or a test runner changed the HTML), React renders the
  // page again from scratch and resets the attributes of <html>, data-theme included. Put it back.
  useEffect(() => {
    const choice = saved();
    if (choice && document.documentElement.dataset.theme !== choice) {
      document.documentElement.dataset.theme = choice;
    }
  }, [theme]);

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
      // "pending" until React runs in the browser; then the theme in use. Tests wait for it.
      data-state={theme ?? 'pending'}
      className={className}
      aria-label={theme === 'dark' ? t('light') : t('dark')}
      title={theme === 'dark' ? t('light') : t('dark')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
