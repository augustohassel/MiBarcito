import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mibarcito_theme';
export const META_THEME_COLOR_LIGHT = '#ffffff';
export const META_THEME_COLOR_DARK = '#1f1f1f';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Si localStorage está bloqueado o deshabilitado, degrada silenciosamente a light
  }
  return 'light';
}

function applyThemeToDOM(theme: ThemeMode) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (theme === 'dark') {
    root.classList.add('dark');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', META_THEME_COLOR_DARK);
    }
  } else {
    root.classList.remove('dark');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', META_THEME_COLOR_LIGHT);
    }
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Degrada elegante en memoria si localStorage está deshabilitado
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
  }, []);

  return {
    theme,
    toggleTheme,
    setTheme,
  };
}

