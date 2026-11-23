import { useEffect, useState } from 'react';
import { THEME_KEY } from '../lib/constants';
import type { ThemeChoice } from '../lib/types';

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Ignore private-mode storage failures and follow the system.
  }
  return 'system';
}

function resolvedDark(choice: ThemeChoice): boolean {
  return choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function applyTheme(choice: ThemeChoice) {
  const dark = resolvedDark(choice);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.themeChoice = choice;
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.style.backgroundColor = '';
  root.style.color = '';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B1220' : '#F5F9FC');
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // The choice still applies for this visit.
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(readChoice);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  return [theme, setTheme] as const;
}
