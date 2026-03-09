import { Timestamp } from 'firebase/firestore';
import { WorkoutTypeId } from './user.model';

export type WorkoutMode = 'together' | 'separate' | 'recovery' | 'rest' | 'optional';
export type EnvironmentPolicy = 'shared' | 'per_user' | 'auto';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0 ... Sat=6

export interface PlanDoc {
  id: string;
  pairId: string;
  title: string;
  active: boolean;
  startDate: string; // ISO date "2026-03-10"
  endDate?: string;
  createdByUserId: string;
  createdAt: Timestamp;
  days: PlanDay[];
}

export interface PlanDay {
  weekday: Weekday;
  mode: WorkoutMode;
  workoutTypePrimary: WorkoutTypeId;
  workoutTypeSecondary?: WorkoutTypeId;
  durationMinutes: number;
  environmentPolicy: EnvironmentPolicy;
  notes?: string;
}
