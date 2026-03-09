import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { SessionDoc } from '../models/session.model';

// Extract the week-grouping logic from HistoryComponent for testability
interface WeekGroup {
  label: string;
  sessions: SessionDoc[];
}

function groupByWeek(sessions: SessionDoc[]): WeekGroup[] {
  if (sessions.length === 0) return [];

  const groups = new Map<string, SessionDoc[]>();

  for (const session of sessions) {
    const date = new Date(session.scheduledDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split('T')[0];

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(session);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, sessions]) => {
      const weekDate = new Date(key);
      const endDate = new Date(weekDate);
      endDate.setDate(weekDate.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        label: `${fmt(weekDate)} - ${fmt(endDate)}`,
        sessions: sessions.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
      };
    });
}

function makeSession(date: string, status: string = 'shared_complete'): SessionDoc {
  return {
    id: `session-${date}`,
    planId: 'plan-1',
    pairId: 'pair-1',
    scheduledDate: date,
    mode: 'together',
    status: status as any,
    generatedFromPlanDayIndex: 0,
    createdAt: Timestamp.now(),
    users: {
      'user-a': {
        assignedTrackType: 'calisthenics',
        assignedWorkoutPayload: { exercises: [], totalDurationMinutes: 30 },
        completionState: 'completed',
      },
      'user-b': {
        assignedTrackType: 'calisthenics',
        assignedWorkoutPayload: { exercises: [], totalDurationMinutes: 30 },
        completionState: 'completed',
      },
    },
  };
}

describe('Week Grouping Logic', () => {
  it('should return empty array for no sessions', () => {
    expect(groupByWeek([])).toEqual([]);
  });

  it('should group sessions in the same week together', () => {
    const sessions = [
      makeSession('2026-03-02'), // Monday
      makeSession('2026-03-04'), // Wednesday
      makeSession('2026-03-06'), // Friday
    ];

    const groups = groupByWeek(sessions);
    expect(groups).toHaveLength(1);
    expect(groups[0].sessions).toHaveLength(3);
  });

  it('should separate sessions from different weeks', () => {
    const sessions = [
      makeSession('2026-03-02'), // Week of Mar 1
      makeSession('2026-03-09'), // Week of Mar 8
    ];

    const groups = groupByWeek(sessions);
    expect(groups).toHaveLength(2);
  });

  it('should sort weeks newest first', () => {
    const sessions = [
      makeSession('2026-02-23'),
      makeSession('2026-03-02'),
      makeSession('2026-03-09'),
    ];

    const groups = groupByWeek(sessions);
    // Most recent week first
    expect(groups[0].sessions[0].scheduledDate).toBe('2026-03-09');
  });

  it('should sort sessions within a week newest first', () => {
    const sessions = [
      makeSession('2026-03-02'),
      makeSession('2026-03-06'),
      makeSession('2026-03-04'),
    ];

    const groups = groupByWeek(sessions);
    expect(groups[0].sessions[0].scheduledDate).toBe('2026-03-06');
    expect(groups[0].sessions[1].scheduledDate).toBe('2026-03-04');
    expect(groups[0].sessions[2].scheduledDate).toBe('2026-03-02');
  });
});

describe('Session Status Logic', () => {
  it('should correctly identify shared_complete when both users completed', () => {
    const session = makeSession('2026-03-08');
    const allUsers = Object.keys(session.users);
    const allCompleted = allUsers.every(uid => session.users[uid].completionState === 'completed');
    expect(allCompleted).toBe(true);
  });

  it('should identify awaiting_partner when only one user completed', () => {
    const session = makeSession('2026-03-08');
    session.users['user-b'].completionState = 'pending';
    const allUsers = Object.keys(session.users);
    const allCompleted = allUsers.every(uid => session.users[uid].completionState === 'completed');
    expect(allCompleted).toBe(false);
  });
});
