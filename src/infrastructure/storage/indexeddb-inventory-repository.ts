import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Bebida } from '../../domain/models/bebida';
import { IInventoryRepository } from '../../domain/repositories/inventory-repository.interface';

export interface MiBarcitoDB extends DBSchema {
  bebidas: {
    key: string;
    value: Bebida;
    indexes: {
      'by-categoria': string;
      'by-nombre': string;
    };
  };
}

const DB_NAME = 'mibarcito_db';
const DB_VERSION = 1;
const STORE_BEBIDAS = 'bebidas';

/**
 * Implementación de IInventoryRepository respaldada por IndexedDB mediante la biblioteca idb.
 * Almacena los ítems de inventario localmente en el dispositivo para operación offline.
 */
export class IndexedDBInventoryRepository implements IInventoryRepository {
  private dbPromise: Promise<IDBPDatabase<MiBarcitoDB>> | null = null;

  private async getDB(): Promise<IDBPDatabase<MiBarcitoDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<MiBarcitoDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_BEBIDAS)) {
            const store = db.createObjectStore(STORE_BEBIDAS, { keyPath: 'id' });
            store.createIndex('by-categoria', 'categoria');
            store.createIndex('by-nombre', 'nombre');
          }
        },
      });
    }
    return this.dbPromise;
  }

  async getAll(): Promise<Bebida[]> {
    const db = await this.getDB();
    return db.getAll(STORE_BEBIDAS);
  }

  async getById(id: string): Promise<Bebida | undefined> {
    const db = await this.getDB();
    return db.get(STORE_BEBIDAS, id);
  }

  async save(bebida: Bebida): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_BEBIDAS, bebida);
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(STORE_BEBIDAS, id);
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    await db.clear(STORE_BEBIDAS);
  }
}

