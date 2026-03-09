import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { Timestamp, where, orderBy } from '@angular/fire/firestore';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { EqualizationService } from './equalization.service';
import { SessionDoc, SessionStatus, CompletionState } from '../models/session.model';
import { PlanDoc } from '../models/plan.model';
import { UserDoc } from '../models/user.model';
import { ExerciseDoc, ExerciseVariantDoc } from '../models/exercise.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private fs = inject(FirestoreService);
  private auth = inject(AuthService);
  private equalization = inject(EqualizationService);
  private destroyRef = inject(DestroyRef);

  readonly todaySession = signal<SessionDoc | null>(null);
  private unsubscribe: (() => void) | null = null;

  async generateTodaySession(
    pairId: string,
    plan: PlanDoc,
    userA: UserDoc,
    userB: UserDoc,
    exercises: ExerciseDoc[],
    variants: ExerciseVariantDoc[]
  ): Promise<SessionDoc> {
    const today = this.getTodayISO();
    const dayOfWeek = new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    // Find the plan day for today
    const planDayIndex = plan.days.findIndex(d => d.weekday === dayOfWeek);
    if (planDayIndex === -1) {
      throw new Error(`No plan day configured for weekday ${dayOfWeek}`);
    }
    const planDay = plan.days[planDayIndex];

    // Check if session already exists for today
    const existing = await this.fs.query<SessionDoc>(
      `pairs/${pairId}/sessions`,
      where('scheduledDate', '==', today)
    );
    if (existing.length > 0) {
      return existing[0];
    }

    // Generate payloads via equalization engine
    const { userA: payloadA, userB: payloadB } = this.equalization.generateSessionPayloads(
      planDay, userA, userB, exercises, variants
    );

    const sessionId = crypto.randomUUID();
    const now = Timestamp.now();

    const session: SessionDoc = {
      id: sessionId,
      planId: plan.id,
      pairId,
      scheduledDate: today,
      mode: planDay.mode,
      status: 'scheduled' as SessionStatus,
      generatedFromPlanDayIndex: planDayIndex,
      createdAt: now,
      users: {
        [userA.id]: {
          assignedTrackType: planDay.workoutTypePrimary,
          assignedWorkoutPayload: payloadA,
          completionState: 'pending' as CompletionState,
        },
        [userB.id]: {
          assignedTrackType: planDay.workoutTypePrimary,
          assignedWorkoutPayload: payloadB,
          completionState: 'pending' as CompletionState,
        },
      },
    };

    // Write to Firestore (strip id from payload since it's the doc key)
    const { id: _id, ...sessionData } = session;
    await this.fs.set(`pairs/${pairId}/sessions/${sessionId}`, sessionData as unknown as Record<string, unknown>);

    return session;
  }

  watchTodaySession(pairId: string): typeof this.todaySession {
    const today = this.getTodayISO();

    this.unsubscribe?.();
    this.unsubscribe = this.fs.onCollectionSnapshot<SessionDoc>(
      `pairs/${pairId}/sessions`,
      (sessions) => {
        const todaySession = sessions.find(s => s.scheduledDate === today) ?? null;
        this.todaySession.set(todaySession);
      },
      where('scheduledDate', '==', today)
    );

    this.destroyRef.onDestroy(() => {
      this.unsubscribe?.();
    });

    return this.todaySession;
  }

  stopWatching(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async completeSession(
    pairId: string,
    sessionId: string,
    userId: string,
    effortRating?: number,
    sorenessRating?: number
  ): Promise<void> {
    const path = `pairs/${pairId}/sessions/${sessionId}`;

    // Optimistic update
    const current = this.todaySession();
    if (current && current.id === sessionId) {
      const updated = { ...current };
      updated.users = { ...updated.users };
      updated.users[userId] = {
        ...updated.users[userId],
        completionState: 'completed',
        completedAt: Timestamp.now(),
        effortRating,
        sorenessRating,
      };

      // Determine new session status
      const allUsers = Object.keys(updated.users);
      const allCompleted = allUsers.every(uid => updated.users[uid].completionState === 'completed');

      if (allCompleted) {
        updated.status = 'shared_complete';
      } else {
        updated.status = 'awaiting_partner_confirmation';
      }

      this.todaySession.set(updated);
    }

    // Persist to Firestore
    const updateData: Record<string, unknown> = {
      [`users.${userId}.completionState`]: 'completed',
      [`users.${userId}.completedAt`]: Timestamp.now(),
    };

    if (effortRating !== undefined) {
      updateData[`users.${userId}.effortRating`] = effortRating;
    }
    if (sorenessRating !== undefined) {
      updateData[`users.${userId}.sorenessRating`] = sorenessRating;
    }

    // Determine new status by reading current state
    const sessionDoc = await this.fs.get<SessionDoc>(path);
    if (sessionDoc) {
      const users = { ...sessionDoc.users };
      users[userId] = { ...users[userId], completionState: 'completed' };

      const allUsers = Object.keys(users);
      const allCompleted = allUsers.every(uid => users[uid].completionState === 'completed');

      updateData['status'] = allCompleted ? 'shared_complete' : 'awaiting_partner_confirmation';
    }

    await this.fs.update(path, updateData);
  }

  async getSessionsForDateRange(
    pairId: string,
    startDate: string,
    endDate: string
  ): Promise<SessionDoc[]> {
    return this.fs.query<SessionDoc>(
      `pairs/${pairId}/sessions`,
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate),
      orderBy('scheduledDate', 'asc')
    );
  }

  private getTodayISO(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
}
