import { IAlmacenRepository } from '../../domain/repositories/almacen-repository.interface';
import { InMemoryAlmacenRepository } from './in-memory-almacen-repository';
import { IndexedDBAlmacenRepository } from './indexeddb-almacen-repository';

export function createAlmacenRepository(): IAlmacenRepository {
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDBAlmacenRepository();
  }
  return new InMemoryAlmacenRepository();
}

