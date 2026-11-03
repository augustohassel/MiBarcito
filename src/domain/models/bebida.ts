/**
 * Categorías principales de bebidas según el dominio de MiBarcito
 */
export type CategoriaBebida =
  | 'destilado'
  | 'licor'
  | 'vino'
  | 'cerveza'
  | 'aperitivo_bitter'
  | 'mixer_sin_alcohol'
  | 'syrup_endulzante'
  | 'otro';

/**
 * Entidad de dominio: Bebida (Ítem de Inventario)
 * Referencia: docs/glosario.md - Bebida (Ítem de Inventario)
 */
export interface Bebida {
  id: string;
  nombre: string;
  marca: string;
  categoria: CategoriaBebida;
  volumenTotalMl: number;
  volumenRestanteMl: number;
  graduacionAlcoholica?: number;
  precioEstimado?: number;
  stockMinimoMl?: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Función de utilidad de dominio para verificar si una bebida está en alerta de stock bajo
 */
export function estaEnAlertaStockBajo(bebida: Bebida): boolean {
  if (bebida.stockMinimoMl === undefined || bebida.stockMinimoMl <= 0) {
    return false;
  }
  return bebida.volumenRestanteMl <= bebida.stockMinimoMl;
}

/**
 * Función de utilidad de dominio para calcular porcentaje restante
 */
export function calcularPorcentajeRestante(bebida: Bebida): number {
  if (bebida.volumenTotalMl <= 0) return 0;
  const porcentaje = (bebida.volumenRestanteMl / bebida.volumenTotalMl) * 100;
  return Math.min(100, Math.max(0, Math.round(porcentaje)));
}

