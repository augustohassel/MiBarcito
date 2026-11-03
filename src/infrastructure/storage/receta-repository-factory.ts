import { IRecetaRepository } from '../../domain/repositories/receta-repository.interface';
import { InMemoryRecetaRepository } from './in-memory-receta-repository';
import { IndexedDBRecetaRepository } from './indexeddb-receta-repository';

/**
 * Crea la instancia adecuada de IRecetaRepository según el entorno.
 * Si IndexedDB está disponible en el navegador, utiliza la implementación persistente.
 * En caso contrario (SSR o entorno sin indexedDB), usa la implementación en memoria como fallback seguro.
 */
export function createRecetaRepository(): IRecetaRepository {
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDBRecetaRepository();
  }
  return new InMemoryRecetaRepository();
}

