import { Categoria, CATEGORIAS_PREDETERMINADAS } from '../../domain/models/categoria';
import { ICategoriaRepository } from '../../domain/repositories/categoria-repository.interface';

/**
 * Implementación en memoria del repositorio de categorías.
 * Utilizado como fallback en entornos sin IndexedDB o para pruebas unitarias.
 */
export class InMemoryCategoriaRepository implements ICategoriaRepository {
  private items: Map<string, Categoria> = new Map();

  constructor(initialItems?: Categoria[]) {
    if (initialItems && initialItems.length > 0) {
      for (const item of initialItems) {
        this.items.set(item.id, { ...item });
      }
    } else {
      // Siembra automática de las categorías predeterminadas
      for (const cat of CATEGORIAS_PREDETERMINADAS) {
        this.items.set(cat.id, { ...cat });
      }
    }
  }

  async getAll(): Promise<Categoria[]> {
    const list = Array.from(this.items.values()).map((cat) => {
      if (Array.isArray(cat.subcategorias)) return { ...cat };
      const predeterminada = CATEGORIAS_PREDETERMINADAS.find((p) => p.id === cat.id);
      return {
        ...cat,
        subcategorias: predeterminada?.subcategorias ? [...predeterminada.subcategorias] : [],
      };
    });
    return list.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  }

  async getById(id: string): Promise<Categoria | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    if (!Array.isArray(item.subcategorias)) {
      const predeterminada = CATEGORIAS_PREDETERMINADAS.find((p) => p.id === item.id);
      return {
        ...item,
        subcategorias: predeterminada?.subcategorias ? [...predeterminada.subcategorias] : [],
      };
    }
    return { ...item };
  }

  async save(categoria: Categoria): Promise<void> {
    this.items.set(categoria.id, { ...categoria });
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }

  async seedDefaults(): Promise<void> {
    if (this.items.size === 0) {
      for (const cat of CATEGORIAS_PREDETERMINADAS) {
        this.items.set(cat.id, { ...cat });
      }
    }
  }
}

