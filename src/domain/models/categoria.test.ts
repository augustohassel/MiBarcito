import { describe, it, expect } from 'vitest';
import {
  CATEGORIA_COMODIN_ID,
  CATEGORIAS_PREDETERMINADAS,
  normalizarNombreCategoria,
  puedeEliminarCategoria,
  validarCategoria,
  Categoria,
} from './categoria';

describe('Dominio Categoría', () => {
  it('contiene las 8 categorías predeterminadas con la estructura correcta', () => {
    expect(CATEGORIAS_PREDETERMINADAS).toHaveLength(8);
    const otro = CATEGORIAS_PREDETERMINADAS.find((c) => c.id === CATEGORIA_COMODIN_ID);
    expect(otro).toBeDefined();
    expect(otro?.nombre).toBe('Otro');
    expect(otro?.esPredeterminada).toBe(true);
  });

  describe('normalizarNombreCategoria', () => {
    it('elimina espacios extras y convierte a minúsculas', () => {
      expect(normalizarNombreCategoria('  Destilado  ')).toBe('destilado');
      expect(normalizarNombreCategoria('Aperitivo   /   Bitter')).toBe('aperitivo / bitter');
    });
  });

  describe('validarCategoria', () => {
    const categoriasExistentes: Categoria[] = [
      {
        id: 'cat-1',
        nombre: 'Destilado',
        esPredeterminada: true,
        orden: 1,
        fechaCreacion: '2026-11-03T00:00:00.000Z',
        fechaActualizacion: '2026-11-03T00:00:00.000Z',
      },
      {
        id: 'cat-2',
        nombre: 'Vino Blanco',
        esPredeterminada: false,
        orden: 2,
        fechaCreacion: '2026-11-03T00:00:00.000Z',
        fechaActualizacion: '2026-11-03T00:00:00.000Z',
      },
    ];

    it('acepta una categoría válida sin duplicados', () => {
      const errores = validarCategoria({ nombre: 'Gin Artesanal' }, categoriasExistentes);
      expect(Object.keys(errores)).toHaveLength(0);
    });

    it('rechaza nombres vacíos o solo con espacios', () => {
      const errVacio = validarCategoria({ nombre: '' }, categoriasExistentes);
      expect(errVacio.nombre).toBe('El nombre de la categoría es obligatorio');

      const errEspacios = validarCategoria({ nombre: '   ' }, categoriasExistentes);
      expect(errEspacios.nombre).toBe('El nombre de la categoría es obligatorio');
    });

    it('rechaza nombres menores a 2 caracteres o mayores a 50', () => {
      const errCorto = validarCategoria({ nombre: 'A' }, categoriasExistentes);
      expect(errCorto.nombre).toBe('El nombre de la categoría debe tener al menos 2 caracteres');

      const errLargo = validarCategoria({ nombre: 'a'.repeat(51) }, categoriasExistentes);
      expect(errLargo.nombre).toBe('El nombre de la categoría no puede superar los 50 caracteres');
    });

    it('caso borde: detecta nombres duplicados case-insensitive y con espacios variables', () => {
      const errDuplicado = validarCategoria({ nombre: '  destilado  ' }, categoriasExistentes);
      expect(errDuplicado.nombre).toBe('Ya existe una categoría con este nombre');

      const errDuplicado2 = validarCategoria({ nombre: 'VINO BLANCO' }, categoriasExistentes);
      expect(errDuplicado2.nombre).toBe('Ya existe una categoría con este nombre');
    });

    it('permite mantener el mismo nombre al editar la misma categoría', () => {
      const errores = validarCategoria({ id: 'cat-1', nombre: 'Destilado' }, categoriasExistentes);
      expect(Object.keys(errores)).toHaveLength(0);
    });
  });

  describe('puedeEliminarCategoria', () => {
    it('caso de falla / borde 2: bloquea siempre la eliminación de la categoría comodín Otro', () => {
      const resultado = puedeEliminarCategoria(CATEGORIA_COMODIN_ID, 0);
      expect(resultado.puede).toBe(false);
      expect(resultado.motivo).toContain("comodín reservado");
    });

    it('caso de falla / borde 1: bloquea la eliminación si existen bebidas asociadas', () => {
      const resultado = puedeEliminarCategoria('destilado', 3);
      expect(resultado.puede).toBe(false);
      expect(resultado.motivo).toContain('tiene 3 bebida(s) asignada(s)');
    });

    it('permite la eliminación si no es Otro y tiene 0 bebidas asociadas', () => {
      const resultado = puedeEliminarCategoria('cat-personalizada', 0);
      expect(resultado.puede).toBe(true);
      expect(resultado.motivo).toBeUndefined();
    });
  });
});

