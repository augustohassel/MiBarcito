import { Categoria } from '../models/categoria';

/**
 * Contrato de repositorio desacoplado para la gestión de categorías de bebidas.
 * Permite persistir y consultar las categorías en IndexedDB local o memoria sin acoplar componentes.
 */
export interface ICategoriaRepository {
  /**
   * Obtiene todas las categorías ordenadas
   */
  getAll(): Promise<Categoria[]>;

  /**
   * Obtiene una categoría por su ID
   */
  getById(id: string): Promise<Categoria | undefined>;

  /**
   * Guarda o actualiza una categoría
   */
  save(categoria: Categoria): Promise<void>;

  /**
   * Elimina una categoría por su ID
   */
  delete(id: string): Promise<void>;

  /**
   * Siembra las categorías predeterminadas si el repositorio está vacío
   */
  seedDefaults(): Promise<void>;

  /**
   * Limpia todas las categorías (útil para tests)
   */
  clear(): Promise<void>;
}

