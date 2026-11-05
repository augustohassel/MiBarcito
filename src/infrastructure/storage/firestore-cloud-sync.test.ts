import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getFirebaseEnvConfig,
  isFirebaseConfigured,
  traducirErrorFirebase,
} from '../firebase/firebase-client';
import {
  FirestoreInventoryRepository,
  sanitizeForFirestore,
} from './firestore-inventory-repository';
import { FirestoreCategoriaRepository } from './firestore-categoria-repository';
import { FirestoreRecetaRepository } from './firestore-receta-repository';
import { FirestoreAlmacenRepository } from './firestore-almacen-repository';
import {
  exportBackupPayload,
  importBackupPayload,
  inspectLocalInventory,
  mergeLocalInventoryToFirestore,
} from './cloud-migration.service';
import { InMemoryInventoryRepository } from './in-memory-inventory-repository';
import { InMemoryCategoriaRepository } from './in-memory-categoria-repository';
import { InMemoryRecetaRepository } from './in-memory-receta-repository';
import { InMemoryAlmacenRepository } from './in-memory-almacen-repository';
import { Bebida } from '../../domain/models/bebida';

// Mock en memoria para simular Cloud Firestore (users/{uid}/{coleccion}/{docId})
const mockCloudStore = new Map<string, Record<string, any>>();
let shouldThrowPermissionDenied = false;

vi.mock('firebase/firestore', () => {
  return {
    collection: (_db: unknown, ...segments: string[]) => ({
      path: segments.join('/'),
    }),
    doc: (_db: unknown, ...segments: string[]) => ({
      path: segments.join('/'),
      id: segments[segments.length - 1],
    }),
    getDocs: async (colRef: { path: string }) => {
      if (shouldThrowPermissionDenied) {
        const err = new Error('Missing or insufficient permissions.');
        (err as any).code = 'permission-denied';
        throw err;
      }
      const prefix = `${colRef.path}/`;
      const docs: Array<{ id: string; ref: { path: string }; data: () => any }> = [];
      for (const [key, value] of mockCloudStore.entries()) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          if (!rest.includes('/')) {
            docs.push({
              id: rest,
              ref: { path: key },
              data: () => ({ ...value }),
            });
          }
        }
      }
      return {
        empty: docs.length === 0,
        docs,
        forEach: (cb: (d: { id: string; data: () => any }) => void) => docs.forEach(cb),
      };
    },
    getDoc: async (docRef: { path: string }) => {
      if (shouldThrowPermissionDenied) {
        const err = new Error('Missing or insufficient permissions.');
        (err as any).code = 'permission-denied';
        throw err;
      }
      const found = mockCloudStore.get(docRef.path);
      return {
        exists: () => Boolean(found),
        data: () => (found ? { ...found } : undefined),
      };
    },
    setDoc: async (docRef: { path: string }, data: Record<string, any>, _options?: any) => {
      if (shouldThrowPermissionDenied) {
        const err = new Error('Missing or insufficient permissions.');
        (err as any).code = 'permission-denied';
        throw err;
      }
      mockCloudStore.set(docRef.path, { ...mockCloudStore.get(docRef.path), ...data });
    },
    deleteDoc: async (docRef: { path: string }) => {
      if (shouldThrowPermissionDenied) {
        const err = new Error('Missing or insufficient permissions.');
        (err as any).code = 'permission-denied';
        throw err;
      }
      mockCloudStore.delete(docRef.path);
    },
    writeBatch: (_db: unknown) => {
      const ops: Array<() => void> = [];
      return {
        set: (docRef: { path: string }, data: Record<string, any>, _options?: any) => {
          ops.push(() =>
            mockCloudStore.set(docRef.path, { ...mockCloudStore.get(docRef.path), ...data })
          );
        },
        delete: (docRef: { path: string }) => {
          ops.push(() => mockCloudStore.delete(docRef.path));
        },
        commit: async () => {
          if (shouldThrowPermissionDenied) {
            const err = new Error('Missing or insufficient permissions.');
            (err as any).code = 'permission-denied';
            throw err;
          }
          ops.forEach((op) => op());
        },
      };
    },
  };
});

describe('Firebase Config, Firestore Repositories y Fusión Aditiva Local -> Cloud (#41)', () => {
  const fakeDb = {} as any;
  const uid = 'user-test-123';

  beforeEach(() => {
    mockCloudStore.clear();
    shouldThrowPermissionDenied = false;
  });

  describe('Configuración y traducción de errores Firebase', () => {
    it('detecta correctamente cuando VITE_FIREBASE_* no está configurado (fallback local)', () => {
      expect(isFirebaseConfigured({})).toBe(false);
      expect(getFirebaseEnvConfig({ VITE_FIREBASE_API_KEY: '   ' })).toBeNull();
    });

    it('construye la configuración cuando las variables mínimas están presentes', () => {
      const cfg = getFirebaseEnvConfig({
        VITE_FIREBASE_API_KEY: 'AIzaSyTest',
        VITE_FIREBASE_AUTH_DOMAIN: 'mibarcito.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'mibarcito-prod',
        VITE_FIREBASE_APP_ID: '1:123:web:abc',
      });
      expect(cfg).toEqual({
        apiKey: 'AIzaSyTest',
        authDomain: 'mibarcito.firebaseapp.com',
        projectId: 'mibarcito-prod',
        appId: '1:123:web:abc',
      });
      expect(isFirebaseConfigured({
        VITE_FIREBASE_API_KEY: 'AIzaSyTest',
        VITE_FIREBASE_AUTH_DOMAIN: 'mibarcito.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'mibarcito-prod',
      })).toBe(true);
    });

    it('traduce errores de cancelación de popup y permission-denied amablemente', () => {
      expect(traducirErrorFirebase({ code: 'auth/popup-closed-by-user' })).toContain(
        'Se cerró la ventana de inicio de sesión'
      );
      expect(traducirErrorFirebase({ code: 'permission-denied' })).toContain(
        'Acceso denegado por las reglas de seguridad de Firestore'
      );
    });

    it('sanitizeForFirestore elimina campos undefined recursivamente', () => {
      const limpio = sanitizeForFirestore({
        id: '1',
        nombre: 'Gin',
        subcategoria: undefined,
        nested: { a: 1, b: undefined },
      });
      expect(limpio).toEqual({
        id: '1',
        nombre: 'Gin',
        nested: { a: 1 },
      });
      expect('subcategoria' in limpio).toBe(false);
    });
  });

  describe('Adaptadores de Repositorio en Cloud Firestore (users/{uid}/...)', () => {
    it('persiste alta, edición y baja de bebidas en users/{uid}/bebidas y replica en fallback local', async () => {
      const localRepo = new InMemoryInventoryRepository();
      const cloudRepo = new FirestoreInventoryRepository(fakeDb, uid, localRepo);

      const botella: Bebida = {
        id: 'botella-campari',
        nombre: 'Campari',
        marca: 'Campari',
        categoria: 'aperitivo_bitter',
        subcategoria: 'Bitter Rojo',
        volumenTotalMl: 750,
        volumenRestanteMl: 600,
        graduacionAlcoholica: 28.5,
        fechaCreacion: '2026-11-01T10:00:00.000Z',
        fechaActualizacion: '2026-11-01T10:00:00.000Z',
      };

      await cloudRepo.save(botella);
      expect(mockCloudStore.has(`users/${uid}/bebidas/botella-campari`)).toBe(true);

      const obtenida = await cloudRepo.getById('botella-campari');
      expect(obtenida?.nombre).toBe('Campari');

      // También se replicó en el repositorio local de respaldo
      const enLocal = await localRepo.getById('botella-campari');
      expect(enLocal?.volumenRestanteMl).toBe(600);

      await cloudRepo.delete('botella-campari');
      expect(await cloudRepo.getById('botella-campari')).toBeUndefined();
    });

    it('siembra y gestiona categorías, recetas e insumos bajo users/{uid}/...', async () => {
      const catRepo = new FirestoreCategoriaRepository(fakeDb, uid);
      const recRepo = new FirestoreRecetaRepository(fakeDb, uid);
      const almRepo = new FirestoreAlmacenRepository(fakeDb, uid);

      await catRepo.seedDefaults();
      await recRepo.seedDefaults();
      await almRepo.seedDefaults();

      const categorias = await catRepo.getAll();
      const recetas = await recRepo.getAll();
      const insumos = await almRepo.getAll();

      expect(categorias.length).toBeGreaterThanOrEqual(8);
      expect(recetas.length).toBeGreaterThanOrEqual(10);
      expect(insumos.length).toBeGreaterThanOrEqual(11);

      const fav = await recRepo.toggleFavorito('receta-negroni');
      expect(fav?.esFavorito).toBe(true);

      const limon = await almRepo.toggleDisponible('insumo-limon');
      expect(limon?.disponible).toBe(true);
    });

    it('Caso de falla / borde 2: captura permission-denied sin colapsar y usa fallback local en lecturas', async () => {
      const localRepo = new InMemoryInventoryRepository();
      await localRepo.save({
        id: 'botella-local-segura',
        nombre: 'Fernet Branca',
        marca: 'Branca',
        categoria: 'aperitivo_bitter',
        volumenTotalMl: 750,
        volumenRestanteMl: 500,
        fechaCreacion: '2026-11-01T00:00:00.000Z',
        fechaActualizacion: '2026-11-01T00:00:00.000Z',
      });

      const erroresCapturados: unknown[] = [];
      const cloudRepo = new FirestoreInventoryRepository(
        fakeDb,
        uid,
        localRepo,
        (err) => erroresCapturados.push(err)
      );

      shouldThrowPermissionDenied = true;

      // Al fallar la lectura en Firestore por permisos, retorna las botellas locales sin perderlas
      const lista = await cloudRepo.getAll();
      expect(lista).toHaveLength(1);
      expect(lista[0].nombre).toBe('Fernet Branca');
      expect(erroresCapturados).toHaveLength(1);
    });
  });

  describe('Migración Aditiva Segura: Escenario Real del Celular del Usuario', () => {
    it('sube todas las botellas del celular a Firestore aunque la cuenta ya hubiera sido inicializada antes en una PC con 0 botellas', async () => {
      // 1. Simulamos que el usuario primero abrió la cuenta en su PC (sin botellas, pero con semillas en la nube)
      const pcCatRepo = new FirestoreCategoriaRepository(fakeDb, uid);
      const pcRecRepo = new FirestoreRecetaRepository(fakeDb, uid);
      const pcAlmRepo = new FirestoreAlmacenRepository(fakeDb, uid);
      await pcCatRepo.seedDefaults();
      await pcRecRepo.seedDefaults();
      await pcAlmRepo.seedDefaults();

      // Verificamos que en la nube hay 0 botellas pero sí semillas
      const cloudInvRepo = new FirestoreInventoryRepository(fakeDb, uid);
      expect(await cloudInvRepo.getAll()).toHaveLength(0);

      // 2. Ahora el usuario abre su CELULAR, donde ya tenía un montón de botellas guardadas en IndexedDB local
      const celularInventoryRepo = new InMemoryInventoryRepository();
      const celularCatRepo = new InMemoryCategoriaRepository();
      const celularRecetaRepo = new InMemoryRecetaRepository();
      const celularAlmacenRepo = new InMemoryAlmacenRepository();

      await celularCatRepo.seedDefaults();
      await celularRecetaRepo.seedDefaults();
      await celularAlmacenRepo.seedDefaults();

      const botellasDelCelular: Bebida[] = [
        {
          id: 'cel-botella-1',
          nombre: 'Gin Príncipe de los Apóstoles',
          marca: 'Apóstoles',
          categoria: 'destilado',
          subcategoria: 'Gin',
          volumenTotalMl: 700,
          volumenRestanteMl: 450,
          precioEstimado: 18500,
          esFavorito: true,
          fechaCreacion: '2026-10-15T12:00:00.000Z',
          fechaActualizacion: '2026-11-04T20:00:00.000Z',
        },
        {
          id: 'cel-botella-2',
          nombre: 'Vermut Carpano Rosso',
          marca: 'Carpano',
          categoria: 'aperitivo_bitter',
          subcategoria: 'Vermut Rosso',
          volumenTotalMl: 950,
          volumenRestanteMl: 800,
          precioEstimado: 9500,
          fechaCreacion: '2026-10-16T12:00:00.000Z',
          fechaActualizacion: '2026-11-04T21:00:00.000Z',
        },
        {
          id: 'cel-botella-3',
          nombre: 'Bourbon Jim Beam',
          marca: 'Jim Beam',
          categoria: 'destilado',
          subcategoria: 'Whisky',
          volumenTotalMl: 750,
          volumenRestanteMl: 300,
          precioEstimado: 32000,
          fechaCreacion: '2026-10-20T12:00:00.000Z',
          fechaActualizacion: '2026-11-04T22:00:00.000Z',
        },
      ];

      for (const b of botellasDelCelular) {
        await celularInventoryRepo.save(b);
      }

      // Además el usuario había marcado Negroni como favorito en su celular
      await celularRecetaRepo.toggleFavorito('receta-negroni');

      // 3. Se ejecuta la fusión aditiva al iniciar sesión en el celular
      const resultado = await mergeLocalInventoryToFirestore(fakeDb, uid, {
        inventoryRepo: celularInventoryRepo,
        categoriaRepo: celularCatRepo,
        recetaRepo: celularRecetaRepo,
        almacenRepo: celularAlmacenRepo,
      });

      expect(resultado.bebidasSubidas).toBe(3);

      // 4. Verificamos que en Firestore ahora están las 3 botellas del celular
      const botellasEnNube = await cloudInvRepo.getAll();
      expect(botellasEnNube).toHaveLength(3);
      expect(botellasEnNube.map((b) => b.nombre).sort()).toEqual([
        'Bourbon Jim Beam',
        'Gin Príncipe de los Apóstoles',
        'Vermut Carpano Rosso',
      ]);

      // 5. Verificamos que el almacenamiento local del celular NUNCA fue vaciado
      const resumenLocal = await inspectLocalInventory({
        inventoryRepo: celularInventoryRepo,
        categoriaRepo: celularCatRepo,
        recetaRepo: celularRecetaRepo,
        almacenRepo: celularAlmacenRepo,
      });
      expect(resumenLocal.bebidasCount).toBe(3);

      // 6. Y que el favorito del Negroni también se preservó en la nube
      const negroniEnNube = await pcRecRepo.getById('receta-negroni');
      expect(negroniEnNube?.esFavorito).toBe(true);
    });

    it('exporta e importa un archivo JSON de respaldo completo sin perder datos', async () => {
      const invRepo = new InMemoryInventoryRepository();
      const catRepo = new InMemoryCategoriaRepository();
      const recRepo = new InMemoryRecetaRepository();
      const almRepo = new InMemoryAlmacenRepository();

      await invRepo.save({
        id: 'backup-botella-1',
        nombre: 'Tequila José Cuervo',
        marca: 'José Cuervo',
        categoria: 'destilado',
        volumenTotalMl: 750,
        volumenRestanteMl: 750,
        fechaCreacion: '2026-11-05T00:00:00.000Z',
        fechaActualizacion: '2026-11-05T00:00:00.000Z',
      });

      const payload = await exportBackupPayload({
        inventoryRepo: invRepo,
        categoriaRepo: catRepo,
        recetaRepo: recRepo,
        almacenRepo: almRepo,
      });

      expect(payload.version).toBe(1);
      expect(payload.bebidas).toHaveLength(1);

      // Importamos en un repositorio limpio
      const destinoInvRepo = new InMemoryInventoryRepository();
      const res = await importBackupPayload(payload, {
        inventoryRepo: destinoInvRepo,
        categoriaRepo: catRepo,
        recetaRepo: recRepo,
        almacenRepo: almRepo,
      });

      expect(res.bebidasImportadas).toBe(1);
      expect((await destinoInvRepo.getById('backup-botella-1'))?.nombre).toBe(
        'Tequila José Cuervo'
      );
    });
  });
});

