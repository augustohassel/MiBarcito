import { describe, it, expect } from 'vitest';
import { Bebida, estaEnAlertaStockBajo, calcularPorcentajeRestante } from './bebida';

describe('Dominio Bebida', () => {
  const bebidaBase: Bebida = {
    id: 'test-1',
    nombre: 'Fernet Branca',
    marca: 'Fratelli Branca',
    categoria: 'aperitivo_bitter',
    volumenTotalMl: 750,
    volumenRestanteMl: 750,
    stockMinimoMl: 200,
    fechaCreacion: '2026-11-03T00:00:00Z',
    fechaActualizacion: '2026-11-03T00:00:00Z',
  };

  it('calcula correctamente el porcentaje restante de una botella', () => {
    expect(calcularPorcentajeRestante(bebidaBase)).toBe(100);

    const mediaBotella = { ...bebidaBase, volumenRestanteMl: 375 };
    expect(calcularPorcentajeRestante(mediaBotella)).toBe(50);

    const vacia = { ...bebidaBase, volumenRestanteMl: 0 };
    expect(calcularPorcentajeRestante(vacia)).toBe(0);
  });

  it('determina correctamente la alerta de stock bajo', () => {
    // Más de 200 ml => no alerta
    expect(estaEnAlertaStockBajo(bebidaBase)).toBe(false);

    // Exactamente 200 ml => alerta
    const enElLimite = { ...bebidaBase, volumenRestanteMl: 200 };
    expect(estaEnAlertaStockBajo(enElLimite)).toBe(true);

    // Menos de 200 ml => alerta
    const bajoLimite = { ...bebidaBase, volumenRestanteMl: 100 };
    expect(estaEnAlertaStockBajo(bajoLimite)).toBe(true);

    // Sin stock mínimo configurado => no alerta
    const sinStockMinimo = { ...bebidaBase, stockMinimoMl: undefined, volumenRestanteMl: 50 };
    expect(estaEnAlertaStockBajo(sinStockMinimo)).toBe(false);
  });
});

