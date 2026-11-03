import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTheme, THEME_STORAGE_KEY, META_THEME_COLOR_LIGHT, META_THEME_COLOR_DARK } from './useTheme';

describe('useTheme hook', () => {
  let metaTag: HTMLMetaElement;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    let existingMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!existingMeta) {
      existingMeta = document.createElement('meta');
      existingMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(existingMeta);
    }
    existingMeta.setAttribute('content', META_THEME_COLOR_LIGHT);
    metaTag = existingMeta;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inicia en modo claro por defecto cuando no hay preferencia guardada', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(metaTag.getAttribute('content')).toBe(META_THEME_COLOR_LIGHT);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('inicia en modo oscuro si está guardado en localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(metaTag.getAttribute('content')).toBe(META_THEME_COLOR_DARK);
  });

  it('permite alternar entre claro y oscuro con toggleTheme()', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(metaTag.getAttribute('content')).toBe(META_THEME_COLOR_DARK);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(metaTag.getAttribute('content')).toBe(META_THEME_COLOR_LIGHT);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('permite establecer un tema explícito con setTheme()', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('caso de falla / borde: degrada elegante a memoria si localStorage arroja excepción', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: localStorage is disabled');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useTheme());

    // Debe iniciar en 'light' sin lanzar error
    expect(result.current.theme).toBe('light');

    // Debe permitir alternar en memoria
    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(setItemSpy).toHaveBeenCalled();
  });
});

