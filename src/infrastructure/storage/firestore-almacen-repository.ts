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
import { InsumoAlmacen, INSUMOS_PREDETERMINADOS } from '../../domain/models/insumo-almacen';
import { IAlmacenRepository } from '../../domain/repositories/almacen-repository.interface';
import {
  clearCollectionDocs,
  sanitizeForFirestore,
} from './firestore-inventory-repository';

/**
 * Implementación de IAlmacenRepository en Cloud Firestore bajo `users/{uid}/insumos`.
 */
export class FirestoreAlmacenRepository implements IAlmacenRepository {
  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
    private readonly localFallback?: IAlmacenRepository,
    private readonly onError?: (err: unknown) => void
  ) {}

  private get colRef() {
    return collection(this.db, 'users', this.uid, 'insumos');
  }

  async getAll(): Promise<InsumoAlmacen[]> {
    try {
      const snapshot = await getDocs(this.colRef);
      const items = snapshot.docs.map((d) => d.data() as InsumoAlmacen);
      return items.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        return this.localFallback.getAll();
      }
      throw err;
    }
  }

  async getById(id: string): Promise<InsumoAlmacen | undefined> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'insumos', id);
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as InsumoAlmacen) : undefined;
    } catch (err) {
      this.onError?.(err);
      if (this.localFallback) {
        return this.localFallback.getById(id);
      }
      throw err;
    }
  }

  async save(insumo: InsumoAlmacen): Promise<void> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'insumos', insumo.id);
      await setDoc(ref, sanitizeForFirestore(insumo));
      if (this.localFallback) {
        await this.localFallback.save(insumo).catch(() => {});
      }
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const ref = doc(this.db, 'users', this.uid, 'insumos', id);
      await deleteDoc(ref);
      if (this.localFallback) {
        await this.localFallback.delete(id).catch(() => {});
      }
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async toggleDisponible(id: string): Promise<InsumoAlmacen | undefined> {
    try {
      let item = await this.getById(id);
      if (!item) {
        item = INSUMOS_PREDETERMINADOS.find((ins) => ins.id === id);
        if (!item) return undefined;
      }
      const updated: InsumoAlmacen = {
        ...item,
        disponible: !item.disponible,
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
        for (const ins of INSUMOS_PREDETERMINADOS) {
          const ref = doc(this.db, 'users', this.uid, 'insumos', ins.id);
          batch.set(ref, sanitizeForFirestore(ins));
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

