import { PlanDay, WorkoutMode, EnvironmentPolicy, Weekday } from '../models';
import { WorkoutTypeId } from '../models';

export interface PlanTemplate {
  title: string;
  description: string;
  beginner_safe: boolean;
  days: PlanDay[];
}

function day(
  weekday: Weekday,
  mode: WorkoutMode,
  workoutTypePrimary: WorkoutTypeId,
  durationMinutes: number,
  environmentPolicy: EnvironmentPolicy = 'shared',
  workoutTypeSecondary?: WorkoutTypeId,
): PlanDay {
  return { weekday, mode, workoutTypePrimary, durationMinutes, environmentPolicy, ...(workoutTypeSecondary ? { workoutTypeSecondary } : {}) };
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    title: 'Beginner Rebuild',
    description: 'Ease back into fitness with low-impact sessions and plenty of rest days.',
    beginner_safe: true,
    days: [
      day(0, 'rest',     'recovery',            0,  'shared'),
      day(1, 'together', 'walking',             30, 'shared'),
      day(2, 'rest',     'recovery',            0,  'shared'),
      day(3, 'together', 'mobility',            25, 'shared'),
      day(4, 'rest',     'recovery',            0,  'shared'),
      day(5, 'together', 'backyard_bodyweight', 25, 'shared'),
      day(6, 'recovery', 'mobility',            20, 'shared'),
    ],
  },
  {
    title: 'Couch to Movement',
    description: 'Start from zero — short walks build to light bodyweight work over the week.',
    beginner_safe: true,
    days: [
      day(0, 'rest',     'recovery',            0,  'shared'),
      day(1, 'together', 'walking',             20, 'shared'),
      day(2, 'recovery', 'mobility',            15, 'shared'),
      day(3, 'together', 'walking',             25, 'shared'),
      day(4, 'rest',     'recovery',            0,  'shared'),
      day(5, 'together', 'backyard_bodyweight', 20, 'shared'),
      day(6, 'recovery', 'recovery',            15, 'shared'),
    ],
  },
  {
    title: 'Couples Backyard Strength',
    description: 'Bodyweight circuits you can do in the backyard together — no equipment needed.',
    beginner_safe: false,
    days: [
      day(0, 'recovery', 'mobility',            20, 'shared'),
      day(1, 'together', 'backyard_bodyweight', 35, 'shared'),
      day(2, 'together', 'calisthenics',        30, 'shared'),
      day(3, 'rest',     'recovery',            0,  'shared'),
      day(4, 'together', 'backyard_bodyweight', 35, 'shared'),
      day(5, 'together', 'hiit_conditioning',   30, 'shared'),
      day(6, 'recovery', 'recovery',            20, 'shared'),
    ],
  },
  {
    title: 'Gym + Walk Hybrid',
    description: 'Strength at the gym, active recovery walks together on off days.',
    beginner_safe: false,
    days: [
      day(0, 'together', 'walking',       30, 'shared'),
      day(1, 'separate', 'gym_strength',  50, 'per_user'),
      day(2, 'together', 'walking',       30, 'shared'),
      day(3, 'separate', 'gym_strength',  50, 'per_user'),
      day(4, 'together', 'walking',       30, 'shared'),
      day(5, 'separate', 'gym_strength',  50, 'per_user'),
      day(6, 'rest',     'recovery',      0,  'shared'),
    ],
  },
  {
    title: 'Mobility First Reset',
    description: 'Focus on flexibility and joint health — great after time off or for injury recovery.',
    beginner_safe: true,
    days: [
      day(0, 'rest',     'recovery',  0,  'shared'),
      day(1, 'together', 'mobility',  30, 'shared'),
      day(2, 'together', 'walking',   25, 'shared'),
      day(3, 'together', 'mobility',  30, 'shared'),
      day(4, 'rest',     'recovery',  0,  'shared'),
      day(5, 'together', 'mobility',  30, 'shared'),
      day(6, 'recovery', 'recovery',  20, 'shared'),
    ],
  },
  {
    title: 'Linked Consistency Starter',
    description: 'Four short together sessions per week — built for building the habit.',
    beginner_safe: true,
    days: [
      day(0, 'rest',     'recovery',            0,  'shared'),
      day(1, 'together', 'walking',             25, 'shared'),
      day(2, 'rest',     'recovery',            0,  'shared'),
      day(3, 'together', 'backyard_bodyweight', 25, 'shared'),
      day(4, 'together', 'mobility',            20, 'shared'),
      day(5, 'rest',     'recovery',            0,  'shared'),
      day(6, 'together', 'walking',             25, 'shared'),
    ],
  },
  {
    title: 'Run Walk Together',
    description: 'Alternate running and walking days as a pair — build cardio side by side.',
    beginner_safe: false,
    days: [
      day(0, 'recovery', 'mobility',  20, 'shared'),
      day(1, 'together', 'running',   30, 'shared'),
      day(2, 'together', 'walking',   30, 'shared'),
      day(3, 'together', 'running',   30, 'shared'),
      day(4, 'rest',     'recovery',  0,  'shared'),
      day(5, 'together', 'running',   35, 'shared'),
      day(6, 'together', 'walking',   30, 'shared'),
    ],
  },
  {
    title: 'Strength + Mobility Hybrid',
    description: 'Alternate gym strength days with mobility sessions — balanced and sustainable.',
    beginner_safe: false,
    days: [
      day(0, 'recovery', 'recovery',    20, 'shared'),
      day(1, 'separate', 'gym_strength', 45, 'per_user'),
      day(2, 'together', 'mobility',     30, 'shared'),
      day(3, 'separate', 'gym_strength', 45, 'per_user'),
      day(4, 'together', 'mobility',     30, 'shared'),
      day(5, 'separate', 'gym_strength', 45, 'per_user'),
      day(6, 'rest',     'recovery',     0,  'shared'),
    ],
  },
];
