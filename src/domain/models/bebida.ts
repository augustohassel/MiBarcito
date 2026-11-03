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

export const CATEGORIAS_BEBIDA: { value: CategoriaBebida; label: string }[] = [
  { value: 'destilado', label: 'Destilado' },
  { value: 'licor', label: 'Licor' },
  { value: 'vino', label: 'Vino' },
  { value: 'cerveza', label: 'Cerveza' },
  { value: 'aperitivo_bitter', label: 'Aperitivo / Bitter' },
  { value: 'mixer_sin_alcohol', label: 'Mixer sin Alcohol' },
  { value: 'syrup_endulzante', label: 'Syrup / Endulzante' },
  { value: 'otro', label: 'Otro' },
];

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
  esFavorito?: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Errores de validación de una bebida por campo
 */
export type ErroresValidacionBebida = Partial<Record<keyof Bebida | 'general', string>>;

/**
 * Función pura para validar datos de una bebida.
 * Previene inconsistencias, volúmenes incoherentes y graduación fuera de rango.
 */
export function validarBebida(datos: Partial<Bebida>): ErroresValidacionBebida {
  const errores: ErroresValidacionBebida = {};

  // Validaciones obligatorias de texto
  if (!datos.nombre || datos.nombre.trim().length === 0) {
    errores.nombre = 'El nombre de la bebida es obligatorio';
  }

  if (!datos.marca || datos.marca.trim().length === 0) {
    errores.marca = 'La marca es obligatoria';
  }

  if (!datos.categoria || !CATEGORIAS_BEBIDA.some((c) => c.value === datos.categoria)) {
    errores.categoria = 'Debe seleccionar una categoría válida';
  }

  // Volumen total
  if (datos.volumenTotalMl === undefined || datos.volumenTotalMl === null || Number.isNaN(datos.volumenTotalMl)) {
    errores.volumenTotalMl = 'El volumen total es obligatorio';
  } else if (datos.volumenTotalMl <= 0) {
    errores.volumenTotalMl = 'El volumen total debe ser mayor a 0 ml';
  }

  // Volumen restante
  if (datos.volumenRestanteMl === undefined || datos.volumenRestanteMl === null || Number.isNaN(datos.volumenRestanteMl)) {
    errores.volumenRestanteMl = 'El volumen restante es obligatorio';
  } else if (datos.volumenRestanteMl < 0) {
    errores.volumenRestanteMl = 'El volumen restante no puede ser negativo';
  } else if (
    datos.volumenTotalMl !== undefined &&
    datos.volumenTotalMl > 0 &&
    datos.volumenRestanteMl > datos.volumenTotalMl
  ) {
    errores.volumenRestanteMl = 'El volumen restante no puede superar el volumen total';
  }

  // Graduación alcohólica (opcional pero con rango estricto 0 - 100%)
  if (datos.graduacionAlcoholica !== undefined && datos.graduacionAlcoholica !== null && !Number.isNaN(datos.graduacionAlcoholica)) {
    if (datos.graduacionAlcoholica < 0 || datos.graduacionAlcoholica > 100) {
      errores.graduacionAlcoholica = 'La graduación alcohólica debe ubicarse entre 0% y 100%';
    }
  }

  // Precio estimado (opcional)
  if (datos.precioEstimado !== undefined && datos.precioEstimado !== null && !Number.isNaN(datos.precioEstimado)) {
    if (datos.precioEstimado < 0) {
      errores.precioEstimado = 'El precio estimado no puede ser negativo';
    }
  }

  // Stock mínimo (opcional)
  if (datos.stockMinimoMl !== undefined && datos.stockMinimoMl !== null && !Number.isNaN(datos.stockMinimoMl)) {
    if (datos.stockMinimoMl < 0) {
      errores.stockMinimoMl = 'El stock mínimo no puede ser negativo';
    }
  }

  return errores;
}

/**
 * Función de utilidad para ajustar rápidamente el volumen restante dentro de límites [0, volumenTotalMl]
 */
export function ajustarVolumenRapido(
  volumenActual: number,
  volumenTotal: number,
  deltaMl: number
): number {
  const nuevoVolumen = volumenActual + deltaMl;
  return Math.min(volumenTotal, Math.max(0, nuevoVolumen));
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

