import { Injectable, inject, signal } from '@angular/core';
import { where, Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { PairDoc, PairInviteDoc } from '../models';

@Injectable({ providedIn: 'root' })
export class PairService {
  private auth = inject(AuthService);
  private fs = inject(FirestoreService);

  readonly activePair = signal<PairDoc | null>(null);
  readonly partnerUid = signal<string | null>(null);
  private unsubscribe: (() => void) | null = null;

  watchPair(): void {
    const uid = this.auth.uid();
    if (!uid) return;

    this.unsubscribe?.();
    this.unsubscribe = this.fs.onCollectionSnapshot<PairDoc>(
      'pairs',
      (pairs) => {
        const active = pairs.find(p => p.status === 'active') ?? pairs[0] ?? null;
        this.activePair.set(active);
        if (active) {
          this.partnerUid.set(
            active.userAId === uid ? active.userBId : active.userAId
          );
        } else {
          this.partnerUid.set(null);
        }
      },
      where('userIds', 'array-contains', uid)
    );
  }

  stopWatching(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async createPairAndInvite(invitedEmail: string): Promise<string> {
    const uid = this.auth.uid();
    if (!uid) throw new Error('Not authenticated');

    const pairRef = this.fs.doc<PairDoc>(`pairs/${crypto.randomUUID()}`);
    const pairId = pairRef.id;

    const batch = this.fs.batch();

    batch.set(pairRef, {
      id: pairId,
      userAId: uid,
      userBId: '',
      userIds: [uid],
      status: 'pending' as const,
      createdAt: Timestamp.now(),
    });

    const inviteId = crypto.randomUUID();
    const inviteRef = this.fs.doc<PairInviteDoc>(`pairs/${pairId}/invites/${inviteId}`);
    batch.set(inviteRef, {
      id: inviteId,
      pairId,
      invitedEmail: invitedEmail.toLowerCase().trim(),
      invitedByUserId: uid,
      status: 'pending' as const,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      createdAt: Timestamp.now(),
    });

    await batch.commit();
    return pairId;
  }

  async acceptInvite(pairId: string, inviteId: string): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) throw new Error('Not authenticated');

    const batch = this.fs.batch();

    batch.update(this.fs.doc(`pairs/${pairId}`), {
      userBId: uid,
      userIds: [
        (await this.fs.get<PairDoc>(`pairs/${pairId}`))?.userAId,
        uid,
      ],
      status: 'active',
    });

    batch.update(this.fs.doc(`pairs/${pairId}/invites/${inviteId}`), {
      status: 'accepted',
    });

    await batch.commit();
  }

  async getPendingInviteForEmail(email: string): Promise<{ pairId: string; inviteId: string } | null> {
    const normalizedEmail = email.toLowerCase().trim();
    // Query all pairs' invites — requires collection group index on `invites`
    const pairs = await this.fs.query<PairDoc>('pairs', where('status', '==', 'pending'));

    for (const pair of pairs) {
      const invites = await this.fs.query<PairInviteDoc>(
        `pairs/${pair.id}/invites`,
        where('invitedEmail', '==', normalizedEmail),
        where('status', '==', 'pending')
      );
      if (invites.length > 0) {
        return { pairId: pair.id, inviteId: invites[0].id };
      }
    }
    return null;
  }
}
