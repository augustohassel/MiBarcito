import { Bebida } from '../../domain/models/bebida';
import { IInventoryRepository } from '../../domain/repositories/inventory-repository.interface';
import { getDatabase, STORE_BEBIDAS } from './indexeddb-database';

/**
 * Implementación de IInventoryRepository respaldada por IndexedDB mediante la biblioteca idb.
 * Almacena los ítems de inventario localmente en el dispositivo para operación offline.
 */
export class IndexedDBInventoryRepository implements IInventoryRepository {
  async getAll(): Promise<Bebida[]> {
    const db = await getDatabase();
    return db.getAll(STORE_BEBIDAS);
  }

  async getById(id: string): Promise<Bebida | undefined> {
    const db = await getDatabase();
    return db.get(STORE_BEBIDAS, id);
  }

  async save(bebida: Bebida): Promise<void> {
    const db = await getDatabase();
    await db.put(STORE_BEBIDAS, bebida);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete(STORE_BEBIDAS, id);
  }

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.clear(STORE_BEBIDAS);
  }
}
