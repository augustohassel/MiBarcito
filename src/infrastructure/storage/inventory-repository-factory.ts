import { IInventoryRepository } from '../../domain/repositories/inventory-repository.interface';
import { IndexedDBInventoryRepository } from './indexeddb-inventory-repository';
import { InMemoryInventoryRepository } from './in-memory-inventory-repository';

/**
 * Crea una instancia de repositorio de inventario con mecanismo de contingencia.
 * Si IndexedDB está disponible y operable, utiliza IndexedDBInventoryRepository.
 * Si IndexedDB falla (modo incógnito estricto, cuota restringida, etc.), retorna InMemoryInventoryRepository.
 */
export function createInventoryRepository(): IInventoryRepository {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return new InMemoryInventoryRepository();
  }

  try {
    return new IndexedDBInventoryRepository();
  } catch (err) {
    console.warn(
      'No se pudo inicializar IndexedDB. Se utilizará InMemoryInventoryRepository como contingencia.',
      err
    );
    return new InMemoryInventoryRepository();
  }
}

