import { ICategoriaRepository } from '../../domain/repositories/categoria-repository.interface';
import { IndexedDBCategoriaRepository } from './indexeddb-categoria-repository';
import { InMemoryCategoriaRepository } from './in-memory-categoria-repository';

/**
 * Crea una instancia de repositorio de categorías con fallback de contingencia.
 * Si IndexedDB está disponible, utiliza IndexedDBCategoriaRepository.
 * Si IndexedDB no está disponible o falla, retorna InMemoryCategoriaRepository.
 */
export function createCategoriaRepository(): ICategoriaRepository {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return new InMemoryCategoriaRepository();
  }

  try {
    return new IndexedDBCategoriaRepository();
  } catch (err) {
    console.warn(
      'No se pudo inicializar IndexedDB para categorías. Se utilizará InMemoryCategoriaRepository como contingencia.',
      err
    );
    return new InMemoryCategoriaRepository();
  }
}

