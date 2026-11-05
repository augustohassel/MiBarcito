import { describe, it, expect, afterEach } from 'vitest';
import {
  getFirebaseEnvConfig,
  isFirebaseConfigured,
  traducirErrorFirebase,
} from '../firebase-client';

describe('firebase-client', () => {
  describe('getFirebaseEnvConfig & isFirebaseConfigured', () => {
    it('debe retornar null e isFirebaseConfigured=false si faltan variables requeridas', () => {
      expect(getFirebaseEnvConfig({})).toBeNull();
      expect(isFirebaseConfigured({})).toBe(false);

      expect(
        getFirebaseEnvConfig({
          VITE_FIREBASE_API_KEY: 'test-key',
          VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
          // falta VITE_FIREBASE_PROJECT_ID
        })
      ).toBeNull();

      expect(
        getFirebaseEnvConfig({
          VITE_FIREBASE_API_KEY: '   ',
          VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
          VITE_FIREBASE_PROJECT_ID: 'test-project',
        })
      ).toBeNull();
    });

    it('debe retornar la configuración completa y trimmeada con appId opcional', () => {
      const envWithAppId = {
        VITE_FIREBASE_API_KEY: '  api-key-123  ',
        VITE_FIREBASE_AUTH_DOMAIN: '  test.firebaseapp.com  ',
        VITE_FIREBASE_PROJECT_ID: '  test-project  ',
        VITE_FIREBASE_APP_ID: '  1:123:web:abc  ',
      };

      const config = getFirebaseEnvConfig(envWithAppId);
      expect(config).toEqual({
        apiKey: 'api-key-123',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        appId: '1:123:web:abc',
      });
      expect(isFirebaseConfigured(envWithAppId)).toBe(true);
    });

    it('debe retornar la configuración sin appId si este no fue provisto', () => {
      const envWithoutAppId = {
        VITE_FIREBASE_API_KEY: 'api-key-123',
        VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
      };

      const config = getFirebaseEnvConfig(envWithoutAppId);
      expect(config).toEqual({
        apiKey: 'api-key-123',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
      });
      expect(config?.appId).toBeUndefined();
      expect(isFirebaseConfigured(envWithoutAppId)).toBe(true);
    });
  });

  describe('traducirErrorFirebase', () => {
    const originalLocation = window.location;

    afterEach(() => {
      // Restaurar window.location después de cada test
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    });

    it('debe incluir el hostname actual ante error auth/unauthorized-domain cuando window.location está disponible', () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...originalLocation,
          hostname: 'barcito.hasselpunk.com',
        },
      });

      const mensaje = traducirErrorFirebase({ code: 'auth/unauthorized-domain' });
      expect(mensaje).toContain('barcito.hasselpunk.com');
      expect(mensaje).toBe(
        'Este dominio (barcito.hasselpunk.com) aún no está autorizado en Identity Platform (authorized_domains en Terraform).'
      );
    });

    it('debe retornar el mensaje genérico ante auth/unauthorized-domain si hostname está vacío', () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...originalLocation,
          hostname: '',
        },
      });

      const mensaje = traducirErrorFirebase({ code: 'auth/unauthorized-domain' });
      expect(mensaje).toBe(
        'Este dominio aún no está autorizado en Identity Platform (authorized_domains en Terraform).'
      );
    });

    it('debe traducir errores de popup cerrado por el usuario o cancelado', () => {
      expect(traducirErrorFirebase({ code: 'auth/popup-closed-by-user' })).toBe(
        'Se cerró la ventana de inicio de sesión antes de completar la autenticación. Tu sesión local sigue activa.'
      );
      expect(traducirErrorFirebase({ code: 'auth/cancelled-popup-request' })).toBe(
        'Se cerró la ventana de inicio de sesión antes de completar la autenticación. Tu sesión local sigue activa.'
      );
    });

    it('debe traducir errores de popup bloqueado por el navegador', () => {
      expect(traducirErrorFirebase({ code: 'auth/popup-blocked' })).toBe(
        'El navegador bloqueó la ventana emergente de Google. Permití las ventanas emergentes para este sitio e intentá nuevamente.'
      );
    });

    it('debe traducir errores de red o modo offline', () => {
      expect(traducirErrorFirebase({ code: 'auth/network-request-failed' })).toBe(
        'Sin conexión de red para contactar a Google Cloud. Tus datos locales siguen disponibles.'
      );
      expect(traducirErrorFirebase({ message: 'Client is offline' })).toBe(
        'Sin conexión de red para contactar a Google Cloud. Tus datos locales siguen disponibles.'
      );
    });

    it('debe traducir errores de permisos insuficientes de Firestore', () => {
      expect(traducirErrorFirebase({ code: 'permission-denied' })).toContain(
        'Acceso denegado por las reglas de seguridad de Firestore'
      );
      expect(traducirErrorFirebase({ code: 'firestore/permission-denied' })).toContain(
        'Acceso denegado por las reglas de seguridad de Firestore'
      );
      expect(
        traducirErrorFirebase({ message: 'Missing or insufficient permissions.' })
      ).toContain('Acceso denegado por las reglas de seguridad de Firestore');
    });

    it('debe retornar el mensaje original o fallback si el error no es reconocido', () => {
      expect(traducirErrorFirebase({ message: 'Error desconocido personalizado' })).toBe(
        'Error desconocido personalizado'
      );
      expect(traducirErrorFirebase({})).toBe(
        'Ocurrió un error al comunicarse con los servicios en la nube.'
      );
      expect(traducirErrorFirebase(null)).toBe(
        'Ocurrió un error al comunicarse con los servicios en la nube.'
      );
    });
  });
});

