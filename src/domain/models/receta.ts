/**
 * Ingrediente requerido para la preparación de un cóctel
 */
export interface IngredienteReceta {
  nombre: string;
  cantidadMl?: number;
  unidad: string;
  opcional?: boolean;
}

/**
 * Entidad de dominio: Trago / Cóctel (Receta)
 * Referencia: docs/glosario.md - Trago / Cóctel (Receta)
 */
export interface Receta {
  id: string;
  nombre: string;
  descripcion: string;
  ingredientes: IngredienteReceta[];
  cristaleria: string;
  metodo: 'batido' | 'refrescado' | 'directo' | 'licuado' | 'otro';
  pasos: string[];
  tiempoMinutos?: number;
}

