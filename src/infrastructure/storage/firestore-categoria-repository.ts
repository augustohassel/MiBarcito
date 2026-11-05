import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import {
  Categoria,
  CATEGORIAS_PREDETERMINADAS,
  enriquecerSubcategorias,
} from '../../domain/models/categoria';
import { ICategoriaRepository } from '../../domain/repositories/categoria-repository.interface';
import {
  clearCollectionDocs,
  sanitizeForFirestore,
} from './firestore-inventory-repository';

/**
 * Implementación de ICategoriaRepository en Cloud Firestore bajo `users/{uid}/categorias`.
 */
export class FirestoreCategoriaRepository implements ICategoriaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
    private readonly localFallback?: ICategoriaRepository,
    private readonly onError?: (err: unknown) => void
  ) {}

  private get colRef() {
    return collection(this.db, 'users', this.uid, 'categorias');
  }

  async getAll(): Promise<Categoria[]> {
    try {
      const snapshot = await getDocs(this.colRef);
      const categorias = snapshot.docs.map((d) => enriquecerSubcategorias(d.data() as Categoria));
      return categorias.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        return this.localFallback.getAll();
      }
      throw err;
    }
  }

  async getById(id: string): Promise<Categoria | undefined> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'categorias', id);
      const snap = await getDoc(ref);
      return snap.exists() ? enriquecerSubcategorias(snap.data() as Categoria) : undefined;
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        return this.localFallback.getById(id);
      }
      throw err;
    }
  }

  async save(categoria: Categoria): Promise<void> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'categorias', categoria.id);
      await setDoc(ref, sanitizeForFirestore(categoria));
      if (this.localFallback) {
        await this.localFallback.save(categoria).catch(() => {});
      }
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'categorias', id);
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
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async seedDefaults(): Promise<void> {
    try {
      const snapshot = await getDocs(this.colRef);
      if (snapshot.empty) {
        const batch = writeBatch(this.db);
        for (const cat of CATEGORIAS_PREDETERMINADAS) {
          const ref = doc(this.db, 'users', this.uid, 'categorias', cat.id);
          batch.set(ref, sanitizeForFirestore(cat));
        }
        await batch.commit();
      }
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        await this.localFallback.seedDefaults();
      }
    }
  }
}

