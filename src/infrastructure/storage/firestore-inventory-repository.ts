import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  Firestore,
  CollectionReference,
} from 'firebase/firestore';
import { Bebida } from '../../domain/models/bebida';
import { IInventoryRepository } from '../../domain/repositories/inventory-repository.interface';

/**
 * Elimina recursivamente propiedades con valor `undefined` para cumplir con la restricción de Firestore.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

/**
 * Elimina todos los documentos de una colección de Firestore en un único writeBatch.
 */
export async function clearCollectionDocs(
  db: Firestore,
  colRef: CollectionReference
): Promise<void> {
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
  }
  await batch.commit();
}

/**
 * Implementación de IInventoryRepository en Cloud Firestore bajo `users/{uid}/bebidas`.
 * Opcionalmente replica en segundo plano en IndexedDB local para mantener respaldo en el dispositivo.
 */
export class FirestoreInventoryRepository implements IInventoryRepository {
  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
    private readonly localFallback?: IInventoryRepository,
    private readonly onError?: (err: unknown) => void
  ) {}

  private get colRef() {
    return collection(this.db, 'users', this.uid, 'bebidas');
  }

  async getAll(): Promise<Bebida[]> {
    try {
      const snapshot = await getDocs(this.colRef);
      return snapshot.docs.map((d) => d.data() as Bebida);
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        return this.localFallback.getAll();
      }
      throw err;
    }
  }

  async getById(id: string): Promise<Bebida | undefined> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'bebidas', id);
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as Bebida) : undefined;
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        return this.localFallback.getById(id);
      }
      throw err;
    }
  }

  async save(bebida: Bebida): Promise<void> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'bebidas', bebida.id);
      await setDoc(ref, sanitizeForFirestore(bebida));
      if (this.localFallback) {
        await this.localFallback.save(bebida).catch(() => {});
      }
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'bebidas', id);
      await deleteDoc(ref);
      if (this.localFallback) {
        await this.localFallback.delete(id).catch(() => {});
      }
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async clear(): Promise<void> {
    try {
      await clearCollectionDocs(this.db, this.colRef);
      if (this.localFallback) {
        await this.localFallback.clear().catch(() => {});
      }
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }
}

