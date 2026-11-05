import { collection, doc, getDocs, writeBatch, Firestore } from 'firebase/firestore';
import { Bebida } from '../../domain/models/bebida';
import { Categoria, CATEGORIAS_PREDETERMINADAS } from '../../domain/models/categoria';
import { Receta } from '../../domain/models/receta';
import { InsumoAlmacen } from '../../domain/models/insumo-almacen';
import { IInventoryRepository } from '../../domain/repositories/inventory-repository.interface';
import { ICategoriaRepository } from '../../domain/repositories/categoria-repository.interface';
import { IRecetaRepository } from '../../domain/repositories/receta-repository.interface';
import { IAlmacenRepository } from '../../domain/repositories/almacen-repository.interface';
import { sanitizeForFirestore } from './firestore-inventory-repository';

export interface LocalStorageSummary {
  bebidasCount: number;
  categoriasCustomCount: number;
  recetasPropiasCount: number;
  recetasFavoritasCount: number;
  insumosCustomCount: number;
  bebidas: Bebida[];
  categorias: Categoria[];
  recetas: Receta[];
  insumos: InsumoAlmacen[];
}

export interface CloudMigrationResult {
  bebidasSubidas: number;
  categoriasSubidas: number;
  recetasSubidas: number;
  insumosSubidos: number;
  totalOperaciones: number;
  totalBebidasEnNube: number;
  totalRecetasEnNube: number;
}

export interface MiBarcitoBackupPayload {
  version: number;
  exportedAt: string;
  bebidas: Bebida[];
  categorias: Categoria[];
  recetas: Receta[];
  insumos: InsumoAlmacen[];
}

function esMasReciente(fechaA?: string, fechaB?: string): boolean {
  if (!fechaA) return false;
  if (!fechaB) return true;
  const tA = Date.parse(fechaA);
  const tB = Date.parse(fechaB);
  if (Number.isNaN(tA)) return false;
  if (Number.isNaN(tB)) return true;
  return tA > tB;
}

/**
 * Obtiene un resumen del inventario guardado localmente en el dispositivo (IndexedDB).
 */
export async function inspectLocalInventory(repos: {
  inventoryRepo: IInventoryRepository;
  categoriaRepo: ICategoriaRepository;
  recetaRepo: IRecetaRepository;
  almacenRepo: IAlmacenRepository;
}): Promise<LocalStorageSummary> {
  const [bebidas, categorias, recetas, insumos] = await Promise.all([
    repos.inventoryRepo.getAll(),
    repos.categoriaRepo.getAll(),
    repos.recetaRepo.getAll(),
    repos.almacenRepo.getAll(),
  ]);

  const categoriasCustomCount = categorias.filter((c) => !c.esPredeterminada).length;
  const recetasPropiasCount = recetas.filter((r) => r.esPropia).length;
  const recetasFavoritasCount = recetas.filter((r) => r.esFavorito).length;
  const insumosCustomCount = insumos.filter((i) => !i.esPredeterminado).length;

  return {
    bebidasCount: bebidas.length,
    categoriasCustomCount,
    recetasPropiasCount,
    recetasFavoritasCount,
    insumosCustomCount,
    bebidas,
    categorias,
    recetas,
    insumos,
  };
}

/**
 * Realiza una fusión aditiva y no destructiva desde los repositorios locales (IndexedDB)
 * hacia Cloud Firestore (`users/{uid}/...`).
 *
 * Reglas de seguridad para proteger las botellas cargadas en el celular:
 * 1. NUNCA vacía ni elimina documentos de IndexedDB ni de Firestore.
 * 2. Toda botella local que no esté en Firestore se sube íntegra. Si el mismo ID existe en ambos lados,
 *    prevalece la que tenga `fechaActualizacion` más reciente.
 * 3. Categorías: sube categorías personalizadas y une las `subcategorias` de las predeterminadas sin duplicados.
 * 4. Recetas: sube todas las recetas propias (`esPropia: true`) y preserva `esFavorito: true` si estaba marcado en local o en nube.
 * 5. Insumos: sube insumos personalizados y actualiza disponibilidad si el registro local es más reciente.
 */
export async function mergeLocalInventoryToFirestore(
  db: Firestore,
  uid: string,
  localRepos: {
    inventoryRepo: IInventoryRepository;
    categoriaRepo: ICategoriaRepository;
    recetaRepo: IRecetaRepository;
    almacenRepo: IAlmacenRepository;
  }
): Promise<CloudMigrationResult> {
  const localData = await inspectLocalInventory(localRepos);

  const [cloudBebidasSnap, cloudCategoriasSnap, cloudRecetasSnap, cloudInsumosSnap] =
    await Promise.all([
      getDocs(collection(db, 'users', uid, 'bebidas')),
      getDocs(collection(db, 'users', uid, 'categorias')),
      getDocs(collection(db, 'users', uid, 'recetas')),
      getDocs(collection(db, 'users', uid, 'insumos')),
    ]);

  const cloudBebidas = new Map<string, Bebida>();
  cloudBebidasSnap.forEach((d) => cloudBebidas.set(d.id, d.data() as Bebida));

  const cloudCategorias = new Map<string, Categoria>();
  cloudCategoriasSnap.forEach((d) => cloudCategorias.set(d.id, d.data() as Categoria));

  const cloudRecetas = new Map<string, Receta>();
  cloudRecetasSnap.forEach((d) => cloudRecetas.set(d.id, d.data() as Receta));

  const cloudInsumos = new Map<string, InsumoAlmacen>();
  cloudInsumosSnap.forEach((d) => cloudInsumos.set(d.id, d.data() as InsumoAlmacen));

  const batch = writeBatch(db);
  let batchWritesCount = 0;
  let bebidasSubidas = 0;
  let categoriasSubidas = 0;
  let recetasSubidas = 0;
  let insumosSubidos = 0;

  // Asegurar que el documento raíz `users/{uid}` exista como documento real en Firestore
  // para que aparezca listado inmediatamente en la Consola de Firebase / GCP (y no en cursiva como documento fantasma)
  batch.set(
    doc(db, 'users', uid),
    {
      uid,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  batchWritesCount++;

  // 1. Fusión de Bebidas (Botellas del bar)
  for (const localBebida of localData.bebidas) {
    const remota = cloudBebidas.get(localBebida.id);
    if (!remota || esMasReciente(localBebida.fechaActualizacion, remota.fechaActualizacion)) {
      const ref = doc(db, 'users', uid, 'bebidas', localBebida.id);
      batch.set(ref, sanitizeForFirestore(localBebida));
      cloudBebidas.set(localBebida.id, localBebida);
      batchWritesCount++;
      bebidasSubidas++;
    }
  }

  // 2. Fusión de Categorías (personalizadas y subcategorías agregadas)
  for (const localCat of localData.categorias) {
    const remota = cloudCategorias.get(localCat.id);
    if (!remota) {
      const ref = doc(db, 'users', uid, 'categorias', localCat.id);
      batch.set(ref, sanitizeForFirestore(localCat));
      batchWritesCount++;
      categoriasSubidas++;
    } else {
      const subLocales = localCat.subcategorias ?? [];
      const subRemotas = remota.subcategorias ?? [];
      const unionSub = Array.from(new Set([...subRemotas, ...subLocales]));
      const hayNuevasSub = unionSub.length > subRemotas.length;
      const localMasReciente = esMasReciente(
        localCat.fechaActualizacion,
        remota.fechaActualizacion
      );

      if (hayNuevasSub || localMasReciente) {
        const fusionada: Categoria = {
          ...(localMasReciente ? localCat : remota),
          subcategorias: unionSub,
        };
        const ref = doc(db, 'users', uid, 'categorias', localCat.id);
        batch.set(ref, sanitizeForFirestore(fusionada));
        batchWritesCount++;
        categoriasSubidas++;
      }
    }
  }

  // Si la nube aún no tenía categorías predeterminadas y local tampoco tenía alguna, asegurarlas
  if (cloudCategorias.size === 0 && localData.categorias.length === 0) {
    for (const cat of CATEGORIAS_PREDETERMINADAS) {
      const ref = doc(db, 'users', uid, 'categorias', cat.id);
      batch.set(ref, sanitizeForFirestore(cat));
      batchWritesCount++;
    }
  }

  // 3. Fusión de Recetas (Recetas de autor y favoritos marcados)
  for (const localRec of localData.recetas) {
    const remota = cloudRecetas.get(localRec.id);
    if (!remota) {
      const ref = doc(db, 'users', uid, 'recetas', localRec.id);
      batch.set(ref, sanitizeForFirestore(localRec));
      batchWritesCount++;
      if (localRec.esPropia || localRec.esFavorito) {
        recetasSubidas++;
      }
    } else if (localRec.esPropia) {
      if (esMasReciente(localRec.fechaActualizacion, remota.fechaActualizacion)) {
        const ref = doc(db, 'users', uid, 'recetas', localRec.id);
        batch.set(
          ref,
          sanitizeForFirestore({
            ...localRec,
            esFavorito: Boolean(localRec.esFavorito || remota.esFavorito),
          })
        );
        batchWritesCount++;
        recetasSubidas++;
      }
    } else if (localRec.esFavorito && !remota.esFavorito) {
      const ref = doc(db, 'users', uid, 'recetas', localRec.id);
      batch.set(
        ref,
        sanitizeForFirestore({
          ...remota,
          esFavorito: true,
          fechaActualizacion: localRec.fechaActualizacion || new Date().toISOString(),
        })
      );
      batchWritesCount++;
      recetasSubidas++;
    }
  }

  // 4. Fusión de Insumos de Almacén
  for (const localIns of localData.insumos) {
    const remoto = cloudInsumos.get(localIns.id);
    if (!remoto) {
      const ref = doc(db, 'users', uid, 'insumos', localIns.id);
      batch.set(ref, sanitizeForFirestore(localIns));
      batchWritesCount++;
      if (!localIns.esPredeterminado) {
        insumosSubidos++;
      }
    } else if (esMasReciente(localIns.fechaActualizacion, remoto.fechaActualizacion)) {
      if (
        localIns.disponible !== remoto.disponible ||
        localIns.nombre !== remoto.nombre ||
        !localIns.esPredeterminado
      ) {
        const ref = doc(db, 'users', uid, 'insumos', localIns.id);
        batch.set(ref, sanitizeForFirestore(localIns));
        batchWritesCount++;
        insumosSubidos++;
      }
    }
  }

  const totalOperaciones =
    bebidasSubidas + categoriasSubidas + recetasSubidas + insumosSubidos;

  if (batchWritesCount > 0) {
    await batch.commit();
  }

  return {
    bebidasSubidas,
    categoriasSubidas,
    recetasSubidas,
    insumosSubidos,
    totalOperaciones,
    totalBebidasEnNube: cloudBebidas.size,
    totalRecetasEnNube: Math.max(cloudRecetas.size, localData.recetas.length),
  };
}

/**
 * Construye un objeto JSON exportable con todo el inventario actual.
 */
export async function exportBackupPayload(repos: {
  inventoryRepo: IInventoryRepository;
  categoriaRepo: ICategoriaRepository;
  recetaRepo: IRecetaRepository;
  almacenRepo: IAlmacenRepository;
}): Promise<MiBarcitoBackupPayload> {
  const [bebidas, categorias, recetas, insumos] = await Promise.all([
    repos.inventoryRepo.getAll(),
    repos.categoriaRepo.getAll(),
    repos.recetaRepo.getAll(),
    repos.almacenRepo.getAll(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    bebidas,
    categorias,
    recetas,
    insumos,
  };
}

/**
 * Importa de forma aditiva un archivo JSON de respaldo en los repositorios activos.
 */
export async function importBackupPayload(
  payload: Partial<MiBarcitoBackupPayload>,
  activeRepos: {
    inventoryRepo: IInventoryRepository;
    categoriaRepo: ICategoriaRepository;
    recetaRepo: IRecetaRepository;
    almacenRepo: IAlmacenRepository;
  }
): Promise<{ bebidasImportadas: number; recetasImportadas: number; insumosImportados: number }> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('El archivo de respaldo no tiene un formato JSON válido.');
  }

  let bebidasImportadas = 0;
  let recetasImportadas = 0;
  let insumosImportados = 0;

  if (Array.isArray(payload.categorias)) {
    for (const cat of payload.categorias) {
      if (cat && typeof cat.id === 'string' && typeof cat.nombre === 'string') {
        await activeRepos.categoriaRepo.save(cat);
      }
    }
  }

  if (Array.isArray(payload.bebidas)) {
    for (const beb of payload.bebidas) {
      if (beb && typeof beb.id === 'string' && typeof beb.nombre === 'string') {
        await activeRepos.inventoryRepo.save(beb);
        bebidasImportadas++;
      }
    }
  }

  if (Array.isArray(payload.recetas)) {
    for (const rec of payload.recetas) {
      if (rec && typeof rec.id === 'string' && typeof rec.nombre === 'string') {
        await activeRepos.recetaRepo.save(rec);
        if (rec.esPropia || rec.esFavorito) {
          recetasImportadas++;
        }
      }
    }
  }

  if (Array.isArray(payload.insumos)) {
    for (const ins of payload.insumos) {
      if (ins && typeof ins.id === 'string' && typeof ins.nombre === 'string') {
        await activeRepos.almacenRepo.save(ins);
        insumosImportados++;
      }
    }
  }

  return {
    bebidasImportadas,
    recetasImportadas,
    insumosImportados,
  };
}

