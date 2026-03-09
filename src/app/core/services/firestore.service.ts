import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  CollectionReference,
  DocumentReference,
  QueryConstraint,
  Timestamp,
  writeBatch,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);

  // ===== Generic helpers =====

  doc<T>(path: string): DocumentReference<T> {
    return doc(this.firestore, path) as DocumentReference<T>;
  }

  collection<T>(path: string): CollectionReference<T> {
    return collection(this.firestore, path) as CollectionReference<T>;
  }

  async get<T>(path: string): Promise<T | null> {
    const snap = await getDoc(this.doc<T>(path));
    return snap.exists() ? { id: snap.id, ...snap.data() } as T : null;
  }

  async set<T extends Record<string, unknown>>(path: string, data: T): Promise<void> {
    await setDoc(this.doc(path), data);
  }

  async update(path: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(this.doc(path), data);
  }

  async delete(path: string): Promise<void> {
    await deleteDoc(this.doc(path));
  }

  async query<T>(collectionPath: string, ...constraints: QueryConstraint[]): Promise<T[]> {
    const ref = this.collection<T>(collectionPath);
    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T);
  }

  onSnapshot<T>(
    path: string,
    callback: (data: T | null) => void
  ): () => void {
    return onSnapshot(this.doc<T>(path), (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } as T : null);
    });
  }

  onCollectionSnapshot<T>(
    collectionPath: string,
    callback: (data: T[]) => void,
    ...constraints: QueryConstraint[]
  ): () => void {
    const ref = this.collection<T>(collectionPath);
    const q = constraints.length ? query(ref, ...constraints) : query(ref);
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as T));
    });
  }

  batch() {
    return writeBatch(this.firestore);
  }

  timestamp(): Timestamp {
    return Timestamp.now();
  }
}
