import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { IInventoryRepository } from '../domain/repositories/inventory-repository.interface';
import { createInventoryRepository } from '../infrastructure/storage/inventory-repository-factory';
import { ICategoriaRepository } from '../domain/repositories/categoria-repository.interface';
import { createCategoriaRepository } from '../infrastructure/storage/categoria-repository-factory';
import { Categoria, puedeEliminarCategoria } from '../domain/models/categoria';
import { IRecetaRepository } from '../domain/repositories/receta-repository.interface';
import { createRecetaRepository } from '../infrastructure/storage/receta-repository-factory';
import { Receta } from '../domain/models/receta';

export interface CategoriaContextType {
  categoriaRepository: ICategoriaRepository;
  categorias: Categoria[];
  loadingCategorias: boolean;
  recargarCategorias: () => Promise<void>;
  guardarCategoria: (categoria: Categoria) => Promise<void>;
  eliminarCategoria: (id: string) => Promise<{ ok: boolean; motivo?: string }>;
}

export interface RecetaContextType {
  recetaRepository: IRecetaRepository;
  recetas: Receta[];
  loadingRecetas: boolean;
  recargarRecetas: () => Promise<void>;
  guardarReceta: (receta: Receta) => Promise<void>;
  eliminarReceta: (id: string) => Promise<{ ok: boolean; motivo?: string }>;
  toggleFavoritoReceta: (id: string) => Promise<void>;
  prepararTrago: (
    receta: Receta,
    descuentos: { botellaId: string; cantidadMl: number }[]
  ) => Promise<{ ok: boolean; motivo?: string }>;
}

export interface InventoryContextType extends CategoriaContextType, RecetaContextType {
  repository: IInventoryRepository;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export interface InventoryProviderProps {
  children: React.ReactNode;
  repository?: IInventoryRepository;
  categoriaRepository?: ICategoriaRepository;
  recetaRepository?: IRecetaRepository;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({
  children,
  repository,
  categoriaRepository,
  recetaRepository,
}) => {
  const repoInstance = useMemo(
    () => repository ?? createInventoryRepository(),
    [repository]
  );

  const catRepoInstance = useMemo(
    () => categoriaRepository ?? createCategoriaRepository(),
    [categoriaRepository]
  );

  const recetaRepoInstance = useMemo(
    () => recetaRepository ?? createRecetaRepository(),
    [recetaRepository]
  );

  // Estados de Categorías
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  // Estados de Recetas
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loadingRecetas, setLoadingRecetas] = useState(true);

  const recargarCategorias = useCallback(async () => {
    try {
      setLoadingCategorias(true);
      await catRepoInstance.seedDefaults();
      const list = await catRepoInstance.getAll();
      setCategorias(list);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    } finally {
      setLoadingCategorias(false);
    }
  }, [catRepoInstance]);

  const recargarRecetas = useCallback(async () => {
    try {
      setLoadingRecetas(true);
      await recetaRepoInstance.seedDefaults();
      const list = await recetaRepoInstance.getAll();
      setRecetas(list);
    } catch (err) {
      console.error('Error al cargar recetas:', err);
    } finally {
      setLoadingRecetas(false);
    }
  }, [recetaRepoInstance]);

  useEffect(() => {
    recargarCategorias();
    recargarRecetas();
  }, [recargarCategorias, recargarRecetas]);

  const guardarCategoria = useCallback(
    async (categoria: Categoria) => {
      await catRepoInstance.save(categoria);
      await recargarCategorias();
    },
    [catRepoInstance, recargarCategorias]
  );

  const eliminarCategoria = useCallback(
    async (id: string): Promise<{ ok: boolean; motivo?: string }> => {
      const bebidas = await repoInstance.getAll();
      const cantidadEnUso = bebidas.filter((b) => b.categoria === id).length;

      const validacion = puedeEliminarCategoria(id, cantidadEnUso);
      if (!validacion.puede) {
        return { ok: false, motivo: validacion.motivo };
      }

      await catRepoInstance.delete(id);
      await recargarCategorias();
      return { ok: true };
    },
    [catRepoInstance, repoInstance, recargarCategorias]
  );

  const guardarReceta = useCallback(
    async (receta: Receta) => {
      await recetaRepoInstance.save(receta);
      await recargarRecetas();
    },
    [recetaRepoInstance, recargarRecetas]
  );

  const eliminarReceta = useCallback(
    async (id: string): Promise<{ ok: boolean; motivo?: string }> => {
      const receta = await recetaRepoInstance.getById(id);
      if (!receta) {
        return { ok: false, motivo: 'La receta no existe' };
      }
      if (!receta.esPropia) {
        return {
          ok: false,
          motivo: 'Las recetas predeterminadas del catálogo clásico no pueden ser eliminadas.',
        };
      }
      await recetaRepoInstance.delete(id);
      await recargarRecetas();
      return { ok: true };
    },
    [recetaRepoInstance, recargarRecetas]
  );

  const toggleFavoritoReceta = useCallback(
    async (id: string) => {
      await recetaRepoInstance.toggleFavorito(id);
      await recargarRecetas();
    },
    [recetaRepoInstance, recargarRecetas]
  );

  /**
   * Descuenta stock de forma atómica y segura al preparar un trago.
   * Valida que ninguna botella quede con saldo negativo antes de guardar.
   */
  const prepararTrago = useCallback(
    async (
      _receta: Receta,
      descuentos: { botellaId: string; cantidadMl: number }[]
    ): Promise<{ ok: boolean; motivo?: string }> => {
      const botellasModificadas: { id: string; nuevoVolumen: number }[] = [];

      for (const desc of descuentos) {
        if (desc.cantidadMl <= 0) continue;
        const botella = await repoInstance.getById(desc.botellaId);
        if (!botella) {
          return { ok: false, motivo: `La botella no fue encontrada en el inventario.` };
        }
        if (botella.volumenRestanteMl < desc.cantidadMl) {
          return {
            ok: false,
            motivo: `Stock insuficiente en ${botella.nombre} (${botella.marca}). Disponible: ${botella.volumenRestanteMl} ml, Requerido: ${desc.cantidadMl} ml.`,
          };
        }
        botellasModificadas.push({
          id: botella.id,
          nuevoVolumen: Math.max(0, botella.volumenRestanteMl - desc.cantidadMl),
        });
      }

      // Aplicar descuentos atómicos
      for (const item of botellasModificadas) {
        const b = await repoInstance.getById(item.id);
        if (b) {
          await repoInstance.save({
            ...b,
            volumenRestanteMl: item.nuevoVolumen,
          });
        }
      }

      return { ok: true };
    },
    [repoInstance]
  );

  const contextValue = useMemo(
    () => ({
      repository: repoInstance,
      categoriaRepository: catRepoInstance,
      recetaRepository: recetaRepoInstance,
      categorias,
      loadingCategorias,
      recargarCategorias,
      guardarCategoria,
      eliminarCategoria,
      recetas,
      loadingRecetas,
      recargarRecetas,
      guardarReceta,
      eliminarReceta,
      toggleFavoritoReceta,
      prepararTrago,
    }),
    [
      repoInstance,
      catRepoInstance,
      recetaRepoInstance,
      categorias,
      loadingCategorias,
      recargarCategorias,
      guardarCategoria,
      eliminarCategoria,
      recetas,
      loadingRecetas,
      recargarRecetas,
      guardarReceta,
      eliminarReceta,
      toggleFavoritoReceta,
      prepararTrago,
    ]
  );

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
};

export function useInventoryRepository(): IInventoryRepository {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventoryRepository debe ser utilizado dentro de un InventoryProvider');
  }
  return context.repository;
}

export function useCategoriaRepository(): ICategoriaRepository {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useCategoriaRepository debe ser utilizado dentro de un InventoryProvider');
  }
  return context.categoriaRepository;
}

export function useRecetaRepository(): IRecetaRepository {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useRecetaRepository debe ser utilizado dentro de un InventoryProvider');
  }
  return context.recetaRepository;
}

export function useCategorias(): CategoriaContextType {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useCategorias debe ser utilizado dentro de un InventoryProvider');
  }
  return {
    categoriaRepository: context.categoriaRepository,
    categorias: context.categorias,
    loadingCategorias: context.loadingCategorias,
    recargarCategorias: context.recargarCategorias,
    guardarCategoria: context.guardarCategoria,
    eliminarCategoria: context.eliminarCategoria,
  };
}

export function useRecetas(): RecetaContextType {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useRecetas debe ser utilizado dentro de un InventoryProvider');
  }
  return {
    recetaRepository: context.recetaRepository,
    recetas: context.recetas,
    loadingRecetas: context.loadingRecetas,
    recargarRecetas: context.recargarRecetas,
    guardarReceta: context.guardarReceta,
    eliminarReceta: context.eliminarReceta,
    toggleFavoritoReceta: context.toggleFavoritoReceta,
    prepararTrago: context.prepararTrago,
  };
}

export function useCategoriasOpcional(): CategoriaContextType | null {
  const context = useContext(InventoryContext);
  if (!context) {
    return null;
  }
  return {
    categoriaRepository: context.categoriaRepository,
    categorias: context.categorias,
    loadingCategorias: context.loadingCategorias,
    recargarCategorias: context.recargarCategorias,
    guardarCategoria: context.guardarCategoria,
    eliminarCategoria: context.eliminarCategoria,
  };
}
