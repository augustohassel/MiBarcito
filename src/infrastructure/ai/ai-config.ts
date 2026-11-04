/**
 * Servicio de gestión local y segura de la API Key y modelo de Google Gemini.
 * Se almacena exclusivamente en el almacenamiento local del navegador (localStorage)
 * o se lee desde la variable de entorno local VITE_GEMINI_API_KEY en entornos de desarrollo.
 * Nunca se versionan claves ni se transmiten a repositorios externos.
 */

export const GEMINI_API_KEY_STORAGE_KEY = 'mibarcito_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'mibarcito_gemini_model';
export const MODELO_DEFAULT_GEMINI = 'gemini-2.5-flash';

export const MODELOS_DISPONIBLES_GEMINI = [
  { id: 'gemini-2.5-flash', nombre: 'Gemini 2.5 Flash (Recomendado)' },
  { id: 'gemini-3.8-flash', nombre: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.5-flash-lite', nombre: 'Gemini 3.5 Flash Lite' },
  { id: 'auto', nombre: 'Detección Automática' },
] as const;

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

export function getGeminiModel(): string {
  try {
    const localModel = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
    if (localModel && localModel.trim().length > 0) {
      return localModel.trim();
    }
  } catch {
    // Si localStorage está inaccesible
  }
  return MODELO_DEFAULT_GEMINI;
}

export function setGeminiModel(model: string): void {
  try {
    const trimmed = model.trim();
    if (trimmed.length > 0) {
      localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_MODEL_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error al guardar modelo de Gemini en localStorage:', error);
  }
}
