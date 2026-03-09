import { EnvironmentId, EquipmentId, MovementPattern, WorkoutTypeId } from './user.model';

export type ImpactLevel = 'low' | 'medium' | 'high';
export type LoadType = 'bodyweight' | 'dumbbell' | 'band' | 'barbell' | 'machine' | 'timed' | 'distance';

export interface ExerciseDoc {
  id: string;
  slug: string;
  name: string;
  description: string;
  coachingCues: string[];
  movementPattern: MovementPattern;
  workoutTypeTags: WorkoutTypeId[];
  environmentTags: EnvironmentId[];
  equipmentTags: EquipmentId[];
  impactLevel: ImpactLevel;
  mobilityDemand: ImpactLevel;
  beginnerFriendly: boolean;
  contraindications: string[];
  mediaUrl?: string;
}

export interface ExerciseVariantDoc {
  id: string;
  exerciseId: string;
  variantName: string;
  difficultyTier: number; // 1-10
  progressionFromVariantId?: string;
  regressionFromVariantId?: string;
  repDefault?: number;
  timeDefaultSeconds?: number;
  loadType: LoadType;
  notes?: string;
}
