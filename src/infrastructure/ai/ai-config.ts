/**
 * Servicio de gestión local y segura de la API Key de Google Gemini.
 * Se almacena exclusivamente en el almacenamiento local del navegador (localStorage)
 * o se lee desde la variable de entorno local VITE_GEMINI_API_KEY en entornos de desarrollo.
 * Nunca se versionan claves ni se transmiten a repositorios externos.
 */

export const GEMINI_API_KEY_STORAGE_KEY = 'mibarcito_gemini_api_key';

export function getGeminiApiKey(): string {
  try {
    const localKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    if (localKey && localKey.trim().length > 0) {
      return localKey.trim();
    }
  } catch {
    // Si localStorage está bloqueado o inaccesible (ej. iframe seguro)
  }

  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const envKey = env?.VITE_GEMINI_API_KEY || '';
  return envKey.trim();
}

export function setGeminiApiKey(key: string): void {
  const trimmed = key.trim();
  try {
    if (trimmed.length > 0) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error al guardar Gemini API Key en localStorage:', error);
  }
}

export function removeGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error al remover Gemini API Key de localStorage:', error);
  }
}

export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

