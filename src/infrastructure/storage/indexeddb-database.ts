import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Bebida } from '../../domain/models/bebida';
import { Categoria, CATEGORIAS_PREDETERMINADAS } from '../../domain/models/categoria';

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
}

export const DB_NAME = 'mibarcito_db';
export const DB_VERSION = 2;
export const STORE_BEBIDAS = 'bebidas';
export const STORE_CATEGORIAS = 'categorias';

let dbPromise: Promise<IDBPDatabase<MiBarcitoDB>> | null = null;

/**
 * Obtiene la conexión centralizada a IndexedDB (v2).
 * Maneja la creación y migración segura de ObjectStores y el seeding inicial.
 */
export function getDatabase(): Promise<IDBPDatabase<MiBarcitoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MiBarcitoDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
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
      },
    });
  }
  return dbPromise;
}

/**
 * Resetea la promesa de conexión para aislar tests si es necesario.
 */
export function resetDatabasePromiseForTests(): void {
  dbPromise = null;
}

