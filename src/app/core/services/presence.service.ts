import { Injectable, inject, signal } from '@angular/core';
import { Database, ref, set, onValue, onDisconnect, serverTimestamp } from '@angular/fire/database';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private db = inject(Database);
  private auth = inject(AuthService);

  readonly partnerOnline = signal(false);
  readonly partnerLastSeen = signal<Date | null>(null);

  private unsubscribe: (() => void) | null = null;

  async goOnline(pairId: string): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;

    const presenceRef = ref(this.db, `presence/${pairId}/${uid}`);

    // Set current user online
    await set(presenceRef, {
      online: true,
      lastSeen: serverTimestamp(),
      ready: false,
    });

    // Clean up on disconnect
    const disconnectRef = onDisconnect(presenceRef);
    await disconnectRef.set({
      online: false,
      lastSeen: serverTimestamp(),
      ready: false,
    });
  }

  watchPartner(pairId: string, partnerUid: string): void {
    this.stopWatching();

    const partnerRef = ref(this.db, `presence/${pairId}/${partnerUid}`);
    const unsub = onValue(partnerRef, (snap) => {
      const data = snap.val();
      if (data) {
        this.partnerOnline.set(data.online === true);
        if (data.lastSeen) {
          this.partnerLastSeen.set(new Date(data.lastSeen));
        }
      } else {
        this.partnerOnline.set(false);
        this.partnerLastSeen.set(null);
      }
    });

    this.unsubscribe = () => unsub();
  }

  async setReady(pairId: string, ready: boolean): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    const presenceRef = ref(this.db, `presence/${pairId}/${uid}/ready`);
    await set(presenceRef, ready);
  }

  watchPartnerReady(pairId: string, partnerUid: string, callback: (ready: boolean) => void): () => void {
    const readyRef = ref(this.db, `presence/${pairId}/${partnerUid}/ready`);
    return onValue(readyRef, (snap) => {
      callback(snap.val() === true);
    });
  }

  stopWatching(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async goOffline(pairId: string): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    const presenceRef = ref(this.db, `presence/${pairId}/${uid}`);
    await set(presenceRef, {
      online: false,
      lastSeen: serverTimestamp(),
      ready: false,
    });
  }
}
