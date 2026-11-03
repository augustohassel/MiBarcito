import { Receta } from '../models/receta';

/**
 * Contrato de persistencia para el catálogo y recetas de autor (Issue #5).
 */
export interface IRecetaRepository {
  /**
   * Obtiene todas las recetas almacenadas (predeterminadas y del usuario)
   */
  getAll(): Promise<Receta[]>;

  /**
   * Obtiene una receta por su identificador único
   */
  getById(id: string): Promise<Receta | undefined>;

  /**
   * Guarda o actualiza una receta
   */
  save(receta: Receta): Promise<void>;

  /**
   * Elimina una receta por su identificador (solo recetas de autor)
   */
  delete(id: string): Promise<void>;

  /**
   * Alterna el estado de favorito de una receta
   */
  toggleFavorito(id: string): Promise<Receta | undefined>;

  /**
   * Siembra las recetas predeterminadas del catálogo si el store está vacío
   */
  seedDefaults(): Promise<void>;

  /**
   * Limpia todas las recetas (útil en testing o reseteo de entorno)
   */
  clear(): Promise<void>;
}

