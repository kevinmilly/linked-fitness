import { Timestamp } from 'firebase/firestore';
import { WorkoutMode } from './plan.model';
import { EnvironmentId } from './user.model';

export type SessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'awaiting_partner_confirmation'
  | 'shared_complete'
  | 'skipped'
  | 'expired';

export type CompletionState = 'pending' | 'completed' | 'modified' | 'skipped';

export interface SessionDoc {
  id: string;
  planId: string;
  pairId: string;
  scheduledDate: string; // ISO date
  mode: WorkoutMode;
  status: SessionStatus;
  environmentChoice?: EnvironmentId;
  generatedFromPlanDayIndex: number;
  graceWindowExpiresAt?: Timestamp;
  createdAt: Timestamp;
  users: Record<string, SessionUserData>;
  reactions?: SessionReaction[];
}

export interface SessionUserData {
  assignedTrackType: string;
  assignedWorkoutPayload: WorkoutPayload;
  completionState: CompletionState;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  effortRating?: number;
  sorenessRating?: number;
  notes?: string;
  swaps?: ExerciseSwap[];
  difficultyAdjustment?: DifficultyAdjustment;
}

export interface WorkoutPayload {
  exercises: SessionExercise[];
  workRestScheme?: WorkRestScheme;
  totalDurationMinutes: number;
}

export interface SessionExercise {
  exerciseId: string;
  variantId: string;
  name: string;
  variantName: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  distance?: string;
  coachingCues?: string[];
  completed?: boolean;
}

export interface WorkRestScheme {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
}

export interface ExerciseSwap {
  originalExerciseId: string;
  newExerciseId: string;
  reason?: 'injury' | 'equipment' | 'preference';
}

export type DifficultyAdjustment = 'easier' | 'normal' | 'harder';

export interface SessionReaction {
  emoji: string;
  fromUid: string;
  createdAt: Timestamp;
}
