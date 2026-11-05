import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Bebida } from '../../domain/models/bebida';
import { Categoria, CATEGORIAS_PREDETERMINADAS } from '../../domain/models/categoria';
import { Receta, RECETAS_PREDETERMINADAS } from '../../domain/models/receta';
import { InsumoAlmacen, INSUMOS_PREDETERMINADOS } from '../../domain/models/insumo-almacen';

export interface MiBarcitoDB extends DBSchema {
  bebidas: {
    key: string;
    value: Bebida;
    indexes: {
      'by-categoria': string;
      'by-nombre': string;
    };
  };
  categorias: {
    key: string;
    value: Categoria;
    indexes: {
      'by-nombre': string;
      'by-orden': number;
    };
  };
  recetas: {
    key: string;
    value: Receta;
    indexes: {
      'by-nombre': string;
      'by-propia': string;
      'by-favorito': string;
    };
  };
  almacen: {
    key: string;
    value: InsumoAlmacen;
    indexes: {
      'by-categoria': string;
      'by-nombre': string;
    };
  };
}

export interface MiBarcitoAlmacenDB extends DBSchema {
  almacen: {
    key: string;
    value: InsumoAlmacen;
    indexes: {
      'by-categoria': string;
      'by-nombre': string;
    };
  };
}

export const DB_NAME = 'mibarcito_db';
export const DB_VERSION = 3;
export const ALMACEN_DB_NAME = 'mibarcito_almacen_db';
export const ALMACEN_DB_VERSION = 1;

export const STORE_BEBIDAS = 'bebidas';
export const STORE_CATEGORIAS = 'categorias';
export const STORE_RECETAS = 'recetas';
export const STORE_ALMACEN = 'almacen';

let dbPromise: Promise<IDBPDatabase<MiBarcitoDB>> | null = null;
let almacenDbPromise: Promise<IDBPDatabase<MiBarcitoAlmacenDB>> | null = null;

function aplicarUpgradePrincipal(
  db: IDBPDatabase<MiBarcitoDB>,
  transaction: any
): void {
  // v1: Store de bebidas
  if (!db.objectStoreNames.contains(STORE_BEBIDAS)) {
    const storeBebidas = db.createObjectStore(STORE_BEBIDAS, { keyPath: 'id' });
    storeBebidas.createIndex('by-categoria', 'categoria');
    storeBebidas.createIndex('by-nombre', 'nombre');
  }

  // v2: Store de categorías y siembra de categorías predeterminadas
  if (!db.objectStoreNames.contains(STORE_CATEGORIAS)) {
    const storeCategorias = db.createObjectStore(STORE_CATEGORIAS, { keyPath: 'id' });
    storeCategorias.createIndex('by-nombre', 'nombre');
    storeCategorias.createIndex('by-orden', 'orden');

    const catStore = transaction.objectStore(STORE_CATEGORIAS);
    for (const cat of CATEGORIAS_PREDETERMINADAS) {
      catStore.put(cat);
    }
  }

  // v3: Store de recetas y siembra de recetas predeterminadas
  if (!db.objectStoreNames.contains(STORE_RECETAS)) {
    const storeRecetas = db.createObjectStore(STORE_RECETAS, { keyPath: 'id' });
    storeRecetas.createIndex('by-nombre', 'nombre');
    storeRecetas.createIndex('by-propia', 'esPropia');
    storeRecetas.createIndex('by-favorito', 'esFavorito');

    const recStore = transaction.objectStore(STORE_RECETAS);
    for (const rec of RECETAS_PREDETERMINADAS) {
      recStore.put(rec);
    }
  }
}

async function abrirBasePrincipalConFallback(): Promise<IDBPDatabase<MiBarcitoDB>> {
  let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    watchdogTimer = setTimeout(() => {
      const reloadKey = 'mibarcito_idb_unblock_reload';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    }, 1200);
  }

  const limpiarWatchdog = () => {
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('mibarcito_idb_unblock_reload');
    }
  };

  try {
    const db = await openDB<MiBarcitoDB>(DB_NAME, DB_VERSION, {
      upgrade(dbInstance, _oldVersion, _newVersion, transaction) {
        aplicarUpgradePrincipal(dbInstance, transaction);
      },
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase | null)?.close();
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      },
    });
    limpiarWatchdog();
    return db;
  } catch (err: any) {
    // Si el navegador ya había migrado a v4 previamente, abrimos en v4 sin degradar versión
    if (err?.name === 'VersionError') {
      const dbV4 = await openDB<MiBarcitoDB>(DB_NAME, 4, {
        upgrade(dbInstance, _oldVersion, _newVersion, transaction) {
          aplicarUpgradePrincipal(dbInstance, transaction);
        },
        blocking(_currentVersion, _blockedVersion, event) {
          (event.target as IDBDatabase | null)?.close();
          dbPromise = null;
        },
        terminated() {
          dbPromise = null;
        },
      });
      limpiarWatchdog();
      return dbV4;
    }
    limpiarWatchdog();
    throw err;
  }
}

/**
 * Obtiene la conexión centralizada a IndexedDB para Bebidas, Categorías y Recetas.
 */
export function getDatabase(): Promise<IDBPDatabase<MiBarcitoDB>> {
  if (!dbPromise) {
    dbPromise = abrirBasePrincipalConFallback().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/**
 * Obtiene la conexión dedicada a IndexedDB para el Almacén de Insumos y Guarniciones.
 * Al usar una base independiente no bloquea ni requiere upgrade de versión sobre `mibarcito_db`.
 */
export function getAlmacenDatabase(): Promise<IDBPDatabase<MiBarcitoAlmacenDB>> {
  if (!almacenDbPromise) {
    almacenDbPromise = openDB<MiBarcitoAlmacenDB>(ALMACEN_DB_NAME, ALMACEN_DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains(STORE_ALMACEN)) {
          const storeAlmacen = db.createObjectStore(STORE_ALMACEN, { keyPath: 'id' });
          storeAlmacen.createIndex('by-categoria', 'categoria');
          storeAlmacen.createIndex('by-nombre', 'nombre');

          const almStore = transaction.objectStore(STORE_ALMACEN);
          for (const ins of INSUMOS_PREDETERMINADOS) {
            almStore.put(ins);
          }
        }
      },
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase | null)?.close();
        almacenDbPromise = null;
      },
      terminated() {
        almacenDbPromise = null;
      },
    }).catch((err) => {
      almacenDbPromise = null;
      throw err;
    });
  }
  return almacenDbPromise;
}

/**
 * Resetea las promesas de conexión para aislar tests si es necesario.
 */
export function resetDatabasePromiseForTests(): void {
  dbPromise = null;
  almacenDbPromise = null;
}
