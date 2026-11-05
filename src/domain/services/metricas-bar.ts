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
  costoTotal: number; // Alias retrocompatible de valorActualProrrateado
  costoTotalLleno: number; // Inversión total si todas las botellas activas estuvieran 100% llenas
  valorActualProrrateado: number; // Suma prorrateada según volumen restante real en líquido
  costoReposicion: number; // Presupuesto estimado para reponer botellas activas en stock bajo con recomprar === true
  botellasPorReponer: number; // Cantidad de botellas activas en alerta de stock bajo con recomprar === true
  botellasReposicionSinPrecio: number; // Cantidad de botellas por reponer que carecen de precioEstimado
  totalBotellas: number; // Cantidad de botellas activas evaluadas
  botellasCotizadas: number; // Cantidad de botellas activas con precio > 0
  botellasSinPrecio: number; // Cantidad de botellas activas sin precio válido
  botellasArchivadas: number; // Cantidad de botellas archivadas en el historial
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

  let costoTotalLleno = 0;
  let valorActualProrrateado = 0;
  let costoReposicion = 0;
  let botellasPorReponer = 0;
  let botellasReposicionSinPrecio = 0;
  let botellasCotizadas = 0;
  let botellasSinPrecio = 0;
  let botellasArchivadas = 0;
  let totalBotellasActivas = 0;

  // Agrupador por categoría: id -> { costo, cantidad }
  const mapaDistribucion = new Map<
    string,
    { totalCosto: number; cantidadBotellas: number; nombre: string }
  >();

  for (const b of bebidas) {
    if (b.archivada) {
      botellasArchivadas += 1;
      continue;
    }

    totalBotellasActivas += 1;
    const tienePrecio = esPrecioValido(b.precioEstimado);
    const precio = tienePrecio ? (b.precioEstimado as number) : 0;

    // Prorrateo seguro por volumen (evita división por cero y NaN ante volumenTotalMl <= 0)
    let ratio = 0;
    if (
      typeof b.volumenTotalMl === 'number' &&
      b.volumenTotalMl > 0 &&
      typeof b.volumenRestanteMl === 'number' &&
      !Number.isNaN(b.volumenRestanteMl)
    ) {
      const restante = Math.max(0, Math.min(b.volumenTotalMl, b.volumenRestanteMl));
      ratio = restante / b.volumenTotalMl;
    }
    const costoProrrateado = precio * ratio;

    if (tienePrecio && precio > 0) {
      costoTotalLleno += precio;
      valorActualProrrateado += costoProrrateado;
      botellasCotizadas += 1;
    } else {
      botellasSinPrecio += 1;
    }

    // Costo de reposición: botellas activas con stock bajo y preferencia explícita de recompra
    if (estaEnAlertaStockBajo(b) && b.recomprar === true) {
      botellasPorReponer += 1;
      if (tienePrecio && precio > 0) {
        costoReposicion += precio;
      } else {
        botellasReposicionSinPrecio += 1;
      }
    }

    const catId = b.categoria || CATEGORIA_COMODIN_ID;
    const catNombre = mapaCategorias.get(catId) || (catId === CATEGORIA_COMODIN_ID ? 'Otro' : catId);

    const actual = mapaDistribucion.get(catId) || {
      totalCosto: 0,
      cantidadBotellas: 0,
      nombre: catNombre,
    };

    actual.totalCosto += costoProrrateado;
    actual.cantidadBotellas += 1;
    mapaDistribucion.set(catId, actual);
  }

  // Redondear a 2 decimales para evitar artefactos de coma flotante
  costoTotalLleno = Math.round(costoTotalLleno * 100) / 100;
  valorActualProrrateado = Math.round(valorActualProrrateado * 100) / 100;
  costoReposicion = Math.round(costoReposicion * 100) / 100;

  // Generar lista de distribución ordenada por costo descendente
  const distribucionCategorias: MetricaDistribucionCategoria[] = [];
  for (const [catId, datos] of mapaDistribucion.entries()) {
    const totalCostoCat = Math.round(datos.totalCosto * 100) / 100;
    const porcentaje = valorActualProrrateado > 0
      ? Math.round(((totalCostoCat / valorActualProrrateado) * 100) * 10) / 10
      : (costoTotalLleno > 0 ? 0 : 0);

    distribucionCategorias.push({
      categoriaId: catId,
      categoriaNombre: datos.nombre,
      totalCosto: totalCostoCat,
      porcentaje,
      cantidadBotellas: datos.cantidadBotellas,
    });
  }

  distribucionCategorias.sort((a, b) => b.totalCosto - a.totalCosto || b.cantidadBotellas - a.cantidadBotellas);

  return {
    costoTotal: valorActualProrrateado,
    costoTotalLleno,
    valorActualProrrateado,
    costoReposicion,
    botellasPorReponer,
    botellasReposicionSinPrecio,
    totalBotellas: totalBotellasActivas,
    botellasCotizadas,
    botellasSinPrecio,
    botellasArchivadas,
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
