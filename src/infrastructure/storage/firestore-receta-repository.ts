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
  Receta,
  RECETAS_PREDETERMINADAS,
  enriquecerRecetaPredeterminada,
} from '../../domain/models/receta';
import { IRecetaRepository } from '../../domain/repositories/receta-repository.interface';
import {
  clearCollectionDocs,
  sanitizeForFirestore,
} from './firestore-inventory-repository';

/**
 * Implementación de IRecetaRepository en Cloud Firestore bajo `users/{uid}/recetas`.
 */
export class FirestoreRecetaRepository implements IRecetaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
    private readonly localFallback?: IRecetaRepository,
    private readonly onError?: (err: unknown) => void
  ) {}

  private get colRef() {
    return collection(this.db, 'users', this.uid, 'recetas');
  }

  async getAll(): Promise<Receta[]> {
    try {
      const snapshot = await getDocs(this.colRef);
      const recetas = snapshot.docs.map((d) =>
        enriquecerRecetaPredeterminada(d.data() as Receta)
      );
      return recetas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        return this.localFallback.getAll();
      }
      throw err;
    }
  }

  async getById(id: string): Promise<Receta | undefined> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'recetas', id);
      const snap = await getDoc(ref);
      return snap.exists()
        ? enriquecerRecetaPredeterminada(snap.data() as Receta)
        : undefined;
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        return this.localFallback.getById(id);
      }
      throw err;
    }
  }

  async save(receta: Receta): Promise<void> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'recetas', receta.id);
      await setDoc(ref, sanitizeForFirestore(receta));
      if (this.localFallback) {
        await this.localFallback.save(receta).catch(() => {});
      }
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'recetas', id);
      await deleteDoc(ref);
      if (this.localFallback) {
        await this.localFallback.delete(id).catch(() => {});
      }
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async toggleFavorito(id: string): Promise<Receta | undefined> {
    try {
      const actual = await this.getById(id);
      if (!actual) return undefined;
      const updated: Receta = {
        ...actual,
        esFavorito: !actual.esFavorito,
        fechaActualizacion: new Date().toISOString(),
      };
      await this.save(updated);
      return updated;
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
        for (const rec of RECETAS_PREDETERMINADAS) {
          const ref = doc(this.db, 'users', this.uid, 'recetas', rec.id);
          batch.set(ref, sanitizeForFirestore(rec));
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

