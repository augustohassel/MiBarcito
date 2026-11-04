import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  removeGeminiApiKey,
  hasGeminiApiKey,
  GEMINI_API_KEY_STORAGE_KEY,
} from './ai-config';

describe('ai-config - Gestión de Gemini API Key', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('retorna vacío si no hay clave almacenada', () => {
    expect(getGeminiApiKey()).toBe('');
    expect(hasGeminiApiKey()).toBe(false);
  });

  it('guarda, lee y verifica la clave correctamente', () => {
    const testKey = 'AIzaSyFakeKeyForTesting123456';
    setGeminiApiKey(testKey);

    expect(localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY)).toBe(testKey);
    expect(getGeminiApiKey()).toBe(testKey);
    expect(hasGeminiApiKey()).toBe(true);
  });

  it('limpia espacios en blanco al guardar', () => {
    setGeminiApiKey('   AIzaSyKeyWithSpaces   ');
    expect(getGeminiApiKey()).toBe('AIzaSyKeyWithSpaces');
  });

  it('remueve la clave al invocar removeGeminiApiKey o setear cadena vacía', () => {
    setGeminiApiKey('some-key');
    expect(hasGeminiApiKey()).toBe(true);

    removeGeminiApiKey();
    expect(hasGeminiApiKey()).toBe(false);
    expect(getGeminiApiKey()).toBe('');

    setGeminiApiKey('another-key');
    expect(hasGeminiApiKey()).toBe(true);

    setGeminiApiKey('   ');
    expect(hasGeminiApiKey()).toBe(false);
    expect(getGeminiApiKey()).toBe('');
  });
});

