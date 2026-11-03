import { Bebida } from '../../domain/models/bebida';
import { IInventoryRepository } from '../../domain/repositories/inventory-repository.interface';

/**
 * Implementación en memoria del repositorio de inventario.
 * Se utiliza como fallback / contingencia cuando IndexedDB no está disponible
 * (por ejemplo: navegación privada estricta, cuota bloqueada o entornos de test).
 */
export class InMemoryInventoryRepository implements IInventoryRepository {
  private items: Map<string, Bebida> = new Map();

  constructor(initialItems: Bebida[] = []) {
    for (const item of initialItems) {
      this.items.set(item.id, { ...item });
    }
  }

  async getAll(): Promise<Bebida[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<Bebida | undefined> {
    const item = this.items.get(id);
    return item ? { ...item } : undefined;
  }

  async save(bebida: Bebida): Promise<void> {
    this.items.set(bebida.id, { ...bebida });
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }
}

