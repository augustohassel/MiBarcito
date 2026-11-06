import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { IInventoryRepository } from '../domain/repositories/inventory-repository.interface';
import { createInventoryRepository } from '../infrastructure/storage/inventory-repository-factory';
import { ICategoriaRepository } from '../domain/repositories/categoria-repository.interface';
import { createCategoriaRepository } from '../infrastructure/storage/categoria-repository-factory';
import { Categoria, CATEGORIAS_PREDETERMINADAS, puedeEliminarCategoria } from '../domain/models/categoria';
import { IRecetaRepository } from '../domain/repositories/receta-repository.interface';
import { createRecetaRepository } from '../infrastructure/storage/receta-repository-factory';
import { Receta, RECETAS_PREDETERMINADAS } from '../domain/models/receta';
import { IAlmacenRepository } from '../domain/repositories/almacen-repository.interface';
import { createAlmacenRepository } from '../infrastructure/storage/almacen-repository-factory';
import { InsumoAlmacen, INSUMOS_PREDETERMINADOS } from '../domain/models/insumo-almacen';
import { useAuth } from './AuthContext';
import { getFirebaseServices, traducirErrorFirebase } from '../infrastructure/firebase/firebase-client';
import { FirestoreInventoryRepository } from '../infrastructure/storage/firestore-inventory-repository';
import { FirestoreCategoriaRepository } from '../infrastructure/storage/firestore-categoria-repository';
import { FirestoreRecetaRepository } from '../infrastructure/storage/firestore-receta-repository';
import { FirestoreAlmacenRepository } from '../infrastructure/storage/firestore-almacen-repository';
import {
  CloudMigrationResult,
  exportBackupPayload,
  importBackupPayload,
  inspectLocalInventory,
  LocalStorageSummary,
  mergeLocalInventoryToFirestore,
  MiBarcitoBackupPayload,
} from '../infrastructure/storage/cloud-migration.service';

export interface CategoriaContextType {
  categoriaRepository: ICategoriaRepository;
  categorias: Categoria[];
  loadingCategorias: boolean;
  recargarCategorias: (options?: { silent?: boolean }) => Promise<void>;
  guardarCategoria: (categoria: Categoria) => Promise<void>;
  eliminarCategoria: (id: string) => Promise<{ ok: boolean; motivo?: string }>;
}

export interface RecetaContextType {
  recetaRepository: IRecetaRepository;
  recetas: Receta[];
  loadingRecetas: boolean;
  recargarRecetas: (options?: { silent?: boolean }) => Promise<void>;
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
  recargarAlmacen: (options?: { silent?: boolean }) => Promise<void>;
  guardarInsumo: (insumo: InsumoAlmacen) => Promise<void>;
  eliminarInsumo: (id: string) => Promise<{ ok: boolean; motivo?: string }>;
  toggleDisponibleInsumo: (id: string) => Promise<void>;
}

export interface CloudSyncContextType {
  isCloudActive: boolean;
  syncingCloud: boolean;
  lastMigrationResult: CloudMigrationResult | null;
  cloudSyncError: string | null;
  clearCloudSyncError: () => void;
  sincronizarDatosLocalesANube: () => Promise<CloudMigrationResult | null>;
  obtenerResumenLocalDispositivo: () => Promise<LocalStorageSummary>;
  exportarRespaldoJson: () => Promise<MiBarcitoBackupPayload>;
  importarRespaldoJson: (
    payload: Partial<MiBarcitoBackupPayload>
  ) => Promise<{ bebidasImportadas: number; recetasImportadas: number; insumosImportados: number }>;
}

export interface InventoryContextType
  extends CategoriaContextType,
    RecetaContextType,
    AlmacenContextType,
    CloudSyncContextType {
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
  const { user, reportCloudError } = useAuth();
  const firebaseServices = useMemo(() => getFirebaseServices(), []);

  // Repositorios locales (IndexedDB / InMemory) que SIEMPRE permanecen en el dispositivo
  const localInventoryRepo = useMemo(
    () => repository ?? createInventoryRepository(),
    [repository]
  );

  const localCatRepo = useMemo(
    () => categoriaRepository ?? createCategoriaRepository(),
    [categoriaRepository]
  );

  const localRecetaRepo = useMemo(
    () => recetaRepository ?? createRecetaRepository(),
    [recetaRepository]
  );

  const localAlmacenRepo = useMemo(
    () => almacenRepository ?? createAlmacenRepository(),
    [almacenRepository]
  );

  const [syncingCloud, setSyncingCloud] = useState(false);
  const [lastMigrationResult, setLastMigrationResult] = useState<CloudMigrationResult | null>(null);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [cloudReadyUid, setCloudReadyUid] = useState<string | null>(null);

  const handleCloudRepoError = useCallback(
    (err: unknown) => {
      const msg = traducirErrorFirebase(err);
      setCloudSyncError(msg);
      reportCloudError(err);
    },
    [reportCloudError]
  );

  const clearCloudSyncError = useCallback(() => {
    setCloudSyncError(null);
  }, []);

  const hasCustomInjectedRepos = Boolean(
    repository || categoriaRepository || recetaRepository || almacenRepository
  );

  // Cuando el usuario inicia sesión con Google, primero fusionamos de forma aditiva IndexedDB -> Firestore
  // antes de conmutar los repositorios activos a Firestore, garantizando que una cuenta vacía en la nube
  // jamás oculte ni pise las botellas que el usuario ya tenía guardadas en su celular.
  useEffect(() => {
    if (!user || !firebaseServices || hasCustomInjectedRepos) {
      setCloudReadyUid(null);
      return;
    }

    let cancelled = false;

    const inicializarSincronizacion = async () => {
      try {
        setSyncingCloud(true);
        setCloudSyncError(null);

        const resultado = await mergeLocalInventoryToFirestore(
          firebaseServices.db,
          user.uid,
          {
            inventoryRepo: localInventoryRepo,
            categoriaRepo: localCatRepo,
            recetaRepo: localRecetaRepo,
            almacenRepo: localAlmacenRepo,
          }
        );

        if (!cancelled) {
          setLastMigrationResult(resultado);
          setCloudReadyUid(user.uid);
        }
      } catch (err) {
        if (!cancelled) {
          handleCloudRepoError(err);
          // Si falla por permisos (ej. 403 permission-denied), mantenemos los repositorios locales activos
          // para no perder operatividad ni mostrar pantalla vacía.
          setCloudReadyUid(null);
        }
      } finally {
        if (!cancelled) {
          setSyncingCloud(false);
        }
      }
    };

    inicializarSincronizacion();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    firebaseServices,
    hasCustomInjectedRepos,
    localInventoryRepo,
    localCatRepo,
    localRecetaRepo,
    localAlmacenRepo,
    handleCloudRepoError,
  ]);

  const isCloudActive = Boolean(
    user && firebaseServices && cloudReadyUid === user.uid && !hasCustomInjectedRepos
  );

  const repoInstance = useMemo<IInventoryRepository>(() => {
    if (isCloudActive && firebaseServices && user) {
      return new FirestoreInventoryRepository(
        firebaseServices.db,
        user.uid,
        localInventoryRepo,
        handleCloudRepoError
      );
    }
    return localInventoryRepo;
  }, [isCloudActive, firebaseServices, user, localInventoryRepo, handleCloudRepoError]);

  const catRepoInstance = useMemo<ICategoriaRepository>(() => {
    if (isCloudActive && firebaseServices && user) {
      return new FirestoreCategoriaRepository(
        firebaseServices.db,
        user.uid,
        localCatRepo,
        handleCloudRepoError
      );
    }
    return localCatRepo;
  }, [isCloudActive, firebaseServices, user, localCatRepo, handleCloudRepoError]);

  const recetaRepoInstance = useMemo<IRecetaRepository>(() => {
    if (isCloudActive && firebaseServices && user) {
      return new FirestoreRecetaRepository(
        firebaseServices.db,
        user.uid,
        localRecetaRepo,
        handleCloudRepoError
      );
    }
    return localRecetaRepo;
  }, [isCloudActive, firebaseServices, user, localRecetaRepo, handleCloudRepoError]);

  const almacenRepoInstance = useMemo<IAlmacenRepository>(() => {
    if (isCloudActive && firebaseServices && user) {
      return new FirestoreAlmacenRepository(
        firebaseServices.db,
        user.uid,
        localAlmacenRepo,
        handleCloudRepoError
      );
    }
    return localAlmacenRepo;
  }, [isCloudActive, firebaseServices, user, localAlmacenRepo, handleCloudRepoError]);

  // Estados de Categorías
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_PREDETERMINADAS);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  // Estados de Recetas
  const [recetas, setRecetas] = useState<Receta[]>(RECETAS_PREDETERMINADAS);
  const [loadingRecetas, setLoadingRecetas] = useState(true);

  // Estados de Almacén
  const [insumos, setInsumos] = useState<InsumoAlmacen[]>(INSUMOS_PREDETERMINADOS);
  const [loadingAlmacen, setLoadingAlmacen] = useState(true);

  const recargarCategorias = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      try {
        if (!silent) {
          setLoadingCategorias(true);
        }
        await catRepoInstance.seedDefaults();
        const list = await catRepoInstance.getAll();
        setCategorias(list);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      } finally {
        if (!silent) {
          setLoadingCategorias(false);
        }
      }
    },
    [catRepoInstance]
  );

  const recargarRecetas = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      try {
        if (!silent) {
          setLoadingRecetas(true);
        }
        await recetaRepoInstance.seedDefaults();
        const list = await recetaRepoInstance.getAll();
        setRecetas(list);
      } catch (err) {
        console.error('Error al cargar recetas:', err);
      } finally {
        if (!silent) {
          setLoadingRecetas(false);
        }
      }
    },
    [recetaRepoInstance]
  );

  const recargarAlmacen = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      try {
        if (!silent) {
          setLoadingAlmacen(true);
        }
        await almacenRepoInstance.seedDefaults();
        const list = await almacenRepoInstance.getAll();
        setInsumos(list);
      } catch (err) {
        console.error('Error al cargar almacén:', err);
      } finally {
        if (!silent) {
          setLoadingAlmacen(false);
        }
      }
    },
    [almacenRepoInstance]
  );

  useEffect(() => {
    recargarCategorias();
    recargarRecetas();
    recargarAlmacen();
  }, [recargarCategorias, recargarRecetas, recargarAlmacen]);

  const sincronizarDatosLocalesANube = useCallback(async (): Promise<CloudMigrationResult | null> => {
    if (!user || !firebaseServices) {
      return null;
    }

    try {
      setSyncingCloud(true);
      setCloudSyncError(null);

      const resultado = await mergeLocalInventoryToFirestore(
        firebaseServices.db,
        user.uid,
        {
          inventoryRepo: localInventoryRepo,
          categoriaRepo: localCatRepo,
          recetaRepo: localRecetaRepo,
          almacenRepo: localAlmacenRepo,
        }
      );

      setLastMigrationResult(resultado);
      setCloudReadyUid(user.uid);
      await Promise.all([recargarCategorias(), recargarRecetas(), recargarAlmacen()]);
      return resultado;
    } catch (err) {
      handleCloudRepoError(err);
      return null;
    } finally {
      setSyncingCloud(false);
    }
  }, [
    user,
    firebaseServices,
    localInventoryRepo,
    localCatRepo,
    localRecetaRepo,
    localAlmacenRepo,
    recargarCategorias,
    recargarRecetas,
    recargarAlmacen,
    handleCloudRepoError,
  ]);

  const obtenerResumenLocalDispositivo = useCallback(async (): Promise<LocalStorageSummary> => {
    return inspectLocalInventory({
      inventoryRepo: localInventoryRepo,
      categoriaRepo: localCatRepo,
      recetaRepo: localRecetaRepo,
      almacenRepo: localAlmacenRepo,
    });
  }, [localInventoryRepo, localCatRepo, localRecetaRepo, localAlmacenRepo]);

  const exportarRespaldoJson = useCallback(async (): Promise<MiBarcitoBackupPayload> => {
    return exportBackupPayload({
      inventoryRepo: repoInstance,
      categoriaRepo: catRepoInstance,
      recetaRepo: recetaRepoInstance,
      almacenRepo: almacenRepoInstance,
    });
  }, [repoInstance, catRepoInstance, recetaRepoInstance, almacenRepoInstance]);

  const importarRespaldoJson = useCallback(
    async (payload: Partial<MiBarcitoBackupPayload>) => {
      const res = await importBackupPayload(payload, {
        inventoryRepo: repoInstance,
        categoriaRepo: catRepoInstance,
        recetaRepo: recetaRepoInstance,
        almacenRepo: almacenRepoInstance,
      });
      await Promise.all([recargarCategorias(), recargarRecetas(), recargarAlmacen()]);
      return res;
    },
    [
      repoInstance,
      catRepoInstance,
      recetaRepoInstance,
      almacenRepoInstance,
      recargarCategorias,
      recargarRecetas,
      recargarAlmacen,
    ]
  );

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
      let recetaPrevia: Receta | undefined;
      setRecetas((prev) => {
        recetaPrevia = prev.find((r) => r.id === receta.id);
        const idx = prev.findIndex((r) => r.id === receta.id);
        if (idx >= 0) {
          const copia = [...prev];
          copia[idx] = receta;
          return copia;
        }
        return [...prev, receta];
      });

      try {
        await recetaRepoInstance.save(receta);
        await recargarRecetas({ silent: true });
      } catch (err) {
        // Rollback
        if (recetaPrevia) {
          const snapshot = recetaPrevia;
          setRecetas((prev) => prev.map((r) => (r.id === receta.id ? snapshot : r)));
        } else {
          setRecetas((prev) => prev.filter((r) => r.id !== receta.id));
        }
        throw err;
      }
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
      await recargarRecetas({ silent: true });
      return { ok: true };
    },
    [recetaRepoInstance, recargarRecetas]
  );

  const toggleFavoritoReceta = useCallback(
    async (id: string) => {
      let recetaPrevia: Receta | undefined;
      setRecetas((prev) => {
        recetaPrevia = prev.find((r) => r.id === id);
        return prev.map((r) =>
          r.id === id
            ? {
                ...r,
                esFavorito: !r.esFavorito,
                fechaActualizacion: new Date().toISOString(),
              }
            : r
        );
      });

      try {
        await recetaRepoInstance.toggleFavorito(id);
        await recargarRecetas({ silent: true });
      } catch (err) {
        // Rollback
        if (recetaPrevia) {
          const snapshot = recetaPrevia;
          setRecetas((prev) => prev.map((r) => (r.id === id ? snapshot : r)));
        }
        throw err;
      }
    },
    [recetaRepoInstance, recargarRecetas]
  );

  const guardarInsumo = useCallback(
    async (insumo: InsumoAlmacen) => {
      setInsumos((prev) => {
        const idx = prev.findIndex((i) => i.id === insumo.id);
        if (idx >= 0) {
          const copia = [...prev];
          copia[idx] = insumo;
          return copia;
        }
        return [...prev, insumo];
      });
      await almacenRepoInstance.save(insumo);
      await recargarAlmacen({ silent: true });
    },
    [almacenRepoInstance, recargarAlmacen]
  );

  const eliminarInsumo = useCallback(
    async (id: string): Promise<{ ok: boolean; motivo?: string }> => {
      const insumo =
        (await almacenRepoInstance.getById(id)) ?? insumos.find((i) => i.id === id);
      if (!insumo) {
        return { ok: false, motivo: 'El insumo no existe en el almacén.' };
      }
      if (insumo.esPredeterminado) {
        return {
          ok: false,
          motivo: 'Los insumos predeterminados del catálogo básico no pueden eliminarse (podés marcarlos como "No tengo").',
        };
      }
      setInsumos((prev) => prev.filter((i) => i.id !== id));
      await almacenRepoInstance.delete(id);
      await recargarAlmacen({ silent: true });
      return { ok: true };
    },
    [almacenRepoInstance, insumos, recargarAlmacen]
  );

  const toggleDisponibleInsumo = useCallback(
    async (id: string) => {
      setInsumos((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                disponible: !i.disponible,
                fechaActualizacion: new Date().toISOString(),
              }
            : i
        )
      );
      await almacenRepoInstance.toggleDisponible(id);
      await recargarAlmacen({ silent: true });
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
      isCloudActive,
      syncingCloud,
      lastMigrationResult,
      cloudSyncError,
      clearCloudSyncError,
      sincronizarDatosLocalesANube,
      obtenerResumenLocalDispositivo,
      exportarRespaldoJson,
      importarRespaldoJson,
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
      isCloudActive,
      syncingCloud,
      lastMigrationResult,
      cloudSyncError,
      clearCloudSyncError,
      sincronizarDatosLocalesANube,
      obtenerResumenLocalDispositivo,
      exportarRespaldoJson,
      importarRespaldoJson,
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

export function useCloudSync(): CloudSyncContextType {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useCloudSync debe ser utilizado dentro de un InventoryProvider');
  }
  return {
    isCloudActive: context.isCloudActive,
    syncingCloud: context.syncingCloud,
    lastMigrationResult: context.lastMigrationResult,
    cloudSyncError: context.cloudSyncError,
    clearCloudSyncError: context.clearCloudSyncError,
    sincronizarDatosLocalesANube: context.sincronizarDatosLocalesANube,
    obtenerResumenLocalDispositivo: context.obtenerResumenLocalDispositivo,
    exportarRespaldoJson: context.exportarRespaldoJson,
    importarRespaldoJson: context.importarRespaldoJson,
  };
}
