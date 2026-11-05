import { describe, it, expect } from 'vitest';
import {
  validarReceta,
  clonarRecetaParaAutor,
  enriquecerRecetaPredeterminada,
  RECETAS_PREDETERMINADAS,
  Receta,
} from './receta';

describe('Modelo de Dominio: Receta / RecetaTrago', () => {
  describe('validarReceta', () => {
    const recetaValida: Receta = {
      id: 'receta-test',
      nombre: 'Gin Fizz',
      descripcion: 'Trago fresco cítrico',
      cristaleria: 'Vaso Highball',
      metodoPreparacion: 'batido',
      esFavorito: false,
      esPropia: true,
      ingredientes: [
        { nombre: 'Gin', cantidadMl: 50, unidad: 'ml', tipo: 'bebida' },
        { nombre: 'Jugo de Limón', cantidadMl: 30, unidad: 'ml', tipo: 'bebida' },
        { nombre: 'Hielo', tipo: 'guarnicion_insumo' },
      ],
      pasos: ['Batir todo en coctelera con hielo', 'Servir colado en el vaso'],
    };

    it('acepta una receta con todos los campos correctos', () => {
      const errores = validarReceta(recetaValida);
      expect(Object.keys(errores)).toHaveLength(0);
    });

    it('rechaza si falta el nombre o es demasiado corto o largo', () => {
      expect(validarReceta({ ...recetaValida, nombre: '' }).nombre).toBeDefined();
      expect(validarReceta({ ...recetaValida, nombre: 'A' }).nombre).toBeDefined();
      expect(validarReceta({ ...recetaValida, nombre: 'x'.repeat(81) }).nombre).toBeDefined();
    });

    it('rechaza si falta la cristalería', () => {
      expect(validarReceta({ ...recetaValida, cristaleria: '   ' }).cristaleria).toBeDefined();
    });

    it('rechaza si el método de preparación es inválido', () => {
      // @ts-expect-error testeando método inválido
      expect(validarReceta({ ...recetaValida, metodoPreparacion: 'magia' }).metodoPreparacion).toBeDefined();
    });

    it('rechaza si no tiene ingredientes o no tiene al menos una bebida', () => {
      expect(validarReceta({ ...recetaValida, ingredientes: [] }).ingredientes).toBeDefined();
      expect(
        validarReceta({
          ...recetaValida,
          ingredientes: [{ nombre: 'Hielo', tipo: 'guarnicion_insumo' }],
        }).ingredientes
      ).toBeDefined();
    });

    it('rechaza si una bebida tiene cantidadMl <= 0 o > 2000', () => {
      expect(
        validarReceta({
          ...recetaValida,
          ingredientes: [{ nombre: 'Gin', cantidadMl: 0, tipo: 'bebida' }],
        }).ingredientes
      ).toBeDefined();

      expect(
        validarReceta({
          ...recetaValida,
          ingredientes: [{ nombre: 'Gin', cantidadMl: 2500, tipo: 'bebida' }],
        }).ingredientes
      ).toBeDefined();
    });

    it('rechaza si no tiene pasos o algún paso está vacío', () => {
      expect(validarReceta({ ...recetaValida, pasos: [] }).pasos).toBeDefined();
      expect(validarReceta({ ...recetaValida, pasos: ['Paso 1', '   '] }).pasos).toBeDefined();
    });
  });

  describe('clonarRecetaParaAutor', () => {
    it('crea una copia editable con esPropia en true y nuevo ID', () => {
      const negroni = RECETAS_PREDETERMINADAS.find((r) => r.id === 'receta-negroni')!;
      expect(negroni).toBeDefined();
      expect(negroni.esPropia).toBe(false);

      const clon = clonarRecetaParaAutor(negroni, 'Mi Negroni Ahumado');
      expect(clon.id).not.toBe(negroni.id);
      expect(clon.id.startsWith('receta-propia-')).toBe(true);
      expect(clon.nombre).toBe('Mi Negroni Ahumado');
      expect(clon.esPropia).toBe(true);
      expect(clon.esFavorito).toBe(false);
      expect(clon.ingredientes).toHaveLength(negroni.ingredientes.length);
      expect(clon.pasos).toEqual(negroni.pasos);
      expect(clon.fechaCreacion).toBeDefined();
    });
  });

  describe('RECETAS_PREDETERMINADAS', () => {
    it('incluye al menos 8 recetas clásicas populares y válidas', () => {
      expect(RECETAS_PREDETERMINADAS.length).toBeGreaterThanOrEqual(8);
      for (const receta of RECETAS_PREDETERMINADAS) {
        expect(receta.esPropia).toBe(false);
        const errores = validarReceta(receta);
        expect(errores, `Receta inválida: ${receta.nombre}`).toEqual({});
      }
    });

    it('incluye Negroni, Fernet con Cola, Gin Tonic y Old Fashioned', () => {
      const nombres = RECETAS_PREDETERMINADAS.map((r) => r.nombre);
      expect(nombres).toContain('Negroni');
      expect(nombres).toContain('Fernet con Cola');
      expect(nombres).toContain('Gin Tonic');
      expect(nombres).toContain('Old Fashioned');
    });

    it('todos los ingredientes de tipo bebida en las recetas predeterminadas tienen categoriaId y subcategoria asignados', () => {
      for (const receta of RECETAS_PREDETERMINADAS) {
        for (const ing of receta.ingredientes) {
          if (ing.tipo === 'bebida') {
            expect(ing.categoriaId, `${receta.nombre} - ${ing.nombre} sin categoriaId`).toBeDefined();
            expect(ing.subcategoria, `${receta.nombre} - ${ing.nombre} sin subcategoria`).toBeDefined();
          }
        }
      }
    });

    it('enriquecerRecetaPredeterminada actualiza recetas clásicas antiguas preservando esFavorito', () => {
      const recetaAntigua: Receta = {
        id: 'receta-negroni',
        nombre: 'Negroni',
        descripcion: 'Clásico',
        cristaleria: 'Vaso',
        metodoPreparacion: 'refrescado',
        esFavorito: true,
        esPropia: false,
        ingredientes: [
          { nombre: 'Gin', cantidadMl: 30, tipo: 'bebida' },
        ],
        pasos: ['Paso 1'],
      };

      const enriquecida = enriquecerRecetaPredeterminada(recetaAntigua);
      expect(enriquecida.esFavorito).toBe(true);
      expect(enriquecida.ingredientes[0].categoriaId).toBe('destilado');
      expect(enriquecida.ingredientes[0].subcategoria).toBe('Gin');
    });
  });
});

