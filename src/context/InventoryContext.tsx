import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { IInventoryRepository } from '../domain/repositories/inventory-repository.interface';
import { createInventoryRepository } from '../infrastructure/storage/inventory-repository-factory';
import { ICategoriaRepository } from '../domain/repositories/categoria-repository.interface';
import { createCategoriaRepository } from '../infrastructure/storage/categoria-repository-factory';
import { Categoria, puedeEliminarCategoria } from '../domain/models/categoria';
import { IRecetaRepository } from '../domain/repositories/receta-repository.interface';
import { createRecetaRepository } from '../infrastructure/storage/receta-repository-factory';
import { Receta } from '../domain/models/receta';
import { IAlmacenRepository } from '../domain/repositories/almacen-repository.interface';
import { createAlmacenRepository } from '../infrastructure/storage/almacen-repository-factory';
import { InsumoAlmacen, INSUMOS_PREDETERMINADOS } from '../domain/models/insumo-almacen';

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

export interface AlmacenContextType {
  almacenRepository: IAlmacenRepository;
  insumos: InsumoAlmacen[];
  loadingAlmacen: boolean;
  recargarAlmacen: () => Promise<void>;
  guardarInsumo: (insumo: InsumoAlmacen) => Promise<void>;
  eliminarInsumo: (id: string) => Promise<{ ok: boolean; motivo?: string }>;
  toggleDisponibleInsumo: (id: string) => Promise<void>;
}

export interface InventoryContextType extends CategoriaContextType, RecetaContextType, AlmacenContextType {
  repository: IInventoryRepository;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export interface InventoryProviderProps {
  children: React.ReactNode;
  repository?: IInventoryRepository;
  categoriaRepository?: ICategoriaRepository;
  recetaRepository?: IRecetaRepository;
  almacenRepository?: IAlmacenRepository;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({
  children,
  repository,
  categoriaRepository,
  recetaRepository,
  almacenRepository,
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

  const almacenRepoInstance = useMemo(
    () => almacenRepository ?? createAlmacenRepository(),
    [almacenRepository]
  );

  // Estados de Categorías
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  // Estados de Recetas
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loadingRecetas, setLoadingRecetas] = useState(true);

  // Estados de Almacén
  const [insumos, setInsumos] = useState<InsumoAlmacen[]>(INSUMOS_PREDETERMINADOS);
  const [loadingAlmacen, setLoadingAlmacen] = useState(true);

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

  const recargarAlmacen = useCallback(async () => {
    try {
      setLoadingAlmacen(true);
      await almacenRepoInstance.seedDefaults();
      const list = await almacenRepoInstance.getAll();
      setInsumos(list);
    } catch (err) {
      console.error('Error al cargar almacén:', err);
    } finally {
      setLoadingAlmacen(false);
    }
  }, [almacenRepoInstance]);

  useEffect(() => {
    recargarCategorias();
    recargarRecetas();
    recargarAlmacen();
  }, [recargarCategorias, recargarRecetas, recargarAlmacen]);

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

  const guardarInsumo = useCallback(
    async (insumo: InsumoAlmacen) => {
      await almacenRepoInstance.save(insumo);
      await recargarAlmacen();
    },
    [almacenRepoInstance, recargarAlmacen]
  );

  const eliminarInsumo = useCallback(
    async (id: string): Promise<{ ok: boolean; motivo?: string }> => {
      const insumo = await almacenRepoInstance.getById(id);
      if (!insumo) {
        return { ok: false, motivo: 'El insumo no existe en el almacén.' };
      }
      if (insumo.esPredeterminado) {
        return {
          ok: false,
          motivo: 'Los insumos predeterminados del catálogo básico no pueden eliminarse (podés marcarlos como "No tengo").',
        };
      }
      await almacenRepoInstance.delete(id);
      await recargarAlmacen();
      return { ok: true };
    },
    [almacenRepoInstance, recargarAlmacen]
  );

  const toggleDisponibleInsumo = useCallback(
    async (id: string) => {
      await almacenRepoInstance.toggleDisponible(id);
      await recargarAlmacen();
    },
    [almacenRepoInstance, recargarAlmacen]
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
      // 1. Consolidar requerimientos agrupados por botellaId
      const consolidado = new Map<string, number>();
      for (const desc of descuentos) {
        if (desc.cantidadMl <= 0) continue;
        const actual = consolidado.get(desc.botellaId) || 0;
        consolidado.set(desc.botellaId, actual + desc.cantidadMl);
      }

      const botellasAActualizar: { botella: any; nuevoVolumen: number }[] = [];

      // 2. Validar stock acumulado disponible
      for (const [botellaId, totalMl] of consolidado.entries()) {
        const botella = await repoInstance.getById(botellaId);
        if (!botella) {
          return { ok: false, motivo: `La botella no fue encontrada en el inventario.` };
        }
        if (botella.volumenRestanteMl < totalMl) {
          return {
            ok: false,
            motivo: `Stock insuficiente en ${botella.nombre} (${botella.marca}). Disponible: ${botella.volumenRestanteMl} ml, Requerido total: ${totalMl} ml.`,
          };
        }
        botellasAActualizar.push({
          botella,
          nuevoVolumen: Math.max(0, botella.volumenRestanteMl - totalMl),
        });
      }

      // 3. Persistir sin re-consultas redundantes
      for (const item of botellasAActualizar) {
        await repoInstance.save({
          ...item.botella,
          volumenRestanteMl: item.nuevoVolumen,
        });
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
      almacenRepository: almacenRepoInstance,
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
      insumos,
      loadingAlmacen,
      recargarAlmacen,
      guardarInsumo,
      eliminarInsumo,
      toggleDisponibleInsumo,
    }),
    [
      repoInstance,
      catRepoInstance,
      recetaRepoInstance,
      almacenRepoInstance,
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
      insumos,
      loadingAlmacen,
      recargarAlmacen,
      guardarInsumo,
      eliminarInsumo,
      toggleDisponibleInsumo,
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

export function useAlmacen(): AlmacenContextType {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useAlmacen debe ser utilizado dentro de un InventoryProvider');
  }
  return {
    almacenRepository: context.almacenRepository,
    insumos: context.insumos,
    loadingAlmacen: context.loadingAlmacen,
    recargarAlmacen: context.recargarAlmacen,
    guardarInsumo: context.guardarInsumo,
    eliminarInsumo: context.eliminarInsumo,
    toggleDisponibleInsumo: context.toggleDisponibleInsumo,
  };
}

export function useAlmacenOpcional(): AlmacenContextType | null {
  const context = useContext(InventoryContext);
  if (!context) {
    return null;
  }
  return {
    almacenRepository: context.almacenRepository,
    insumos: context.insumos,
    loadingAlmacen: context.loadingAlmacen,
    recargarAlmacen: context.recargarAlmacen,
    guardarInsumo: context.guardarInsumo,
    eliminarInsumo: context.eliminarInsumo,
    toggleDisponibleInsumo: context.toggleDisponibleInsumo,
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
