import { describe, it, expect } from 'vitest';
import { Bebida } from '../models/bebida';
import { Categoria } from '../models/categoria';
import {
  calcularMetricasValoracion,
  obtenerBebidasEnAlertaStock,
  esPrecioValido,
} from './metricas-bar';

describe('metricas-bar service', () => {
  const dummyCategorias: Categoria[] = [
    { id: 'destilado', nombre: 'Destilado', esPredeterminada: true, orden: 1, fechaCreacion: '', fechaActualizacion: '' },
    { id: 'licor', nombre: 'Licor', esPredeterminada: true, orden: 2, fechaCreacion: '', fechaActualizacion: '' },
    { id: 'vino', nombre: 'Vino', esPredeterminada: true, orden: 3, fechaCreacion: '', fechaActualizacion: '' },
  ];

  const crearBebidaMock = (parcial: Partial<Bebida>): Bebida => ({
    id: parcial.id || 'b-1',
    nombre: parcial.nombre || 'Bebida Test',
    marca: parcial.marca || 'Marca Test',
    categoria: parcial.categoria || 'destilado',
    volumenTotalMl: parcial.volumenTotalMl ?? 750,
    volumenRestanteMl: parcial.volumenRestanteMl ?? 750,
    precioEstimado: parcial.precioEstimado,
    stockMinimoMl: parcial.stockMinimoMl,
    fechaCreacion: '2026-11-04T00:00:00.000Z',
    fechaActualizacion: '2026-11-04T00:00:00.000Z',
  });

  describe('esPrecioValido', () => {
    it('reconoce números positivos finitos como válidos', () => {
      expect(esPrecioValido(1500)).toBe(true);
      expect(esPrecioValido(0)).toBe(true);
      expect(esPrecioValido(99.99)).toBe(true);
    });

    it('rechaza undefined, null, NaN, infinitos y negativos', () => {
      expect(esPrecioValido(undefined)).toBe(false);
      expect(esPrecioValido(null)).toBe(false);
      expect(esPrecioValido(Number.NaN)).toBe(false);
      expect(esPrecioValido(Infinity)).toBe(false);
      expect(esPrecioValido(-50)).toBe(false);
    });
  });

  describe('calcularMetricasValoracion', () => {
    it('retorna ceros seguros y lista vacía ante despensa sin botellas (evita división por cero)', () => {
      const metricas = calcularMetricasValoracion([]);
      expect(metricas.costoTotal).toBe(0);
      expect(metricas.totalBotellas).toBe(0);
      expect(metricas.botellasCotizadas).toBe(0);
      expect(metricas.botellasSinPrecio).toBe(0);
      expect(metricas.distribucionCategorias).toEqual([]);
    });

    it('calcula correctamente el costo total y la distribución por categoría con precios válidos', () => {
      const bebidas: Bebida[] = [
        crearBebidaMock({ id: '1', categoria: 'destilado', precioEstimado: 1000 }),
        crearBebidaMock({ id: '2', categoria: 'destilado', precioEstimado: 2000 }),
        crearBebidaMock({ id: '3', categoria: 'licor', precioEstimado: 1000 }),
      ];

      const metricas = calcularMetricasValoracion(bebidas, dummyCategorias);

      expect(metricas.costoTotal).toBe(4000);
      expect(metricas.totalBotellas).toBe(3);
      expect(metricas.botellasCotizadas).toBe(3);
      expect(metricas.botellasSinPrecio).toBe(0);

      // Destilado: 3000 (75%)
      const destilado = metricas.distribucionCategorias.find((c) => c.categoriaId === 'destilado');
      expect(destilado).toBeDefined();
      expect(destilado?.totalCosto).toBe(3000);
      expect(destilado?.porcentaje).toBe(75);
      expect(destilado?.cantidadBotellas).toBe(2);

      // Licor: 1000 (25%)
      const licor = metricas.distribucionCategorias.find((c) => c.categoriaId === 'licor');
      expect(licor).toBeDefined();
      expect(licor?.totalCosto).toBe(1000);
      expect(licor?.porcentaje).toBe(25);
      expect(licor?.cantidadBotellas).toBe(1);
    });

    it('caso borde: maneja botellas sin precio (undefined, null, NaN, 0, negativas) sin romper con NaN', () => {
      const bebidas: Bebida[] = [
        crearBebidaMock({ id: '1', categoria: 'destilado', precioEstimado: 5000 }),
        crearBebidaMock({ id: '2', categoria: 'destilado', precioEstimado: undefined }),
        crearBebidaMock({ id: '3', categoria: 'licor', precioEstimado: null as unknown as number }),
        crearBebidaMock({ id: '4', categoria: 'licor', precioEstimado: Number.NaN }),
        crearBebidaMock({ id: '5', categoria: 'vino', precioEstimado: -100 }),
        crearBebidaMock({ id: '6', categoria: 'vino', precioEstimado: 0 }),
      ];

      const metricas = calcularMetricasValoracion(bebidas, dummyCategorias);

      expect(metricas.costoTotal).toBe(5000);
      expect(metricas.totalBotellas).toBe(6);
      expect(metricas.botellasCotizadas).toBe(1);
      expect(metricas.botellasSinPrecio).toBe(5);
      expect(Number.isNaN(metricas.costoTotal)).toBe(false);

      // Porcentajes
      const destilado = metricas.distribucionCategorias.find((c) => c.categoriaId === 'destilado');
      expect(destilado?.porcentaje).toBe(100);
    });

    it('resuelve nombres de categorías dinámicas y fallback para categorías huérfanas', () => {
      const bebidas: Bebida[] = [
        crearBebidaMock({ id: '1', categoria: 'categoria-inexistente', precioEstimado: 1200 }),
      ];

      const metricas = calcularMetricasValoracion(bebidas, dummyCategorias);
      expect(metricas.distribucionCategorias[0].categoriaNombre).toBe('categoria-inexistente');
      expect(metricas.distribucionCategorias[0].totalCosto).toBe(1200);
    });
  });

  describe('obtenerBebidasEnAlertaStock', () => {
    it('retorna lista vacía si ninguna botella está por debajo de su umbral', () => {
      const bebidas: Bebida[] = [
        crearBebidaMock({ id: '1', volumenTotalMl: 1000, volumenRestanteMl: 800, stockMinimoMl: 200 }),
        crearBebidaMock({ id: '2', volumenTotalMl: 750, volumenRestanteMl: 500, stockMinimoMl: 150 }),
      ];

      const alertas = obtenerBebidasEnAlertaStock(bebidas);
      expect(alertas).toEqual([]);
    });

    it('identifica botellas con volumenRestanteMl <= stockMinimoMl y calcula faltantes', () => {
      const bebidas: Bebida[] = [
        crearBebidaMock({
          id: '1',
          nombre: 'Gin Crítico',
          volumenTotalMl: 1000,
          volumenRestanteMl: 100,
          stockMinimoMl: 300,
        }),
        crearBebidaMock({
          id: '2',
          nombre: 'Whisky Lleno',
          volumenTotalMl: 750,
          volumenRestanteMl: 600,
          stockMinimoMl: 200,
        }),
        crearBebidaMock({
          id: '3',
          nombre: 'Vermut Agotado',
          volumenTotalMl: 1000,
          volumenRestanteMl: 0,
          stockMinimoMl: 250,
        }),
      ];

      const alertas = obtenerBebidasEnAlertaStock(bebidas);

      expect(alertas).toHaveLength(2);
      // Vermut Agotado debe estar primero por menor porcentaje restante (0% vs 10%)
      expect(alertas[0].bebida.nombre).toBe('Vermut Agotado');
      expect(alertas[0].volumenFaltanteMl).toBe(250);
      expect(alertas[0].porcentajeRestante).toBe(0);

      expect(alertas[1].bebida.nombre).toBe('Gin Crítico');
      expect(alertas[1].volumenFaltanteMl).toBe(200);
      expect(alertas[1].porcentajeRestante).toBe(10);
    });

    it('ignora botellas que no tienen configurado un stock mínimo o con stockMinimoMl <= 0', () => {
      const bebidas: Bebida[] = [
        crearBebidaMock({ id: '1', volumenTotalMl: 750, volumenRestanteMl: 50, stockMinimoMl: undefined }),
        crearBebidaMock({ id: '2', volumenTotalMl: 750, volumenRestanteMl: 0, stockMinimoMl: 0 }),
      ];

      const alertas = obtenerBebidasEnAlertaStock(bebidas);
      expect(alertas).toHaveLength(0);
    });
  });
});
