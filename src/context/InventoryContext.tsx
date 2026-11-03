import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { IInventoryRepository } from '../domain/repositories/inventory-repository.interface';
import { createInventoryRepository } from '../infrastructure/storage/inventory-repository-factory';
import { ICategoriaRepository } from '../domain/repositories/categoria-repository.interface';
import { createCategoriaRepository } from '../infrastructure/storage/categoria-repository-factory';
import { Categoria, puedeEliminarCategoria } from '../domain/models/categoria';

export interface CategoriaContextType {
  categoriaRepository: ICategoriaRepository;
  categorias: Categoria[];
  loadingCategorias: boolean;
  recargarCategorias: () => Promise<void>;
  guardarCategoria: (categoria: Categoria) => Promise<void>;
  eliminarCategoria: (id: string) => Promise<{ ok: boolean; motivo?: string }>;
}

export interface InventoryContextType extends CategoriaContextType {
  repository: IInventoryRepository;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export interface InventoryProviderProps {
  children: React.ReactNode;
  repository?: IInventoryRepository;
  categoriaRepository?: ICategoriaRepository;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({
  children,
  repository,
  categoriaRepository,
}) => {
  const repoInstance = useMemo(
    () => repository ?? createInventoryRepository(),
    [repository]
  );

  const catRepoInstance = useMemo(
    () => categoriaRepository ?? createCategoriaRepository(),
    [categoriaRepository]
  );

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

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

  useEffect(() => {
    recargarCategorias();
  }, [recargarCategorias]);

  const guardarCategoria = useCallback(
    async (categoria: Categoria) => {
      await catRepoInstance.save(categoria);
      await recargarCategorias();
    },
    [catRepoInstance, recargarCategorias]
  );

  const eliminarCategoria = useCallback(
    async (id: string): Promise<{ ok: boolean; motivo?: string }> => {
      // Verificar si hay bebidas en la despensa que utilicen esta categoría
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

  const contextValue = useMemo(
    () => ({
      repository: repoInstance,
      categoriaRepository: catRepoInstance,
      categorias,
      loadingCategorias,
      recargarCategorias,
      guardarCategoria,
      eliminarCategoria,
    }),
    [
      repoInstance,
      catRepoInstance,
      categorias,
      loadingCategorias,
      recargarCategorias,
      guardarCategoria,
      eliminarCategoria,
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
