import { InsumoAlmacen } from '../models/insumo-almacen';

export interface IAlmacenRepository {
  getAll(): Promise<InsumoAlmacen[]>;
  getById(id: string): Promise<InsumoAlmacen | undefined>;
  save(insumo: InsumoAlmacen): Promise<void>;
  delete(id: string): Promise<void>;
  toggleDisponible(id: string): Promise<InsumoAlmacen | undefined>;
  clear(): Promise<void>;
  seedDefaults(): Promise<void>;
}

