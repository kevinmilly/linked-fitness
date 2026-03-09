import { describe, it, expect, beforeEach } from 'vitest';
import { EqualizationService } from './equalization.service';
import { SEED_EXERCISES, SEED_VARIANTS } from '../data/exercises';
import { ExerciseDoc, ExerciseVariantDoc } from '../models/exercise.model';
import { PlanDay } from '../models/plan.model';
import { UserDoc } from '../models/user.model';
import { Timestamp } from 'firebase/firestore';

// Build test exercise library (same as TodayComponent does)
const exercises: ExerciseDoc[] = SEED_EXERCISES.map((e, i) => ({ ...e, id: `ex-${i}` }));
const variants: ExerciseVariantDoc[] = SEED_VARIANTS.map((v, i) => ({
  id: `var-${i}`,
  exerciseId: exercises.find(e => e.slug === v.exerciseSlug)?.id ?? '',
  variantName: v.variantName,
  difficultyTier: v.difficultyTier,
  repDefault: v.repDefault,
  timeDefaultSeconds: v.timeDefaultSeconds,
  loadType: v.loadType,
  notes: v.notes,
}));

function makeUser(overrides: Partial<UserDoc> = {}): UserDoc {
  return {
    id: 'user-a',
    email: 'a@test.com',
    displayName: 'User A',
    timezone: 'America/New_York',
    createdAt: Timestamp.now(),
    experienceLevel: 'beginner',
    primaryGoal: 'general_fitness',
    onboardingComplete: true,
    profileDefaultsApplied: false,
    soundEnabled: true,
    availableEquipment: ['none'],
    availableEnvironments: ['home', 'backyard'],
    preferredWorkoutTypes: ['calisthenics'],
    ...overrides,
  };
}

function makePlanDay(overrides: Partial<PlanDay> = {}): PlanDay {
  return {
    weekday: 1,
    mode: 'together',
    workoutTypePrimary: 'calisthenics',
    durationMinutes: 30,
    environmentPolicy: 'shared',
    ...overrides,
  };
}

describe('EqualizationService', () => {
  let service: EqualizationService;

  beforeEach(() => {
    service = new EqualizationService();
  });

  describe('generateSessionPayloads', () => {
    it('should generate payloads for both users', () => {
      const userA = makeUser({ id: 'user-a', experienceLevel: 'beginner' });
      const userB = makeUser({ id: 'user-b', experienceLevel: 'intermediate' });
      const planDay = makePlanDay({ mode: 'together' });

      const result = service.generateSessionPayloads(planDay, userA, userB, exercises, variants);

      expect(result.userA).toBeDefined();
      expect(result.userB).toBeDefined();
      expect(result.userA.exercises.length).toBeGreaterThanOrEqual(4);
      expect(result.userB.exercises.length).toBeGreaterThanOrEqual(4);
      expect(result.userA.totalDurationMinutes).toBe(30);
    });

    it('should produce same exercises for together mode (different variants)', () => {
      const userA = makeUser({ id: 'user-a', experienceLevel: 'beginner' });
      const userB = makeUser({ id: 'user-b', experienceLevel: 'advanced' });
      const planDay = makePlanDay({ mode: 'together' });

      const result = service.generateSessionPayloads(planDay, userA, userB, exercises, variants);

      // Same base exercises
      const exerciseIdsA = result.userA.exercises.map(e => e.exerciseId);
      const exerciseIdsB = result.userB.exercises.map(e => e.exerciseId);
      expect(exerciseIdsA).toEqual(exerciseIdsB);

      // Different variants (beginner vs advanced)
      const variantIdsA = result.userA.exercises.map(e => e.variantId);
      const variantIdsB = result.userB.exercises.map(e => e.variantId);
      expect(variantIdsA).not.toEqual(variantIdsB);
    });

    it('should generate independent exercises for separate mode', () => {
      const userA = makeUser({
        id: 'user-a',
        experienceLevel: 'beginner',
        availableEquipment: ['none'],
        availableEnvironments: ['home'],
        preferredWorkoutTypes: ['calisthenics'],
      });
      const userB = makeUser({
        id: 'user-b',
        experienceLevel: 'advanced',
        availableEquipment: ['barbell', 'machines'],
        availableEnvironments: ['gym'],
        preferredWorkoutTypes: ['gym_strength'],
      });
      const planDay = makePlanDay({ mode: 'separate', workoutTypePrimary: 'gym_strength' });

      const result = service.generateSessionPayloads(planDay, userA, userB, exercises, variants);

      expect(result.userA.exercises.length).toBeGreaterThanOrEqual(1);
      expect(result.userB.exercises.length).toBeGreaterThanOrEqual(1);
    });

    it('should assign beginner-tier variants for beginner users', () => {
      const user = makeUser({ experienceLevel: 'beginner' });
      const planDay = makePlanDay();

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      // Beginner tier range is 1-3, midpoint 2
      for (const ex of result.userA.exercises) {
        if (ex.variantId) {
          const variant = variants.find(v => v.id === ex.variantId);
          if (variant) {
            expect(variant.difficultyTier).toBeLessThanOrEqual(5); // Should lean low
          }
        }
      }
    });

    it('should assign advanced-tier variants for advanced users', () => {
      const user = makeUser({ experienceLevel: 'advanced' });
      const planDay = makePlanDay();

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      for (const ex of result.userA.exercises) {
        if (ex.variantId) {
          const variant = variants.find(v => v.id === ex.variantId);
          if (variant) {
            expect(variant.difficultyTier).toBeGreaterThanOrEqual(4); // Should lean high
          }
        }
      }
    });

    it('should include work/rest scheme for HIIT', () => {
      const user = makeUser({
        availableEquipment: ['none'],
        availableEnvironments: ['home', 'backyard'],
      });
      const planDay = makePlanDay({ workoutTypePrimary: 'hiit_conditioning' });

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      expect(result.userA.workRestScheme).toBeDefined();
      expect(result.userA.workRestScheme!.workSeconds).toBe(40);
      expect(result.userA.workRestScheme!.restSeconds).toBe(20);
      expect(result.userA.workRestScheme!.rounds).toBe(3);
    });

    it('should NOT include work/rest scheme for gym strength', () => {
      const user = makeUser({
        availableEquipment: ['adjustable_dumbbells', 'barbell'],
        availableEnvironments: ['gym'],
      });
      const planDay = makePlanDay({ workoutTypePrimary: 'gym_strength' });

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      expect(result.userA.workRestScheme).toBeUndefined();
    });

    it('should cover multiple movement patterns', () => {
      const user = makeUser({
        availableEquipment: ['none'],
        availableEnvironments: ['home', 'backyard', 'park'],
      });
      const planDay = makePlanDay({ workoutTypePrimary: 'calisthenics' });

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      const patterns = new Set(result.userA.exercises.map(e => {
        const doc = exercises.find(ex => ex.id === e.exerciseId);
        return doc?.movementPattern;
      }));

      // Should have at least 3 different movement patterns
      expect(patterns.size).toBeGreaterThanOrEqual(3);
    });

    it('should handle recovery workout type', () => {
      const user = makeUser({
        availableEquipment: ['none'],
        availableEnvironments: ['home'],
      });
      const planDay = makePlanDay({ workoutTypePrimary: 'recovery' });

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      expect(result.userA.exercises.length).toBeGreaterThanOrEqual(1);
      expect(result.userA.workRestScheme).toBeDefined(); // recovery uses mobility scheme
    });

    it('should handle swimming workout type', () => {
      const user = makeUser({
        availableEquipment: ['none'],
        availableEnvironments: ['pool'],
      });
      const planDay = makePlanDay({ workoutTypePrimary: 'pool_swimming' });

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      expect(result.userA.exercises.length).toBeGreaterThanOrEqual(1);
      expect(result.userA.exercises[0].name).toContain('Swimming');
    });

    it('should be deterministic (same inputs = same outputs)', () => {
      const user = makeUser();
      const planDay = makePlanDay();

      const result1 = service.generateSessionPayloads(planDay, user, user, exercises, variants);
      const result2 = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      expect(result1.userA.exercises.map(e => e.exerciseId))
        .toEqual(result2.userA.exercises.map(e => e.exerciseId));
      expect(result1.userA.exercises.map(e => e.variantId))
        .toEqual(result2.userA.exercises.map(e => e.variantId));
    });

    it('should populate reps/sets or duration on exercises', () => {
      const user = makeUser();
      const planDay = makePlanDay();

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      for (const ex of result.userA.exercises) {
        const hasReps = ex.reps !== undefined && ex.sets !== undefined;
        const hasDuration = ex.durationSeconds !== undefined;
        expect(hasReps || hasDuration).toBe(true);
      }
    });

    it('should mark all exercises as not completed initially', () => {
      const user = makeUser();
      const planDay = makePlanDay();

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      for (const ex of result.userA.exercises) {
        expect(ex.completed).toBe(false);
      }
    });

    it('should not exceed 6 exercises per user', () => {
      const user = makeUser({
        availableEquipment: ['none', 'light_dumbbells', 'adjustable_dumbbells'],
        availableEnvironments: ['home', 'backyard', 'park', 'gym'],
      });
      const planDay = makePlanDay();

      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      expect(result.userA.exercises.length).toBeLessThanOrEqual(6);
    });

    it('should handle users with no matching exercises gracefully', () => {
      const user = makeUser({
        availableEquipment: ['machines'],
        availableEnvironments: ['pool'],
      });
      const planDay = makePlanDay({ workoutTypePrimary: 'calisthenics' });

      // Calisthenics + machines + pool = likely no matches
      const result = service.generateSessionPayloads(planDay, user, user, exercises, variants);

      // Should not crash, may return empty
      expect(result.userA.exercises).toBeDefined();
    });
  });
});
