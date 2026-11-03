import { Categoria, CATEGORIAS_PREDETERMINADAS } from '../../domain/models/categoria';
import { ICategoriaRepository } from '../../domain/repositories/categoria-repository.interface';
import { getDatabase, STORE_CATEGORIAS } from './indexeddb-database';

/**
 * Implementación de ICategoriaRepository respaldada por IndexedDB mediante la biblioteca idb.
 */
export class IndexedDBCategoriaRepository implements ICategoriaRepository {
  async getAll(): Promise<Categoria[]> {
    const db = await getDatabase();
    const categorias = await db.getAll(STORE_CATEGORIAS);
    return categorias.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  }

  async getById(id: string): Promise<Categoria | undefined> {
    const db = await getDatabase();
    return db.get(STORE_CATEGORIAS, id);
  }

  async save(categoria: Categoria): Promise<void> {
    const db = await getDatabase();
    await db.put(STORE_CATEGORIAS, categoria);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete(STORE_CATEGORIAS, id);
  }

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.clear(STORE_CATEGORIAS);
  }

  async seedDefaults(): Promise<void> {
    const db = await getDatabase();
    const count = await db.count(STORE_CATEGORIAS);
    if (count === 0) {
      const tx = db.transaction(STORE_CATEGORIAS, 'readwrite');
      for (const cat of CATEGORIAS_PREDETERMINADAS) {
        await tx.store.put(cat);
      }
      await tx.done;
    }
  }
}

