import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AudioService } from '../../core/services/audio.service';
import { UserService } from '../../core/services/user.service';
import { PairService } from '../../core/services/pair.service';
import { WorkoutTypeId, EnvironmentId, EquipmentId } from '../../core/models/user.model';

const WORKOUT_TYPES: { id: WorkoutTypeId; label: string }[] = [
  { id: 'running', label: 'Running' },
  { id: 'walking', label: 'Walking' },
  { id: 'gym_strength', label: 'Gym Strength' },
  { id: 'calisthenics', label: 'Calisthenics' },
  { id: 'backyard_bodyweight', label: 'Backyard' },
  { id: 'hiit_conditioning', label: 'HIIT' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'pool_swimming', label: 'Swimming' },
  { id: 'home_dumbbell', label: 'Home Dumbbell' },
  { id: 'recovery', label: 'Recovery' },
];

const ENVIRONMENTS: { id: EnvironmentId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'backyard', label: 'Backyard' },
  { id: 'neighborhood', label: 'Neighborhood' },
  { id: 'park', label: 'Park' },
  { id: 'track', label: 'Track' },
  { id: 'treadmill', label: 'Treadmill' },
  { id: 'gym', label: 'Gym' },
  { id: 'pool', label: 'Pool' },
];

const EQUIPMENT: { id: EquipmentId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'resistance_bands', label: 'Bands' },
  { id: 'light_dumbbells', label: 'Light DBs' },
  { id: 'adjustable_dumbbells', label: 'Adj. DBs' },
  { id: 'medicine_ball', label: 'Med Ball' },
  { id: 'pull_up_bar', label: 'Pull-up Bar' },
  { id: 'dip_station', label: 'Dip Station' },
  { id: 'kettlebells', label: 'Kettlebells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'machines', label: 'Machines' },
  { id: 'step_platform', label: 'Step' },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="screen-enter" style="padding: 20px 16px 100px;">
      <h1 style="font-size: 28px; font-weight: 700; color: #f5f5f5; margin: 0 0 24px;">Settings</h1>

      <div style="display: flex; flex-direction: column; gap: 16px;">

        <!-- Account -->
        <section style="background: #1a1a1a; border-radius: 12px; padding: 16px;">
          <h2 style="font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Account</h2>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #888; font-size: 14px;">Name</span>
              <span style="color: #f5f5f5; font-size: 14px;">{{ user.profile()?.displayName ?? '—' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #888; font-size: 14px;">Email</span>
              <span style="color: #f5f5f5; font-size: 14px;">{{ user.profile()?.email ?? '—' }}</span>
            </div>
          </div>
        </section>

        <!-- Sound toggle -->
        <section style="background: #1a1a1a; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #f5f5f5; font-size: 15px;">Sounds</span>
          <button
            style="background: none; border: 2px solid #333; border-radius: 20px; width: 52px; height: 28px; position: relative; cursor: pointer; min-height: 48px; min-width: 52px; padding: 0;"
            [style.background]="audio.enabled() ? '#4ade80' : '#333'"
            [style.borderColor]="audio.enabled() ? '#4ade80' : '#333'"
            (click)="toggleSound()"
          >
            <span
              style="position: absolute; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; border-radius: 50%; background: white; transition: left 150ms ease;"
              [style.left]="audio.enabled() ? '28px' : '4px'"
            ></span>
          </button>
        </section>

        <!-- Partner -->
        <section style="background: #1a1a1a; border-radius: 12px; padding: 16px;">
          <h2 style="font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Partner</h2>
          @if (pairService.activePair(); as pair) {
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #f5f5f5; font-size: 14px;">Paired</span>
              <span style="color: #4ade80; font-size: 13px; font-weight: 500;">Active</span>
            </div>
          } @else {
            <a routerLink="/partner" style="display: flex; align-items: center; gap: 8px; color: #4ade80; font-size: 14px; font-weight: 500; text-decoration: none; min-height: 48px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Invite a partner
            </a>
          }
        </section>

        <!-- Complete Profile Banner -->
        @if (user.profile() && !user.profile()!.onboardingComplete) {
          <section style="background: #1a1a1a; border: 1px solid #4ade8044; border-radius: 12px; padding: 16px;">
            <h2 style="font-size: 13px; font-weight: 600; color: #4ade80; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">Complete Your Profile</h2>
            <p style="color: #888; font-size: 13px; margin: 0 0 12px;">Set your workout preferences for better recommendations.</p>
            <button
              style="color: #4ade80; background: none; border: 1px solid #4ade80; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; min-height: 48px;"
              (click)="showPreferences.set(true)"
            >
              Set Preferences
            </button>
          </section>
        }

        <!-- Workout Preferences -->
        <section style="background: #1a1a1a; border-radius: 12px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h2 style="font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">Workout Types</h2>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            @for (wt of workoutTypes; track wt.id) {
              <button
                style="border-radius: 20px; padding: 8px 14px; font-size: 13px; font-weight: 500; cursor: pointer; min-height: 48px; transition: all 150ms ease;"
                [style.background]="isWorkoutSelected(wt.id) ? '#4ade8022' : '#222'"
                [style.color]="isWorkoutSelected(wt.id) ? '#4ade80' : '#888'"
                [style.border]="isWorkoutSelected(wt.id) ? '1px solid #4ade8044' : '1px solid #333'"
                (click)="toggleWorkoutType(wt.id)"
              >{{ wt.label }}</button>
            }
          </div>
        </section>

        <section style="background: #1a1a1a; border-radius: 12px; padding: 16px;">
          <h2 style="font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Environments</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            @for (env of environments; track env.id) {
              <button
                style="border-radius: 20px; padding: 8px 14px; font-size: 13px; font-weight: 500; cursor: pointer; min-height: 48px; transition: all 150ms ease;"
                [style.background]="isEnvSelected(env.id) ? '#4ade8022' : '#222'"
                [style.color]="isEnvSelected(env.id) ? '#4ade80' : '#888'"
                [style.border]="isEnvSelected(env.id) ? '1px solid #4ade8044' : '1px solid #333'"
                (click)="toggleEnvironment(env.id)"
              >{{ env.label }}</button>
            }
          </div>
        </section>

        <section style="background: #1a1a1a; border-radius: 12px; padding: 16px;">
          <h2 style="font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Equipment</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            @for (eq of equipment; track eq.id) {
              <button
                style="border-radius: 20px; padding: 8px 14px; font-size: 13px; font-weight: 500; cursor: pointer; min-height: 48px; transition: all 150ms ease;"
                [style.background]="isEquipSelected(eq.id) ? '#4ade8022' : '#222'"
                [style.color]="isEquipSelected(eq.id) ? '#4ade80' : '#888'"
                [style.border]="isEquipSelected(eq.id) ? '1px solid #4ade8044' : '1px solid #333'"
                (click)="toggleEquipment(eq.id)"
              >{{ eq.label }}</button>
            }
          </div>
        </section>

        @if (prefsDirty()) {
          <button
            style="background: #4ade80; color: #0a0a0a; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; min-height: 48px;"
            (click)="savePreferences()"
          >
            Save Preferences
          </button>
        }

        <!-- History -->
        <a
          routerLink="/history"
          style="background: #1a1a1a; border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; text-decoration: none; min-height: 48px;"
        >
          <span style="color: #f5f5f5; font-size: 15px;">Session History</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>

        <!-- Danger zone -->
        <section style="margin-top: 8px;">
          <h2 style="font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Danger Zone</h2>
          <button
            style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 16px; color: #ef4444; font-size: 15px; font-weight: 500; cursor: pointer; text-align: left; width: 100%; min-height: 48px;"
            (click)="signOut()"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly user = inject(UserService);
  readonly audio = inject(AudioService);
  readonly pairService = inject(PairService);

  readonly showPreferences = signal(false);
  readonly prefsDirty = signal(false);

  readonly workoutTypes = WORKOUT_TYPES;
  readonly environments = ENVIRONMENTS;
  readonly equipment = EQUIPMENT;

  private selectedWorkoutTypes = signal<Set<WorkoutTypeId>>(new Set());
  private selectedEnvironments = signal<Set<EnvironmentId>>(new Set());
  private selectedEquipment = signal<Set<EquipmentId>>(new Set());

  ngOnInit(): void {
    const profile = this.user.profile();
    if (profile) {
      this.selectedWorkoutTypes.set(new Set(profile.preferredWorkoutTypes ?? []));
      this.selectedEnvironments.set(new Set(profile.availableEnvironments ?? []));
      this.selectedEquipment.set(new Set(profile.availableEquipment ?? []));
    }
  }

  toggleSound(): void {
    const newValue = !this.audio.enabled();
    this.audio.setEnabled(newValue);
    if (newValue) this.audio.play('tap-secondary');
    this.user.updateProfile({ soundEnabled: newValue });
  }

  isWorkoutSelected(id: WorkoutTypeId): boolean {
    return this.selectedWorkoutTypes().has(id);
  }

  isEnvSelected(id: EnvironmentId): boolean {
    return this.selectedEnvironments().has(id);
  }

  isEquipSelected(id: EquipmentId): boolean {
    return this.selectedEquipment().has(id);
  }

  toggleWorkoutType(id: WorkoutTypeId): void {
    this.audio.play('tap-secondary');
    const set = new Set(this.selectedWorkoutTypes());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.selectedWorkoutTypes.set(set);
    this.prefsDirty.set(true);
  }

  toggleEnvironment(id: EnvironmentId): void {
    this.audio.play('tap-secondary');
    const set = new Set(this.selectedEnvironments());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.selectedEnvironments.set(set);
    this.prefsDirty.set(true);
  }

  toggleEquipment(id: EquipmentId): void {
    this.audio.play('tap-secondary');
    const set = new Set(this.selectedEquipment());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.selectedEquipment.set(set);
    this.prefsDirty.set(true);
  }

  async savePreferences(): Promise<void> {
    this.audio.play('tap-primary');
    const profile = this.user.profile();
    const data = {
      preferredWorkoutTypes: Array.from(this.selectedWorkoutTypes()),
      availableEnvironments: Array.from(this.selectedEnvironments()),
      availableEquipment: Array.from(this.selectedEquipment()),
    };

    if (profile && !profile.onboardingComplete) {
      await this.user.completeOnboarding(data);
    } else {
      await this.user.updateProfile(data);
    }
    this.prefsDirty.set(false);
  }

  async signOut(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
