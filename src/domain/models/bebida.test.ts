import { describe, it, expect } from 'vitest';
import {
  Bebida,
  estaEnAlertaStockBajo,
  calcularPorcentajeRestante,
  validarBebida,
  ajustarVolumenRapido,
} from './bebida';

describe('Dominio Bebida', () => {
  const bebidaBase: Bebida = {
    id: 'test-1',
    nombre: 'Fernet Branca',
    marca: 'Fratelli Branca',
    categoria: 'aperitivo_bitter',
    volumenTotalMl: 750,
    volumenRestanteMl: 750,
    stockMinimoMl: 200,
    esFavorito: true,
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

    // Botella archivada con stock bajo => NO alerta (caso borde)
    const archivadaEnStockBajo = { ...bebidaBase, volumenRestanteMl: 50, archivada: true };
    expect(estaEnAlertaStockBajo(archivadaEnStockBajo)).toBe(false);
  });

  describe('validarBebida', () => {
    it('retorna objeto vacío cuando los datos son válidos y completos', () => {
      const errores = validarBebida({
        nombre: 'Gin Bombay Sapphire',
        marca: 'Bombay',
        categoria: 'destilado',
        volumenTotalMl: 750,
        volumenRestanteMl: 500,
        graduacionAlcoholica: 47,
        precioEstimado: 25000,
        stockMinimoMl: 200,
      });

      expect(Object.keys(errores)).toHaveLength(0);
    });

    it('detecta campos obligatorios faltantes o con espacios en blanco', () => {
      const errores = validarBebida({
        nombre: '   ',
        marca: '',
        categoria: undefined,
        volumenTotalMl: undefined,
        volumenRestanteMl: undefined,
      });

      expect(errores.nombre).toBe('El nombre de la bebida es obligatorio');
      expect(errores.marca).toBe('La marca es obligatoria');
      expect(errores.categoria).toBe('Debe seleccionar una categoría válida');
      expect(errores.volumenTotalMl).toBe('El volumen total es obligatorio');
      expect(errores.volumenRestanteMl).toBe('El volumen restante es obligatorio');
    });

    it('valida que la categoría exista cuando se especifica la lista de categorías válidas', () => {
      const categoriasDisponibles = ['destilado', 'licor', 'vino'];
      const erroresValido = validarBebida(
        {
          nombre: 'Gin',
          marca: 'Beefeater',
          categoria: 'destilado',
          volumenTotalMl: 750,
          volumenRestanteMl: 500,
        },
        categoriasDisponibles
      );
      expect(erroresValido.categoria).toBeUndefined();

      const erroresInvalido = validarBebida(
        {
          nombre: 'Gin',
          marca: 'Beefeater',
          categoria: 'categoria-inexistente',
          volumenTotalMl: 750,
          volumenRestanteMl: 500,
        },
        categoriasDisponibles
      );
      expect(erroresInvalido.categoria).toBe('Debe seleccionar una categoría válida');
    });

    it('caso de falla / borde: bloquea volumenRestanteMl mayor que volumenTotalMl', () => {
      const errores = validarBebida({
        nombre: 'Whisky Jameson',
        marca: 'Jameson',
        categoria: 'destilado',
        volumenTotalMl: 750,
        volumenRestanteMl: 1000,
      });

      expect(errores.volumenRestanteMl).toBe('El volumen restante no puede superar el volumen total');
    });

    it('caso de falla / borde: bloquea volúmenes negativos y volumen total igual o menor a 0', () => {
      const erroresTotalCero = validarBebida({
        nombre: 'Vino Malbec',
        marca: 'Catena',
        categoria: 'vino',
        volumenTotalMl: 0,
        volumenRestanteMl: 0,
      });
      expect(erroresTotalCero.volumenTotalMl).toBe('El volumen total debe ser mayor a 0 ml');

      const erroresRestanteNegativo = validarBebida({
        nombre: 'Vino Malbec',
        marca: 'Catena',
        categoria: 'vino',
        volumenTotalMl: 750,
        volumenRestanteMl: -50,
      });
      expect(erroresRestanteNegativo.volumenRestanteMl).toBe('El volumen restante no puede ser negativo');
    });

    it('caso de falla / borde: bloquea graduación alcohólica menor a 0% o mayor a 100%', () => {
      const errorExceso = validarBebida({
        nombre: 'Alcohol puro',
        marca: 'Test',
        categoria: 'destilado',
        volumenTotalMl: 500,
        volumenRestanteMl: 500,
        graduacionAlcoholica: 120,
      });
      expect(errorExceso.graduacionAlcoholica).toBe('La graduación alcohólica debe ubicarse entre 0% y 100%');

      const errorNegativo = validarBebida({
        nombre: 'Alcohol',
        marca: 'Test',
        categoria: 'destilado',
        volumenTotalMl: 500,
        volumenRestanteMl: 500,
        graduacionAlcoholica: -5,
      });
      expect(errorNegativo.graduacionAlcoholica).toBe('La graduación alcohólica debe ubicarse entre 0% y 100%');
    });

    it('caso de falla / borde: bloquea precios negativos o stock mínimo negativo', () => {
      const errores = validarBebida({
        nombre: 'Campari',
        marca: 'Campari',
        categoria: 'aperitivo_bitter',
        volumenTotalMl: 750,
        volumenRestanteMl: 750,
        precioEstimado: -100,
        stockMinimoMl: -20,
      });
      expect(errores.precioEstimado).toBe('El precio estimado no puede ser negativo');
      expect(errores.stockMinimoMl).toBe('El stock mínimo no puede ser negativo');
    });

    it('acepta subcategoría opcional y bloquea si supera 50 caracteres', () => {
      const erroresValido = validarBebida({
        nombre: 'Tanqueray',
        marca: 'Tanqueray',
        categoria: 'destilado',
        subcategoria: 'Gin',
        volumenTotalMl: 750,
        volumenRestanteMl: 750,
      });
      expect(erroresValido.subcategoria).toBeUndefined();

      const erroresLargo = validarBebida({
        nombre: 'Tanqueray',
        marca: 'Tanqueray',
        categoria: 'destilado',
        subcategoria: 'A'.repeat(51),
        volumenTotalMl: 750,
        volumenRestanteMl: 750,
      });
      expect(erroresLargo.subcategoria).toBe('La subcategoría no puede superar los 50 caracteres');
    });

    it('acepta notas opcionales y bloquea si supera 500 caracteres', () => {
      const erroresValido = validarBebida({
        nombre: 'Negroni premix',
        marca: 'Propia',
        categoria: 'otro',
        volumenTotalMl: 500,
        volumenRestanteMl: 500,
        notas: 'Excelente balance con vermut rosso y un toque extra de bitter.',
      });
      expect(erroresValido.notas).toBeUndefined();

      const erroresLargo = validarBebida({
        nombre: 'Negroni premix',
        marca: 'Propia',
        categoria: 'otro',
        volumenTotalMl: 500,
        volumenRestanteMl: 500,
        notas: 'X'.repeat(501),
      });
      expect(erroresLargo.notas).toBe('Las notas no pueden superar los 500 caracteres');
    });
  });

  describe('ajustarVolumenRapido', () => {
    it('incrementa y decrementa correctamente dentro de los límites', () => {
      expect(ajustarVolumenRapido(500, 750, 50)).toBe(550);
      expect(ajustarVolumenRapido(500, 750, -50)).toBe(450);
    });

    it('caso borde: no permite que el volumen restante sea inferior a 0', () => {
      expect(ajustarVolumenRapido(30, 750, -50)).toBe(0);
      expect(ajustarVolumenRapido(0, 750, -100)).toBe(0);
    });

    it('caso borde: no permite que el volumen restante supere el volumen total', () => {
      expect(ajustarVolumenRapido(720, 750, 50)).toBe(750);
      expect(ajustarVolumenRapido(750, 750, 100)).toBe(750);
    });
  });
});

