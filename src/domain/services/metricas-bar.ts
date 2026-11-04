import { Bebida, estaEnAlertaStockBajo, calcularPorcentajeRestante } from '../models/bebida';
import { Categoria, CATEGORIA_COMODIN_ID, CATEGORIAS_PREDETERMINADAS } from '../models/categoria';

/**
 * Representa la distribución económica de una categoría en la despensa
 */
export interface MetricaDistribucionCategoria {
  categoriaId: string;
  categoriaNombre: string;
  totalCosto: number;
  porcentaje: number; // 0 - 100
  cantidadBotellas: number;
}

/**
 * Reporte consolidado de valoración económica del inventario
 */
export interface MetricasValoracion {
  costoTotal: number;
  totalBotellas: number;
  botellasCotizadas: number;
  botellasSinPrecio: number;
  distribucionCategorias: MetricaDistribucionCategoria[];
}

/**
 * Representa una bebida en estado crítico o bajo de stock
 */
export interface BebidaAlertaStock {
  bebida: Bebida;
  stockMinimoMl: number;
  volumenRestanteMl: number;
  volumenFaltanteMl: number;
  porcentajeRestante: number;
}

/**
 * Valida si un precio estimado es numéricamente válido y positivo
 */
export function esPrecioValido(precio?: number | null): precio is number {
  return typeof precio === 'number' && !Number.isNaN(precio) && Number.isFinite(precio) && precio >= 0;
}

/**
 * Calcula las métricas financieras del inventario de forma segura y reactiva.
 * Maneja valores nulos, undefined, NaN y despensa vacía sin romper en runtime.
 */
export function calcularMetricasValoracion(
  bebidas: Bebida[],
  catalogoCategorias?: Categoria[]
): MetricasValoracion {
  const mapaCategorias = new Map<string, string>();

  // Cargar catálogo de categorías para resolución de nombres
  const categoriasReferencia = catalogoCategorias && catalogoCategorias.length > 0
    ? catalogoCategorias
    : CATEGORIAS_PREDETERMINADAS;

  for (const cat of categoriasReferencia) {
    mapaCategorias.set(cat.id, cat.nombre);
  }

  let costoTotal = 0;
  let botellasCotizadas = 0;
  let botellasSinPrecio = 0;

  // Agrupador por categoría: id -> { costo, cantidad }
  const mapaDistribucion = new Map<
    string,
    { totalCosto: number; cantidadBotellas: number; nombre: string }
  >();

  for (const b of bebidas) {
    const tienePrecio = esPrecioValido(b.precioEstimado);
    const precio = tienePrecio ? (b.precioEstimado as number) : 0;

    if (tienePrecio && precio > 0) {
      costoTotal += precio;
      botellasCotizadas += 1;
    } else {
      botellasSinPrecio += 1;
    }

    const catId = b.categoria || CATEGORIA_COMODIN_ID;
    const catNombre = mapaCategorias.get(catId) || (catId === CATEGORIA_COMODIN_ID ? 'Otro' : catId);

    const actual = mapaDistribucion.get(catId) || {
      totalCosto: 0,
      cantidadBotellas: 0,
      nombre: catNombre,
    };

    actual.totalCosto += precio;
    actual.cantidadBotellas += 1;
    mapaDistribucion.set(catId, actual);
  }

  // Redondear costo total a 2 decimales para evitar artefactos de coma flotante
  costoTotal = Math.round(costoTotal * 100) / 100;

  // Generar lista de distribución ordenada por costo descendente
  const distribucionCategorias: MetricaDistribucionCategoria[] = [];
  for (const [catId, datos] of mapaDistribucion.entries()) {
    const porcentaje = costoTotal > 0
      ? Math.round(((datos.totalCosto / costoTotal) * 100) * 10) / 10
      : 0;

    distribucionCategorias.push({
      categoriaId: catId,
      categoriaNombre: datos.nombre,
      totalCosto: Math.round(datos.totalCosto * 100) / 100,
      porcentaje,
      cantidadBotellas: datos.cantidadBotellas,
    });
  }

  distribucionCategorias.sort((a, b) => b.totalCosto - a.totalCosto || b.cantidadBotellas - a.cantidadBotellas);

  return {
    costoTotal,
    totalBotellas: bebidas.length,
    botellasCotizadas,
    botellasSinPrecio,
    distribucionCategorias,
  };
}

/**
 * Obtiene el listado consolidado de botellas en alerta de stock bajo, ordenadas por criticidad.
 */
export function obtenerBebidasEnAlertaStock(bebidas: Bebida[]): BebidaAlertaStock[] {
  const alertas: BebidaAlertaStock[] = [];

  for (const bebida of bebidas) {
    if (estaEnAlertaStockBajo(bebida)) {
      const stockMinimoMl = bebida.stockMinimoMl || 0;
      const volumenRestanteMl = Math.max(0, bebida.volumenRestanteMl || 0);
      const volumenFaltanteMl = Math.max(0, stockMinimoMl - volumenRestanteMl);
      const porcentajeRestante = calcularPorcentajeRestante(bebida);

      alertas.push({
        bebida,
        stockMinimoMl,
        volumenRestanteMl,
        volumenFaltanteMl,
        porcentajeRestante,
      });
    }
  }

  // Ordenar por criticidad: menor porcentaje restante primero, luego mayor faltante en ml
  alertas.sort((a, b) => a.porcentajeRestante - b.porcentajeRestante || b.volumenFaltanteMl - a.volumenFaltanteMl);

  return alertas;
}
