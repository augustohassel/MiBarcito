import { InsumoAlmacen, INSUMOS_PREDETERMINADOS } from '../../domain/models/insumo-almacen';
import { IAlmacenRepository } from '../../domain/repositories/almacen-repository.interface';

export class InMemoryAlmacenRepository implements IAlmacenRepository {
  private items: Map<string, InsumoAlmacen> = new Map();

  constructor(initialItems?: InsumoAlmacen[]) {
    if (initialItems && initialItems.length > 0) {
      for (const item of initialItems) {
        this.items.set(item.id, { ...item });
      }
    } else {
      for (const ins of INSUMOS_PREDETERMINADOS) {
        this.items.set(ins.id, { ...ins });
      }
    }
  }

  async getAll(): Promise<InsumoAlmacen[]> {
    const list = Array.from(this.items.values()).map((i) => ({ ...i }));
    return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async getById(id: string): Promise<InsumoAlmacen | undefined> {
    const item = this.items.get(id);
    return item ? { ...item } : undefined;
  }

  async save(insumo: InsumoAlmacen): Promise<void> {
    this.items.set(insumo.id, { ...insumo });
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async toggleDisponible(id: string): Promise<InsumoAlmacen | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    const updated: InsumoAlmacen = {
      ...item,
      disponible: !item.disponible,
      fechaActualizacion: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return { ...updated };
  }

  async clear(): Promise<void> {
    this.items.clear();
  }

  async seedDefaults(): Promise<void> {
    if (this.items.size === 0) {
      for (const ins of INSUMOS_PREDETERMINADOS) {
        this.items.set(ins.id, { ...ins });
      }
    }
  }
}

