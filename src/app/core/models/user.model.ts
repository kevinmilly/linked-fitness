import { Timestamp } from 'firebase/firestore';

export type ExperienceLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced';

export type PrimaryGoal =
  | 'get_back_in_shape'
  | 'strength'
  | 'endurance'
  | 'mobility'
  | 'consistency'
  | 'weight_loss'
  | 'general_fitness';

export interface UserDoc {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  avatarUrl?: string;
  createdAt: Timestamp;

  // Profile fields (inline — not a separate collection)
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  movementLimitations?: string[];
  preferredWorkoutTypes?: WorkoutTypeId[];
  availableEnvironments?: EnvironmentId[];
  availableEquipment?: EquipmentId[];
  notificationPreferences?: NotificationPreferences;
  onboardingComplete: boolean;
  profileDefaultsApplied: boolean;
  soundEnabled: boolean;
}

export interface NotificationPreferences {
  workoutReady: boolean;
  partnerCompleted: boolean;
  streakExpiring: boolean;
  weeklyRecap: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "07:00"
}

// ===== Seed type IDs =====

export type WorkoutTypeId =
  | 'running'
  | 'walking'
  | 'gym_strength'
  | 'calisthenics'
  | 'backyard_bodyweight'
  | 'hiit_conditioning'
  | 'mobility'
  | 'pool_swimming'
  | 'home_dumbbell'
  | 'recovery';

export type EnvironmentId =
  | 'home'
  | 'backyard'
  | 'neighborhood'
  | 'park'
  | 'track'
  | 'treadmill'
  | 'gym'
  | 'pool';

export type EquipmentId =
  | 'none'
  | 'resistance_bands'
  | 'light_dumbbells'
  | 'adjustable_dumbbells'
  | 'medicine_ball'
  | 'pull_up_bar'
  | 'dip_station'
  | 'kettlebells'
  | 'barbell'
  | 'machines'
  | 'step_platform';

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'push'
  | 'pull'
  | 'carry'
  | 'core'
  | 'locomotion'
  | 'mobility'
  | 'conditioning';
