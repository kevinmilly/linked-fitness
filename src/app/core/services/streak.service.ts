import { Injectable, inject, signal } from '@angular/core';
import { Timestamp, where } from '@angular/fire/firestore';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { StreakDoc, UserStreakDoc, SharedStreakType, PersonalStreakType } from '../models';

@Injectable({ providedIn: 'root' })
export class StreakService {
  private fs = inject(FirestoreService);
  private auth = inject(AuthService);

  readonly sharedStreaks = signal<StreakDoc[]>([]);
  readonly personalStreaks = signal<UserStreakDoc[]>([]);

  private unsubShared: (() => void) | null = null;
  private unsubPersonal: (() => void) | null = null;

  watchStreaks(pairId: string): void {
    this.stopWatching();

    this.unsubShared = this.fs.onCollectionSnapshot<StreakDoc>(
      `pairs/${pairId}/streaks`,
      (streaks) => this.sharedStreaks.set(streaks)
    );

    const uid = this.auth.uid();
    if (uid) {
      this.unsubPersonal = this.fs.onCollectionSnapshot<UserStreakDoc>(
        `users/${uid}/personalStreaks`,
        (streaks) => this.personalStreaks.set(streaks)
      );
    }
  }

  stopWatching(): void {
    this.unsubShared?.();
    this.unsubPersonal?.();
    this.unsubShared = null;
    this.unsubPersonal = null;
  }

  getSharedStreak(type: SharedStreakType): StreakDoc | undefined {
    return this.sharedStreaks().find(s => s.streakType === type);
  }

  getPersonalStreak(type: PersonalStreakType): UserStreakDoc | undefined {
    return this.personalStreaks().find(s => s.streakType === type);
  }

  /** Called after shared_complete — advances both shared and personal streaks */
  async advanceStreaksOnSharedComplete(pairId: string): Promise<void> {
    const batch = this.fs.batch();
    const now = Timestamp.now();

    // Advance shared completion streak
    await this.advanceOrCreateStreak(
      batch,
      `pairs/${pairId}/streaks/shared_completion`,
      'shared_completion',
      now
    );

    // Advance personal completion streak
    const uid = this.auth.uid();
    if (uid) {
      await this.advanceOrCreatePersonalStreak(
        batch,
        `users/${uid}/personalStreaks/personal_completion`,
        'personal_completion',
        now
      );
    }

    await batch.commit();
  }

  /** Called when only one user completes (partner didn't finish in grace window) */
  async advancePersonalOnly(): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;

    const batch = this.fs.batch();
    const now = Timestamp.now();

    await this.advanceOrCreatePersonalStreak(
      batch,
      `users/${uid}/personalStreaks/personal_completion`,
      'personal_completion',
      now
    );

    await batch.commit();
  }

  private async advanceOrCreateStreak(
    batch: ReturnType<FirestoreService['batch']>,
    path: string,
    type: SharedStreakType,
    now: Timestamp
  ): Promise<void> {
    const existing = await this.fs.get<StreakDoc>(path);
    if (existing) {
      const newCount = existing.currentCount + 1;
      batch.update(this.fs.doc(path), {
        currentCount: newCount,
        bestCount: Math.max(existing.bestCount, newCount),
        lastAdvancedAt: now,
      });
    } else {
      batch.set(this.fs.doc(path), {
        id: type,
        pairId: path.split('/')[1],
        streakType: type,
        currentCount: 1,
        bestCount: 1,
        lastAdvancedAt: now,
      });
    }
  }

  private async advanceOrCreatePersonalStreak(
    batch: ReturnType<FirestoreService['batch']>,
    path: string,
    type: PersonalStreakType,
    now: Timestamp
  ): Promise<void> {
    const existing = await this.fs.get<UserStreakDoc>(path);
    if (existing) {
      const newCount = existing.currentCount + 1;
      batch.update(this.fs.doc(path), {
        currentCount: newCount,
        bestCount: Math.max(existing.bestCount, newCount),
        lastAdvancedAt: now,
      });
    } else {
      batch.set(this.fs.doc(path), {
        id: type,
        userId: path.split('/')[1],
        streakType: type,
        currentCount: 1,
        bestCount: 1,
        lastAdvancedAt: now,
      });
    }
  }
}
