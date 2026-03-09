import { Injectable } from '@angular/core';
import { PlanDay } from '../models/plan.model';
import { UserDoc, ExperienceLevel, WorkoutTypeId } from '../models/user.model';
import { ExerciseDoc, ExerciseVariantDoc } from '../models/exercise.model';
import { WorkoutPayload, SessionExercise, WorkRestScheme } from '../models/session.model';

interface TierRange {
  min: number;
  max: number;
}

const EXPERIENCE_TIER_RANGES: Record<ExperienceLevel, TierRange> = {
  beginner: { min: 1, max: 3 },
  novice: { min: 3, max: 5 },
  intermediate: { min: 5, max: 7 },
  advanced: { min: 7, max: 10 },
};

const TARGET_EXERCISE_COUNT = { min: 4, max: 6 };

@Injectable({ providedIn: 'root' })
export class EqualizationService {

  generateSessionPayloads(
    planDay: PlanDay,
    userAProfile: UserDoc,
    userBProfile: UserDoc,
    exercises: ExerciseDoc[],
    variants: ExerciseVariantDoc[]
  ): { userA: WorkoutPayload; userB: WorkoutPayload } {
    if (planDay.mode === 'together') {
      return this.generateTogetherPayloads(planDay, userAProfile, userBProfile, exercises, variants);
    }
    return this.generateSeparatePayloads(planDay, userAProfile, userBProfile, exercises, variants);
  }

  private generateTogetherPayloads(
    planDay: PlanDay,
    userA: UserDoc,
    userB: UserDoc,
    exercises: ExerciseDoc[],
    variants: ExerciseVariantDoc[]
  ): { userA: WorkoutPayload; userB: WorkoutPayload } {
    const workoutTypes = this.getWorkoutTypes(planDay);
    const sharedEquipment = this.intersectArrays(
      userA.availableEquipment ?? ['none'],
      userB.availableEquipment ?? ['none']
    );
    const sharedEnvironments = this.intersectArrays(
      userA.availableEnvironments ?? ['home'],
      userB.availableEnvironments ?? ['home']
    );

    const eligible = this.filterExercises(exercises, workoutTypes, sharedEquipment, sharedEnvironments);
    const selected = this.selectExercises(eligible, planDay);

    const userAExercises = this.assignVariants(selected, variants, userA.experienceLevel, sharedEquipment);
    const userBExercises = this.assignVariants(selected, variants, userB.experienceLevel, sharedEquipment);

    const scheme = this.buildWorkRestScheme(planDay);

    return {
      userA: { exercises: userAExercises, workRestScheme: scheme, totalDurationMinutes: planDay.durationMinutes },
      userB: { exercises: userBExercises, workRestScheme: scheme, totalDurationMinutes: planDay.durationMinutes },
    };
  }

  private generateSeparatePayloads(
    planDay: PlanDay,
    userA: UserDoc,
    userB: UserDoc,
    exercises: ExerciseDoc[],
    variants: ExerciseVariantDoc[]
  ): { userA: WorkoutPayload; userB: WorkoutPayload } {
    const userAPayload = this.generateSingleUserPayload(planDay, userA, exercises, variants);
    const userBPayload = this.generateSingleUserPayload(planDay, userB, exercises, variants);
    return { userA: userAPayload, userB: userBPayload };
  }

  private generateSingleUserPayload(
    planDay: PlanDay,
    user: UserDoc,
    exercises: ExerciseDoc[],
    variants: ExerciseVariantDoc[]
  ): WorkoutPayload {
    const workoutTypes = this.getUserWorkoutTypes(planDay, user);
    const equipment = user.availableEquipment ?? ['none'];
    const environments = user.availableEnvironments ?? ['home'];

    const eligible = this.filterExercises(exercises, workoutTypes, equipment, environments);
    const selected = this.selectExercises(eligible, planDay);
    const assigned = this.assignVariants(selected, variants, user.experienceLevel, equipment);
    const scheme = this.buildWorkRestScheme(planDay);

    return { exercises: assigned, workRestScheme: scheme, totalDurationMinutes: planDay.durationMinutes };
  }

  private getWorkoutTypes(planDay: PlanDay): WorkoutTypeId[] {
    const types = [planDay.workoutTypePrimary];
    if (planDay.workoutTypeSecondary) types.push(planDay.workoutTypeSecondary);
    return types;
  }

  private getUserWorkoutTypes(planDay: PlanDay, user: UserDoc): WorkoutTypeId[] {
    // Use user preferences if available, falling back to plan day types
    const preferred = user.preferredWorkoutTypes;
    if (preferred && preferred.length > 0) {
      // Intersect with plan day types to stay on-plan
      const planTypes = this.getWorkoutTypes(planDay);
      const intersection = planTypes.filter(t => preferred.includes(t));
      return intersection.length > 0 ? intersection : planTypes;
    }
    return this.getWorkoutTypes(planDay);
  }

  private filterExercises(
    exercises: ExerciseDoc[],
    workoutTypes: WorkoutTypeId[],
    equipment: string[],
    environments: string[]
  ): ExerciseDoc[] {
    return exercises.filter(ex => {
      const matchesType = ex.workoutTypeTags.some(t => workoutTypes.includes(t));
      const matchesEquipment = ex.equipmentTags.some(e => equipment.includes(e));
      const matchesEnvironment = ex.environmentTags.some(e => environments.includes(e));
      return matchesType && matchesEquipment && matchesEnvironment;
    });
  }

  private selectExercises(exercises: ExerciseDoc[], planDay: PlanDay): ExerciseDoc[] {
    if (exercises.length === 0) return [];

    // Deterministic selection: sort by slug, pick exercises covering different movement patterns
    const sorted = [...exercises].sort((a, b) => a.slug.localeCompare(b.slug));
    const selected: ExerciseDoc[] = [];
    const usedPatterns = new Set<string>();
    const target = Math.min(TARGET_EXERCISE_COUNT.max, sorted.length);

    // First pass: one per movement pattern
    for (const ex of sorted) {
      if (selected.length >= target) break;
      if (!usedPatterns.has(ex.movementPattern)) {
        selected.push(ex);
        usedPatterns.add(ex.movementPattern);
      }
    }

    // Second pass: fill remaining slots
    for (const ex of sorted) {
      if (selected.length >= target) break;
      if (!selected.includes(ex)) {
        selected.push(ex);
      }
    }

    // Ensure at least minimum
    return selected.slice(0, Math.max(TARGET_EXERCISE_COUNT.min, selected.length));
  }

  private assignVariants(
    exercises: ExerciseDoc[],
    allVariants: ExerciseVariantDoc[],
    level: ExperienceLevel,
    equipment: string[]
  ): SessionExercise[] {
    const range = EXPERIENCE_TIER_RANGES[level];

    return exercises.map(ex => {
      const exerciseVariants = allVariants
        .filter(v => v.exerciseId === ex.id)
        .sort((a, b) => a.difficultyTier - b.difficultyTier);

      // Find best variant within tier range, considering equipment
      const variant = this.pickBestVariant(exerciseVariants, range, equipment);

      if (!variant) {
        // Fallback: use any variant closest to range
        const fallback = exerciseVariants[0];
        return this.buildSessionExercise(ex, fallback);
      }

      return this.buildSessionExercise(ex, variant);
    });
  }

  private pickBestVariant(
    variants: ExerciseVariantDoc[],
    range: TierRange,
    _equipment: string[]
  ): ExerciseVariantDoc | null {
    // Prefer variants within the tier range
    const inRange = variants.filter(v => v.difficultyTier >= range.min && v.difficultyTier <= range.max);
    if (inRange.length > 0) {
      // Pick the one closest to the midpoint of the range
      const mid = (range.min + range.max) / 2;
      inRange.sort((a, b) => Math.abs(a.difficultyTier - mid) - Math.abs(b.difficultyTier - mid));
      return inRange[0];
    }

    // Fallback: closest variant to the range
    if (variants.length === 0) return null;
    const mid = (range.min + range.max) / 2;
    const sorted = [...variants].sort((a, b) => Math.abs(a.difficultyTier - mid) - Math.abs(b.difficultyTier - mid));
    return sorted[0];
  }

  private buildSessionExercise(exercise: ExerciseDoc, variant?: ExerciseVariantDoc): SessionExercise {
    const se: SessionExercise = {
      exerciseId: exercise.id,
      variantId: variant?.id ?? '',
      name: exercise.name,
      variantName: variant?.variantName ?? exercise.name,
      coachingCues: exercise.coachingCues,
      completed: false,
    };

    if (variant) {
      if (variant.repDefault) {
        se.reps = variant.repDefault;
        se.sets = 3;
      }
      if (variant.timeDefaultSeconds) {
        se.durationSeconds = variant.timeDefaultSeconds;
      }
    }

    return se;
  }

  private buildWorkRestScheme(planDay: PlanDay): WorkRestScheme | undefined {
    const type = planDay.workoutTypePrimary;

    if (type === 'hiit_conditioning') {
      return { workSeconds: 40, restSeconds: 20, rounds: 3 };
    }
    if (type === 'mobility' || type === 'recovery') {
      return { workSeconds: 45, restSeconds: 15, rounds: 2 };
    }
    if (type === 'gym_strength' || type === 'home_dumbbell') {
      // Strength: use sets/reps model, no timed scheme
      return undefined;
    }
    if (type === 'calisthenics' || type === 'backyard_bodyweight') {
      return { workSeconds: 30, restSeconds: 15, rounds: 3 };
    }
    // Running, walking, swimming — no work/rest scheme (continuous)
    return undefined;
  }

  private intersectArrays<T>(a: T[], b: T[]): T[] {
    const setB = new Set(b);
    const result = a.filter(item => setB.has(item));
    return result.length > 0 ? result : a; // Fallback to user A's if no overlap
  }
}
