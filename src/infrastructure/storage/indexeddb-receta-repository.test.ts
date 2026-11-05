import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRecetaRepository } from './in-memory-receta-repository';
import { IndexedDBRecetaRepository } from './indexeddb-receta-repository';
import { Receta, RECETAS_PREDETERMINADAS } from '../../domain/models/receta';
import { resetDatabasePromiseForTests } from './indexeddb-database';

describe('Capa de Persistencia de Recetas e IndexedDB v3', () => {
  beforeEach(() => {
    resetDatabasePromiseForTests();
  });

  describe('InMemoryRecetaRepository', () => {
    let repo: InMemoryRecetaRepository;

    beforeEach(() => {
      repo = new InMemoryRecetaRepository();
    });

    it('siembra automáticamente las recetas predeterminadas', async () => {
      const recetas = await repo.getAll();
      expect(recetas.length).toBeGreaterThanOrEqual(8);
      expect(recetas.some((r) => r.id === 'receta-negroni')).toBe(true);
    });

    it('guarda, busca por id, alterna favorito y elimina recetas de autor', async () => {
      const nuevaReceta: Receta = {
        id: 'receta-autor-1',
        nombre: 'Cóctel de Prueba',
        descripcion: 'Inventado para el test',
        cristaleria: 'Copa Coupe',
        metodoPreparacion: 'batido',
        esFavorito: false,
        esPropia: true,
        ingredientes: [{ nombre: 'Ron', cantidadMl: 60, tipo: 'bebida' }],
        pasos: ['Batir y servir'],
      };

      await repo.save(nuevaReceta);
      const guardada = await repo.getById('receta-autor-1');
      expect(guardada).toBeDefined();
      expect(guardada?.nombre).toBe('Cóctel de Prueba');

      const conFavorito = await repo.toggleFavorito('receta-autor-1');
      expect(conFavorito?.esFavorito).toBe(true);

      await repo.delete('receta-autor-1');
      expect(await repo.getById('receta-autor-1')).toBeUndefined();
    });
  });

  describe('IndexedDBRecetaRepository', () => {
    let repo: IndexedDBRecetaRepository;

    beforeEach(async () => {
      repo = new IndexedDBRecetaRepository();
      await repo.clear();
      await repo.seedDefaults();
    });

    it('siembra y recupera el catálogo clásico desde IndexedDB', async () => {
      const recetas = await repo.getAll();
      expect(recetas.length).toBe(RECETAS_PREDETERMINADAS.length);
      const negroni = await repo.getById('receta-negroni');
      expect(negroni).toBeDefined();
      expect(negroni?.nombre).toBe('Negroni');
    });

    it('permite persistir una nueva receta de autor y alternar favorito en IndexedDB', async () => {
      const recetaAutor: Receta = {
        id: 'receta-autor-idb',
        nombre: 'Gin Tonic Especial',
        descripcion: 'Con romero y pimienta rosa',
        cristaleria: 'Copa balón',
        metodoPreparacion: 'directo',
        esFavorito: false,
        esPropia: true,
        ingredientes: [
          { nombre: 'Gin', cantidadMl: 60, tipo: 'bebida' },
          { nombre: 'Agua Tónica', cantidadMl: 150, tipo: 'bebida' },
        ],
        pasos: ['Servir con hielo y decorar'],
      };

      await repo.save(recetaAutor);
      const recuperada = await repo.getById('receta-autor-idb');
      expect(recuperada?.nombre).toBe('Gin Tonic Especial');
      expect(recuperada?.esPropia).toBe(true);

      const toggled = await repo.toggleFavorito('receta-autor-idb');
      expect(toggled?.esFavorito).toBe(true);

      await repo.delete('receta-autor-idb');
      expect(await repo.getById('receta-autor-idb')).toBeUndefined();
    });

    it('enriquece recetas predeterminadas antiguas en IndexedDB con categoriaId y subcategoria sin perder esFavorito', async () => {
      const negroniLegacy: Receta = {
        id: 'receta-negroni',
        nombre: 'Negroni',
        descripcion: 'Antiguo sin categoriaId',
        cristaleria: 'Vaso',
        metodoPreparacion: 'refrescado',
        esFavorito: true,
        esPropia: false,
        ingredientes: [{ nombre: 'Gin', cantidadMl: 30, tipo: 'bebida' }],
        pasos: ['Paso 1'],
      };

      await repo.save(negroniLegacy);
      await repo.seedDefaults();

      const actualizado = await repo.getById('receta-negroni');
      expect(actualizado?.esFavorito).toBe(true);
      expect(actualizado?.ingredientes[0].categoriaId).toBe('destilado');
      expect(actualizado?.ingredientes[0].subcategoria).toBe('Gin');
    });
  });
});

