import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBCategoriaRepository } from './indexeddb-categoria-repository';
import { InMemoryCategoriaRepository } from './in-memory-categoria-repository';
import { IndexedDBInventoryRepository } from './indexeddb-inventory-repository';
import { Categoria, CATEGORIA_COMODIN_ID } from '../../domain/models/categoria';
import { Bebida } from '../../domain/models/bebida';
import { resetDatabasePromiseForTests } from './indexeddb-database';

describe('Capa de Persistencia de Categorías e IndexedDB v2', () => {
  beforeEach(() => {
    resetDatabasePromiseForTests();
  });

  describe('InMemoryCategoriaRepository (Contingencia)', () => {
    let repo: InMemoryCategoriaRepository;

    beforeEach(() => {
      repo = new InMemoryCategoriaRepository();
    });

    it('siembra automáticamente las 8 categorías predeterminadas', async () => {
      const categorias = await repo.getAll();
      expect(categorias).toHaveLength(8);
      expect(categorias.some((c) => c.id === CATEGORIA_COMODIN_ID)).toBe(true);
    });

    it('guarda, busca por id y elimina categorías personalizadas', async () => {
      const nuevaCat: Categoria = {
        id: 'cat-mezcal',
        nombre: 'Mezcal',
        esPredeterminada: false,
        orden: 10,
        fechaCreacion: '2026-11-03T00:00:00.000Z',
        fechaActualizacion: '2026-11-03T00:00:00.000Z',
      };

      await repo.save(nuevaCat);
      const guardada = await repo.getById('cat-mezcal');
      expect(guardada).toBeDefined();
      expect(guardada?.nombre).toBe('Mezcal');

      const todas = await repo.getAll();
      expect(todas).toHaveLength(9);

      await repo.delete('cat-mezcal');
      expect(await repo.getById('cat-mezcal')).toBeUndefined();
    });
  });

  describe('IndexedDBCategoriaRepository y Coexistencia con Bebidas', () => {
    let catRepo: IndexedDBCategoriaRepository;
    let invRepo: IndexedDBInventoryRepository;

    beforeEach(async () => {
      catRepo = new IndexedDBCategoriaRepository();
      invRepo = new IndexedDBInventoryRepository();
      await catRepo.seedDefaults();
    });

    it('persiste categorías predeterminadas y personalizadas en IndexedDB v2', async () => {
      const categorias = await catRepo.getAll();
      expect(categorias.length).toBeGreaterThanOrEqual(8);

      const nuevaCat: Categoria = {
        id: 'cat-tequila',
        nombre: 'Tequila',
        esPredeterminada: false,
        orden: 20,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      };

      await catRepo.save(nuevaCat);
      const recuperada = await catRepo.getById('cat-tequila');
      expect(recuperada).toBeDefined();
      expect(recuperada?.nombre).toBe('Tequila');

      // Renombrar categoría
      await catRepo.save({ ...recuperada!, nombre: 'Tequila Reposado' });
      const actualizada = await catRepo.getById('cat-tequila');
      expect(actualizada?.nombre).toBe('Tequila Reposado');

      await catRepo.delete('cat-tequila');
      expect(await catRepo.getById('cat-tequila')).toBeUndefined();
    });

    it('coexiste de forma segura con bebidas sin corromper datos de inventario', async () => {
      const bebida: Bebida = {
        id: 'beb-test-coexistencia',
        nombre: 'Tequila Don Julio',
        marca: 'Don Julio',
        categoria: 'destilado',
        volumenTotalMl: 750,
        volumenRestanteMl: 750,
        fechaCreacion: '2026-11-03T00:00:00.000Z',
        fechaActualizacion: '2026-11-03T00:00:00.000Z',
      };

      await invRepo.save(bebida);
      const bebidaGuardada = await invRepo.getById('beb-test-coexistencia');
      expect(bebidaGuardada?.nombre).toBe('Tequila Don Julio');

      const categorias = await catRepo.getAll();
      expect(categorias.length).toBeGreaterThanOrEqual(8);

      // Limpieza
      await invRepo.delete('beb-test-coexistencia');
    });
  });
});

