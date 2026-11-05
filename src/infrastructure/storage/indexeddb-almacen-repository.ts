import { InsumoAlmacen, INSUMOS_PREDETERMINADOS } from '../../domain/models/insumo-almacen';
import { IAlmacenRepository } from '../../domain/repositories/almacen-repository.interface';
import { getAlmacenDatabase, STORE_ALMACEN } from './indexeddb-database';

export class IndexedDBAlmacenRepository implements IAlmacenRepository {
  async getAll(): Promise<InsumoAlmacen[]> {
    const db = await getAlmacenDatabase();
    const items = await db.getAll(STORE_ALMACEN);
    return items.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async getById(id: string): Promise<InsumoAlmacen | undefined> {
    const db = await getAlmacenDatabase();
    return db.get(STORE_ALMACEN, id);
  }

  async save(insumo: InsumoAlmacen): Promise<void> {
    const db = await getAlmacenDatabase();
    await db.put(STORE_ALMACEN, insumo);
  }

  async delete(id: string): Promise<void> {
    const db = await getAlmacenDatabase();
    await db.delete(STORE_ALMACEN, id);
  }

  async toggleDisponible(id: string): Promise<InsumoAlmacen | undefined> {
    const db = await getAlmacenDatabase();
    let item = await db.get(STORE_ALMACEN, id);
    if (!item) {
      item = INSUMOS_PREDETERMINADOS.find((ins) => ins.id === id);
      if (!item) return undefined;
    }
    const updated: InsumoAlmacen = {
      ...item,
      disponible: !item.disponible,
      fechaActualizacion: new Date().toISOString(),
    };
    await db.put(STORE_ALMACEN, updated);
    return updated;
  }

  async clear(): Promise<void> {
    const db = await getAlmacenDatabase();
    await db.clear(STORE_ALMACEN);
  }

  async seedDefaults(): Promise<void> {
    const db = await getAlmacenDatabase();
    const count = await db.count(STORE_ALMACEN);
    if (count === 0) {
      const tx = db.transaction(STORE_ALMACEN, 'readwrite');
      for (const ins of INSUMOS_PREDETERMINADOS) {
        await tx.store.put(ins);
      }
      await tx.done;
    }
  }
}
