import { Timestamp } from 'firebase/firestore';

// ===== Streaks =====

export type SharedStreakType = 'shared_completion' | 'weekly_consistency' | 'together_mode' | 'separate_mode';
export type PersonalStreakType = 'personal_completion' | 'personal_consistency';

export interface StreakDoc {
  id: string;
  pairId: string;
  streakType: SharedStreakType;
  currentCount: number;
  bestCount: number;
  lastAdvancedAt: Timestamp;
}

export interface UserStreakDoc {
  id: string;
  userId: string;
  streakType: PersonalStreakType;
  currentCount: number;
  bestCount: number;
  lastAdvancedAt: Timestamp;
}

// ===== Achievements =====

export type AchievementCategory = 'instant' | 'progress' | 'tiered';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'none';

export interface AchievementDoc {
  id: string;
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  requirementType: string;
  requirementValue: number;
  iconKey: string;
  visualTheme: string;
}

export interface PairAchievementProgressDoc {
  id: string;
  pairId: string;
  achievementId: string;
  currentProgress: number;
  unlockedAt?: Timestamp;
  currentTier: AchievementTier;
  nextRequirementValue?: number;
}

// ===== Nudge Events =====

export interface NudgeEventDoc {
  id: string;
  workoutSessionId: string;
  senderUserId: string;
  recipientUserId: string;
  channel: 'email' | 'push';
  sentAt: Timestamp;
  deliveryStatus: 'sent' | 'delivered' | 'failed';
}
