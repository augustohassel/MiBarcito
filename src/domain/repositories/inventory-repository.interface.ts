import { Bebida } from '../models/bebida';

/**
 * Contrato de repositorio desacoplado para la gestión de inventario de bebidas.
 * Permite cambiar la infraestructura (IndexedDB local vs API REST en GCP)
 * sin modificar la lógica de negocio ni los componentes de la interfaz.
 */
export interface IInventoryRepository {
  /**
   * Obtiene todas las bebidas registradas en la despensa
   */
  getAll(): Promise<Bebida[]>;

  /**
   * Busca una bebida por su identificador único
   */
  getById(id: string): Promise<Bebida | undefined>;

  /**
   * Guarda o actualiza una bebida en el inventario
   */
  save(bebida: Bebida): Promise<void>;

  /**
   * Elimina una bebida del inventario por su ID
   */
  delete(id: string): Promise<void>;

  /**
   * Limpia todo el inventario (útil para pruebas o reinicio)
   */
  clear(): Promise<void>;
}

