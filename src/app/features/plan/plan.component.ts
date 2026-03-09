import { Component, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanService } from '../../core/services/plan.service';
import { PairService } from '../../core/services/pair.service';
import { AudioService } from '../../core/services/audio.service';
import { PlanDay, WorkoutMode, Weekday, WorkoutTypeId, EnvironmentPolicy } from '../../core/models';
import { PLAN_TEMPLATES, PlanTemplate } from '../../core/data/plan-templates';

const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

const MODE_COLORS: Record<WorkoutMode, string> = {
  together: '#4ade80',
  separate: '#818cf8',
  rest: '#888888',
  recovery: '#f59e0b',
  optional: '#a78bfa',
};

const MODE_LABELS: Record<WorkoutMode, string> = {
  together: 'Together',
  separate: 'Separate',
  rest: 'Rest',
  recovery: 'Recovery',
  optional: 'Optional',
};

const WORKOUT_LABELS: Record<WorkoutTypeId, string> = {
  running: 'Running',
  walking: 'Walking',
  gym_strength: 'Gym Strength',
  calisthenics: 'Calisthenics',
  backyard_bodyweight: 'Backyard Bodyweight',
  hiit_conditioning: 'HIIT',
  mobility: 'Mobility',
  pool_swimming: 'Swimming',
  home_dumbbell: 'Home Dumbbell',
  recovery: 'Recovery',
};

const ALL_MODES: WorkoutMode[] = ['together', 'separate', 'rest', 'recovery'];
const ALL_WORKOUT_TYPES: WorkoutTypeId[] = [
  'walking', 'running', 'backyard_bodyweight', 'calisthenics',
  'gym_strength', 'hiit_conditioning', 'mobility', 'home_dumbbell',
  'pool_swimming', 'recovery',
];

type Screen = 'main' | 'builder';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- MAIN SCREEN -->
    @if (screen() === 'main') {
      <div class="screen-enter" style="padding: 20px 16px 100px;">
        <h1 style="font-size: 28px; font-weight: 700; color: #f5f5f5; margin: 0 0 4px;">Plan</h1>
        <p style="color: #888; font-size: 14px; margin: 0 0 24px;">Build your weekly workout plan.</p>

        <!-- Active Plan -->
        @if (planService.activePlan(); as active) {
          <div style="background: #1a1a1a; border-radius: 16px; padding: 16px; margin-bottom: 24px; border: 1px solid #4ade80;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="background: #4ade80; color: #0f0f0f; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">ACTIVE</span>
              <span style="color: #f5f5f5; font-size: 17px; font-weight: 600;">{{ active.title }}</span>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              @for (d of active.days; track d.weekday) {
                <div style="width: 40px; text-align: center;">
                  <div style="font-size: 10px; color: #888; margin-bottom: 2px;">{{ weekdayLabel(d.weekday) }}</div>
                  <div [style.background]="modeColor(d.mode)" style="width: 40px; height: 6px; border-radius: 3px;"></div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Templates -->
        <h2 style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 12px;">Choose a Template</h2>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
          @for (tpl of templates; track tpl.title) {
            <button
              (click)="selectTemplate(tpl)"
              style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 14px; padding: 16px; text-align: left; cursor: pointer; min-height: 48px; width: 100%;"
            >
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="color: #f5f5f5; font-size: 16px; font-weight: 600;">{{ tpl.title }}</span>
                @if (tpl.beginner_safe) {
                  <span style="background: #4ade8033; color: #4ade80; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 999px;">BEGINNER</span>
                }
              </div>
              <p style="color: #888; font-size: 13px; margin: 0; line-height: 1.4;">{{ tpl.description }}</p>
            </button>
          }
        </div>

        <!-- Build Custom -->
        <button
          (click)="startCustom()"
          style="width: 100%; background: #1a1a1a; border: 2px dashed #4ade80; border-radius: 14px; padding: 16px; color: #4ade80; font-size: 16px; font-weight: 600; cursor: pointer; min-height: 48px;"
        >
          + Build Custom Plan
        </button>
      </div>
    }

    <!-- BUILDER SCREEN -->
    @if (screen() === 'builder') {
      <div class="screen-enter" style="padding: 20px 16px 100px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
          <button (click)="goBack()" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer; padding: 8px; min-width: 48px; min-height: 48px; display: flex; align-items: center; justify-content: center;">
            &#8592;
          </button>
          <div>
            <h1 style="font-size: 22px; font-weight: 700; color: #f5f5f5; margin: 0;">{{ builderTitle() }}</h1>
            <p style="color: #888; font-size: 13px; margin: 0;">Tap a day to edit</p>
          </div>
        </div>

        <!-- Plan Title Input -->
        <div style="margin-bottom: 20px;">
          <input
            [value]="builderTitle()"
            (input)="onTitleInput($event)"
            placeholder="Plan name"
            style="width: 100%; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 14px 16px; color: #f5f5f5; font-size: 16px; outline: none; box-sizing: border-box;"
          />
        </div>

        <!-- Day Cards -->
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          @for (d of builderDays(); track d.weekday) {
            <div
              style="background: #1a1a1a; border-radius: 14px; padding: 14px 16px; border: 1px solid #2a2a2a;"
            >
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #f5f5f5; font-size: 16px; font-weight: 600;">{{ weekdayLabel(d.weekday) }}</span>
                <span
                  [style.background]="modeColor(d.mode)"
                  style="color: #0f0f0f; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;"
                >{{ modeLabel(d.mode) }}</span>
              </div>

              <!-- Mode selector -->
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
                @for (m of allModes; track m) {
                  <button
                    (click)="setDayMode(d.weekday, m)"
                    [style.background]="d.mode === m ? modeColor(m) : '#2a2a2a'"
                    [style.color]="d.mode === m ? '#0f0f0f' : '#888'"
                    style="border: none; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; min-height: 36px;"
                  >{{ modeLabel(m) }}</button>
                }
              </div>

              <!-- Workout type selector (hidden for rest) -->
              @if (d.mode !== 'rest') {
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  @for (wt of allWorkoutTypes; track wt) {
                    <button
                      (click)="setDayWorkout(d.weekday, wt)"
                      [style.background]="d.workoutTypePrimary === wt ? '#4ade80' : '#222'"
                      [style.color]="d.workoutTypePrimary === wt ? '#0f0f0f' : '#aaa'"
                      style="border: none; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 600; cursor: pointer; min-height: 36px;"
                    >{{ workoutLabel(wt) }}</button>
                  }
                </div>
              }

              <!-- Duration (hidden for rest) -->
              @if (d.mode !== 'rest') {
                <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #888; font-size: 12px;">Duration:</span>
                  <div style="display: flex; gap: 4px;">
                    @for (dur of durations; track dur) {
                      <button
                        (click)="setDayDuration(d.weekday, dur)"
                        [style.background]="d.durationMinutes === dur ? '#4ade80' : '#222'"
                        [style.color]="d.durationMinutes === dur ? '#0f0f0f' : '#aaa'"
                        style="border: none; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; min-height: 32px;"
                      >{{ dur }}m</button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Save button -->
        <button
          (click)="savePlan()"
          [disabled]="saving()"
          style="width: 100%; background: #4ade80; color: #0f0f0f; border: none; border-radius: 14px; padding: 16px; font-size: 17px; font-weight: 700; cursor: pointer; min-height: 56px; opacity: 1;"
          [style.opacity]="saving() ? '0.5' : '1'"
        >
          {{ saving() ? 'Saving...' : 'Save Plan' }}
        </button>
        @if (saveError()) {
          <p style="color: #ef4444; text-align: center; font-size: 14px; margin: 8px 0 0;">{{ saveError() }}</p>
        }
      </div>
    }
  `,
})
export class PlanComponent implements OnInit, OnDestroy {
  readonly planService = inject(PlanService);
  private pairService = inject(PairService);
  private audio = inject(AudioService);

  readonly templates = PLAN_TEMPLATES;
  readonly allModes = ALL_MODES;
  readonly allWorkoutTypes = ALL_WORKOUT_TYPES;
  readonly durations = [15, 20, 25, 30, 35, 40, 45, 50, 60];

  readonly screen = signal<Screen>('main');
  readonly builderTitle = signal('My Plan');
  readonly builderDays = signal<PlanDay[]>([]);
  readonly saving = signal(false);
  readonly saveError = signal('');

  private watchEffect = effect(() => {
    const pair = this.pairService.activePair();
    if (pair) {
      this.planService.watchPlans(pair.id);
    }
  });

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.planService.stopWatching();
  }

  weekdayLabel(w: Weekday): string { return WEEKDAY_LABELS[w]; }
  modeColor(m: WorkoutMode): string { return MODE_COLORS[m]; }
  modeLabel(m: WorkoutMode): string { return MODE_LABELS[m]; }
  workoutLabel(wt: WorkoutTypeId): string { return WORKOUT_LABELS[wt]; }

  selectTemplate(tpl: PlanTemplate): void {
    this.audio.play('tap-primary');
    this.builderTitle.set(tpl.title);
    this.builderDays.set(tpl.days.map(d => ({ ...d })));
    this.screen.set('builder');
  }

  startCustom(): void {
    this.audio.play('tap-primary');
    this.builderTitle.set('My Custom Plan');
    const days: PlanDay[] = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map(weekday => ({
      weekday,
      mode: 'rest' as WorkoutMode,
      workoutTypePrimary: 'recovery' as WorkoutTypeId,
      durationMinutes: 0,
      environmentPolicy: 'shared' as EnvironmentPolicy,
    }));
    this.builderDays.set(days);
    this.screen.set('builder');
  }

  goBack(): void {
    this.audio.play('tap-secondary');
    this.screen.set('main');
  }

  onTitleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.builderTitle.set(input.value);
  }

  setDayMode(weekday: Weekday, mode: WorkoutMode): void {
    this.audio.play('tap-secondary');
    this.updateDay(weekday, d => {
      d.mode = mode;
      if (mode === 'rest') {
        d.workoutTypePrimary = 'recovery';
        d.durationMinutes = 0;
      } else if (d.durationMinutes === 0) {
        d.durationMinutes = 25;
      }
    });
  }

  setDayWorkout(weekday: Weekday, wt: WorkoutTypeId): void {
    this.audio.play('tap-secondary');
    this.updateDay(weekday, d => { d.workoutTypePrimary = wt; });
  }

  setDayDuration(weekday: Weekday, dur: number): void {
    this.audio.play('tap-secondary');
    this.updateDay(weekday, d => { d.durationMinutes = dur; });
  }

  async savePlan(): Promise<void> {
    const pair = this.pairService.activePair();
    if (!pair) return;

    this.saving.set(true);
    this.saveError.set('');
    this.audio.play('tap-primary');

    try {
      const today = new Date().toISOString().split('T')[0];
      const planId = await this.planService.createPlan(pair.id, {
        title: this.builderTitle(),
        active: true,
        startDate: today,
        days: this.builderDays(),
      });
      await this.planService.setActivePlan(pair.id, planId);
      this.audio.play('workout-complete');
      this.screen.set('main');
    } catch (err) {
      this.audio.play('error');
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save plan. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  private updateDay(weekday: Weekday, fn: (d: PlanDay) => void): void {
    const days = this.builderDays().map(d => {
      if (d.weekday === weekday) {
        const copy = { ...d };
        fn(copy);
        return copy;
      }
      return d;
    });
    this.builderDays.set(days);
  }
}
