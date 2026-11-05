import {
  Receta,
  RECETAS_PREDETERMINADAS,
  enriquecerRecetaPredeterminada,
} from '../../domain/models/receta';
import { IRecetaRepository } from '../../domain/repositories/receta-repository.interface';

/**
 * Implementación en memoria del repositorio de recetas.
 * Utilizado como fallback en entornos sin IndexedDB o para pruebas unitarias.
 */
export class InMemoryRecetaRepository implements IRecetaRepository {
  private items: Map<string, Receta> = new Map();

  constructor(initialItems?: Receta[]) {
    if (initialItems && initialItems.length > 0) {
      for (const item of initialItems) {
        this.items.set(item.id, enriquecerRecetaPredeterminada({ ...item }));
      }
    } else {
      for (const rec of RECETAS_PREDETERMINADAS) {
        this.items.set(rec.id, { ...rec });
      }
    }
  }

  async getAll(): Promise<Receta[]> {
    const list = Array.from(this.items.values()).map((r) => enriquecerRecetaPredeterminada(r));
    return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async getById(id: string): Promise<Receta | undefined> {
    const item = this.items.get(id);
    return item ? enriquecerRecetaPredeterminada({ ...item }) : undefined;
  }

  async save(receta: Receta): Promise<void> {
    this.items.set(receta.id, { ...receta });
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async toggleFavorito(id: string): Promise<Receta | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    const updated: Receta = {
      ...item,
      esFavorito: !item.esFavorito,
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
      for (const rec of RECETAS_PREDETERMINADAS) {
        this.items.set(rec.id, { ...rec });
      }
    }
  }
}

