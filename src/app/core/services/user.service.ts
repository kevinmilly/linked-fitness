import { Injectable, inject, signal } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { UserDoc, ExperienceLevel, PrimaryGoal, WorkoutTypeId, EnvironmentId, EquipmentId } from '../models';

// Experience-level defaults for deferred onboarding fields
const PROFILE_DEFAULTS: Record<ExperienceLevel, {
  environments: EnvironmentId[];
  equipment: EquipmentId[];
  workoutTypes: WorkoutTypeId[];
}> = {
  beginner: {
    environments: ['home', 'neighborhood'],
    equipment: ['none'],
    workoutTypes: ['walking', 'mobility', 'recovery'],
  },
  novice: {
    environments: ['home', 'backyard', 'neighborhood'],
    equipment: ['none', 'resistance_bands'],
    workoutTypes: ['walking', 'backyard_bodyweight', 'mobility'],
  },
  intermediate: {
    environments: ['home', 'backyard', 'gym'],
    equipment: ['light_dumbbells', 'resistance_bands'],
    workoutTypes: ['calisthenics', 'home_dumbbell', 'running'],
  },
  advanced: {
    environments: ['gym', 'home', 'backyard'],
    equipment: ['adjustable_dumbbells', 'barbell', 'pull_up_bar'],
    workoutTypes: ['gym_strength', 'hiit_conditioning', 'calisthenics'],
  },
};

@Injectable({ providedIn: 'root' })
export class UserService {
  private auth = inject(AuthService);
  private fs = inject(FirestoreService);

  readonly profile = signal<UserDoc | null>(null);
  private unsubscribe: (() => void) | null = null;

  watchProfile(): void {
    const uid = this.auth.uid();
    if (!uid) return;

    this.unsubscribe?.();
    this.unsubscribe = this.fs.onSnapshot<UserDoc>(`users/${uid}`, (data) => {
      this.profile.set(data);
    });
  }

  stopWatching(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async createProfile(data: {
    displayName: string;
    experienceLevel: ExperienceLevel;
    primaryGoal: PrimaryGoal;
  }): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Not authenticated');

    const defaults = PROFILE_DEFAULTS[data.experienceLevel];

    const doc: Omit<UserDoc, 'id'> = {
      email: user.email ?? '',
      displayName: data.displayName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: Timestamp.now(),
      experienceLevel: data.experienceLevel,
      primaryGoal: data.primaryGoal,
      availableEnvironments: defaults.environments,
      availableEquipment: defaults.equipment,
      preferredWorkoutTypes: defaults.workoutTypes,
      onboardingComplete: false,
      profileDefaultsApplied: true,
      soundEnabled: true,
    };

    await this.fs.set(`users/${user.uid}`, doc);
  }

  async getProfile(uid: string): Promise<UserDoc | null> {
    return this.fs.get<UserDoc>(`users/${uid}`);
  }

  async updateProfile(updates: Partial<UserDoc>): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) throw new Error('Not authenticated');
    await this.fs.update(`users/${uid}`, updates as Record<string, unknown>);
  }

  async completeOnboarding(data: {
    preferredWorkoutTypes: WorkoutTypeId[];
    availableEnvironments: EnvironmentId[];
    availableEquipment: EquipmentId[];
    movementLimitations?: string[];
  }): Promise<void> {
    await this.updateProfile({
      ...data,
      onboardingComplete: true,
      profileDefaultsApplied: false,
    });
  }
}
