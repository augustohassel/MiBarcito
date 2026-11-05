import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId?: string;
}

/**
 * Obtiene la configuración pública de Firebase desde variables de entorno de Vite.
 */
export function getFirebaseEnvConfig(
  env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>
): FirebaseClientConfig | null {
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim() || '';
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || '';
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim() || '';
  const appId = env.VITE_FIREBASE_APP_ID?.trim() || undefined;

  if (!apiKey || !authDomain || !projectId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    ...(appId ? { appId } : {}),
  };
}

/**
 * Verifica si las variables de entorno de Firebase están configuradas.
 * Si retorna false, la aplicación opera transparentemente en modo Local-First (IndexedDB).
 */
export function isFirebaseConfigured(
  env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>
): boolean {
  return getFirebaseEnvConfig(env) !== null;
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;

/**
 * Inicializa o devuelve la instancia singleton de FirebaseApp, Auth y Firestore.
 * Retorna null si las variables VITE_FIREBASE_* no están configuradas.
 */
export function getFirebaseServices(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
} | null {
  const config = getFirebaseEnvConfig();
  if (!config) {
    return null;
  }

  try {
    if (!cachedApp) {
      cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);
    }

    if (!cachedAuth) {
      cachedAuth = getAuth(cachedApp);
    }

    if (!cachedFirestore) {
      try {
        cachedFirestore = initializeFirestore(cachedApp, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        // Fallback si Firestore ya había sido inicializado o si el entorno (ej. jsdom/SSR) no soporta persistentLocalCache
        cachedFirestore = getFirestore(cachedApp);
      }
    }

    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    return {
      app: cachedApp,
      auth: cachedAuth,
      db: cachedFirestore,
      googleProvider,
    };
  } catch (err) {
    console.warn('No se pudo inicializar Firebase SDK. Operando en modo local IndexedDB:', err);
    return null;
  }
}

/**
 * Traduce códigos de error de Firebase Auth / Firestore a mensajes claros en español.
 */
export function traducirErrorFirebase(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const message = (err as { message?: string })?.message || '';

  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return 'Se cerró la ventana de inicio de sesión antes de completar la autenticación. Tu sesión local sigue activa.';
  }

  if (code === 'auth/popup-blocked') {
    return 'El navegador bloqueó la ventana emergente de Google. Permití las ventanas emergentes para este sitio e intentá nuevamente.';
  }

  if (code === 'auth/network-request-failed' || message.toLowerCase().includes('offline')) {
    return 'Sin conexión de red para contactar a Google Cloud. Tus datos locales siguen disponibles.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'Este dominio aún no está autorizado en Identity Platform (authorized_domains en Terraform).';
  }

  if (
    code === 'permission-denied' ||
    code === 'firestore/permission-denied' ||
    message.includes('Missing or insufficient permissions')
  ) {
    return 'Acceso denegado por las reglas de seguridad de Firestore (permission-denied). Verificá haber iniciado sesión con la cuenta propietaria autorizada.';
  }

  return message || 'Ocurrió un error al comunicarse con los servicios en la nube.';
}

