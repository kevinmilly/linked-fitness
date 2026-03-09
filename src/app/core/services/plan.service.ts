import { Injectable, inject, signal, computed } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { PlanDoc } from '../models';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private fs = inject(FirestoreService);
  private auth = inject(AuthService);

  readonly plans = signal<PlanDoc[]>([]);
  readonly activePlan = computed(() => this.plans().find(p => p.active) ?? null);

  private unsubscribe: (() => void) | null = null;

  watchPlans(pairId: string): void {
    this.unsubscribe?.();
    this.unsubscribe = this.fs.onCollectionSnapshot<PlanDoc>(
      `pairs/${pairId}/plans`,
      (docs) => this.plans.set(docs),
    );
  }

  stopWatching(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async createPlan(pairId: string, plan: Omit<PlanDoc, 'id' | 'pairId' | 'createdByUserId' | 'createdAt'>): Promise<string> {
    const uid = this.auth.uid();
    if (!uid) throw new Error('Not authenticated');

    const id = crypto.randomUUID();
    const fullPlan: PlanDoc = {
      ...plan,
      id,
      pairId,
      createdByUserId: uid,
      createdAt: Timestamp.now(),
    };

    await this.fs.set(`pairs/${pairId}/plans/${id}`, fullPlan as unknown as Record<string, unknown>);
    return id;
  }

  async setActivePlan(pairId: string, planId: string): Promise<void> {
    const batch = this.fs.batch();
    const currentPlans = this.plans();

    for (const p of currentPlans) {
      if (p.id === planId) {
        batch.update(this.fs.doc(`pairs/${pairId}/plans/${p.id}`), { active: true });
      } else if (p.active) {
        batch.update(this.fs.doc(`pairs/${pairId}/plans/${p.id}`), { active: false });
      }
    }

    await batch.commit();
  }

  async deletePlan(pairId: string, planId: string): Promise<void> {
    await this.fs.delete(`pairs/${pairId}/plans/${planId}`);
  }
}
