import { Injectable, inject } from '@angular/core';
import { SessionService } from './session.service';
import { SessionDoc } from '../models/session.model';

export interface WorkoutInsight {
  totalWorkoutsThisMonth: number;
  currentStreak: number;
  avgEffort: number;
  effortTrend: 'up' | 'stable' | 'down';
  totalExercisesCompleted: number;
  partnerCompletionRate: number;
}

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private sessionService = inject(SessionService);

  async getMonthlyInsights(pairId: string, uid: string): Promise<WorkoutInsight> {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const sessions = await this.sessionService.getSessionsForDateRange(pairId, start, end);

    const mySessions = sessions.filter(s => s.users[uid]?.completionState === 'completed');
    const totalWorkoutsThisMonth = mySessions.length;

    // Effort stats
    const efforts = mySessions.map(s => s.users[uid]?.effortRating).filter((e): e is number => !!e);
    const avgEffort = efforts.length > 0 ? Math.round((efforts.reduce((a, b) => a + b, 0) / efforts.length) * 10) / 10 : 0;

    // Effort trend: compare last 3 vs previous 3
    let effortTrend: 'up' | 'stable' | 'down' = 'stable';
    if (efforts.length >= 6) {
      const recent = efforts.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const older = efforts.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      effortTrend = recent > older + 0.5 ? 'up' : recent < older - 0.5 ? 'down' : 'stable';
    }

    // Total exercises completed
    const totalExercisesCompleted = mySessions.reduce((sum, s) => {
      const payload = s.users[uid]?.assignedWorkoutPayload;
      return sum + (payload?.exercises?.filter(e => e.completed)?.length ?? 0);
    }, 0);

    // Partner completion rate (sessions where both completed)
    const bothCompleted = sessions.filter(s => s.status === 'shared_complete').length;
    const partnerCompletionRate = sessions.length > 0 ? Math.round((bothCompleted / sessions.length) * 100) : 0;

    // Streak (consecutive days with completed sessions, counting backwards)
    const currentStreak = this.calculateStreak(sessions, uid);

    return { totalWorkoutsThisMonth, currentStreak, avgEffort, effortTrend, totalExercisesCompleted, partnerCompletionRate };
  }

  private calculateStreak(sessions: SessionDoc[], uid: string): number {
    const completedDates = sessions
      .filter(s => s.users[uid]?.completionState === 'completed')
      .map(s => s.scheduledDate)
      .sort()
      .reverse();

    if (completedDates.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < completedDates.length; i++) {
      const prev = new Date(completedDates[i - 1]);
      const curr = new Date(completedDates[i]);
      const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 2) streak++;
      else break;
    }
    return streak;
  }
}
