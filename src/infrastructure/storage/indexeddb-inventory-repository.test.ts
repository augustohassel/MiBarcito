import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBInventoryRepository } from './indexeddb-inventory-repository';
import { InMemoryInventoryRepository } from './in-memory-inventory-repository';
import { Bebida } from '../../domain/models/bebida';

describe('Capa de Persistencia de Inventario', () => {
  const itemMock: Bebida = {
    id: 'b-1',
    nombre: 'Ron Añejo',
    marca: 'Havana Club',
    categoria: 'destilado',
    volumenTotalMl: 700,
    volumenRestanteMl: 500,
    stockMinimoMl: 150,
    fechaCreacion: '2026-11-03T00:00:00Z',
    fechaActualizacion: '2026-11-03T00:00:00Z',
  };

  describe('InMemoryInventoryRepository (Contingencia)', () => {
    let repo: InMemoryInventoryRepository;

    beforeEach(() => {
      repo = new InMemoryInventoryRepository();
    });

    it('guarda, recupera y elimina ítems en memoria', async () => {
      expect(await repo.getAll()).toEqual([]);

      await repo.save(itemMock);
      const items = await repo.getAll();
      expect(items).toHaveLength(1);
      expect(items[0].nombre).toBe('Ron Añejo');

      const byId = await repo.getById('b-1');
      expect(byId).toEqual(itemMock);

      await repo.delete('b-1');
      expect(await repo.getById('b-1')).toBeUndefined();
    });
  });

  describe('IndexedDBInventoryRepository', () => {
    let idbRepo: IndexedDBInventoryRepository;

    beforeEach(async () => {
      idbRepo = new IndexedDBInventoryRepository();
      await idbRepo.clear();
    });

    it('persiste y recupera entidades en IndexedDB', async () => {
      const inicial = await idbRepo.getAll();
      expect(inicial).toEqual([]);

      await idbRepo.save(itemMock);
      const guardado = await idbRepo.getById('b-1');
      expect(guardado).toBeDefined();
      expect(guardado?.marca).toBe('Havana Club');

      const todos = await idbRepo.getAll();
      expect(todos).toHaveLength(1);

      await idbRepo.delete('b-1');
      expect(await idbRepo.getById('b-1')).toBeUndefined();
    });
  });
});

