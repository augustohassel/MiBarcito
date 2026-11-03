import { Receta, RECETAS_PREDETERMINADAS } from '../../domain/models/receta';
import { IRecetaRepository } from '../../domain/repositories/receta-repository.interface';
import { getDatabase, STORE_RECETAS } from './indexeddb-database';

/**
 * Implementación de IRecetaRepository respaldada por IndexedDB mediante la biblioteca idb.
 */
export class IndexedDBRecetaRepository implements IRecetaRepository {
  async getAll(): Promise<Receta[]> {
    const db = await getDatabase();
    const recetas = await db.getAll(STORE_RECETAS);
    return recetas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async getById(id: string): Promise<Receta | undefined> {
    const db = await getDatabase();
    return db.get(STORE_RECETAS, id);
  }

  async save(receta: Receta): Promise<void> {
    const db = await getDatabase();
    await db.put(STORE_RECETAS, receta);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete(STORE_RECETAS, id);
  }

  async toggleFavorito(id: string): Promise<Receta | undefined> {
    const db = await getDatabase();
    const receta = await db.get(STORE_RECETAS, id);
    if (!receta) return undefined;
    const updated: Receta = {
      ...receta,
      esFavorito: !receta.esFavorito,
      fechaActualizacion: new Date().toISOString(),
    };
    await db.put(STORE_RECETAS, updated);
    return updated;
  }

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.clear(STORE_RECETAS);
  }

  async seedDefaults(): Promise<void> {
    const db = await getDatabase();
    const count = await db.count(STORE_RECETAS);
    if (count === 0) {
      const tx = db.transaction(STORE_RECETAS, 'readwrite');
      for (const rec of RECETAS_PREDETERMINADAS) {
        await tx.store.put(rec);
      }
      await tx.done;
    }
  }
}

