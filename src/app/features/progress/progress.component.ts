import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { PairService } from '../../core/services/pair.service';
import { StreakService } from '../../core/services/streak.service';
import { AudioService } from '../../core/services/audio.service';

interface MedalDisplay {
  name: string;
  description: string;
  tier: string;
  currentProgress: number;
  requirement: number;
  iconColor: string;
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
  locked: '#444',
};

@Component({
  selector: 'app-progress',
  standalone: true,
  template: `
    <div class="screen-enter" style="padding: 20px 16px 100px;">
      <h1 style="font-size: 28px; font-weight: 700; color: #f5f5f5; margin: 0 0 24px;">Progress</h1>

      <!-- Streaks -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
        <!-- Shared streak -->
        <div style="background: #1a1a1a; border-radius: 14px; padding: 16px; text-align: center;">
          <div style="font-size: 36px; font-weight: 800; color: #4ade80;">
            {{ sharedStreakCount() }}
          </div>
          <div style="font-size: 12px; color: #888; margin-top: 4px;">Shared Streak</div>
          <div style="font-size: 11px; color: #666; margin-top: 2px;">Best: {{ sharedStreakBest() }}</div>
        </div>

        <!-- Personal streak -->
        <div style="background: #1a1a1a; border-radius: 14px; padding: 16px; text-align: center;">
          <div style="font-size: 36px; font-weight: 800; color: #818cf8;">
            {{ personalStreakCount() }}
          </div>
          <div style="font-size: 12px; color: #888; margin-top: 4px;">Personal Streak</div>
          <div style="font-size: 11px; color: #666; margin-top: 2px;">Best: {{ personalStreakBest() }}</div>
        </div>
      </div>

      <!-- Medals -->
      <h2 style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 12px;">Medals</h2>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        @for (medal of medals(); track medal.name) {
          <div style="background: #1a1a1a; border-radius: 14px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
              <div
                style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;"
                [style.background]="medal.iconColor + '22'"
                [style.color]="medal.iconColor"
              >
                @if (medal.tier === 'locked') { 🔒 }
                @else if (medal.tier === 'bronze') { 🥉 }
                @else if (medal.tier === 'silver') { 🥈 }
                @else if (medal.tier === 'gold') { 🥇 }
                @else { 💎 }
              </div>
              <div style="flex: 1;">
                <div style="font-size: 15px; font-weight: 600; color: #f5f5f5;">{{ medal.name }}</div>
                <div style="font-size: 12px; color: #888;">{{ medal.description }}</div>
              </div>
              <div
                style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; text-transform: uppercase;"
                [style.background]="medal.iconColor + '22'"
                [style.color]="medal.iconColor"
              >
                {{ medal.tier === 'locked' ? 'Locked' : medal.tier }}
              </div>
            </div>
            <!-- Progress bar -->
            <div style="height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
              <div
                style="height: 100%; border-radius: 3px; transition: width 300ms ease;"
                [style.width.%]="(medal.currentProgress / medal.requirement) * 100"
                [style.background]="medal.iconColor"
              ></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 6px;">
              <span style="font-size: 11px; color: #888;">{{ medal.currentProgress }} / {{ medal.requirement }}</span>
              <span style="font-size: 11px; color: #666;">{{ medal.requirement - medal.currentProgress }} more to go</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProgressComponent implements OnInit, OnDestroy {
  private pair = inject(PairService);
  private streakService = inject(StreakService);
  private audio = inject(AudioService);

  medals = signal<MedalDisplay[]>([]);

  private watchEffect = effect(() => {
    const pairId = this.pair.activePair()?.id;
    if (pairId) {
      this.streakService.watchStreaks(pairId);
    }
  });

  readonly sharedStreakCount = () =>
    this.streakService.getSharedStreak('shared_completion')?.currentCount ?? 0;
  readonly sharedStreakBest = () =>
    this.streakService.getSharedStreak('shared_completion')?.bestCount ?? 0;
  readonly personalStreakCount = () =>
    this.streakService.getPersonalStreak('personal_completion')?.currentCount ?? 0;
  readonly personalStreakBest = () =>
    this.streakService.getPersonalStreak('personal_completion')?.bestCount ?? 0;

  ngOnInit(): void {
    // Static medal definitions for MVP — will be driven by Firestore achievements later
    this.medals.set([
      {
        name: 'Team Consistency',
        description: 'Complete shared workouts together',
        tier: this.sharedStreakCount() >= 20 ? 'gold' : this.sharedStreakCount() >= 10 ? 'silver' : this.sharedStreakCount() >= 5 ? 'bronze' : 'locked',
        currentProgress: this.sharedStreakCount(),
        requirement: this.sharedStreakCount() >= 20 ? 50 : this.sharedStreakCount() >= 10 ? 20 : this.sharedStreakCount() >= 5 ? 10 : 5,
        iconColor: this.sharedStreakCount() >= 20 ? TIER_COLORS['gold'] : this.sharedStreakCount() >= 10 ? TIER_COLORS['silver'] : this.sharedStreakCount() >= 5 ? TIER_COLORS['bronze'] : TIER_COLORS['locked'],
      },
      {
        name: 'Momentum Keeper',
        description: 'Maintain your personal streak',
        tier: this.personalStreakBest() >= 30 ? 'gold' : this.personalStreakBest() >= 14 ? 'silver' : this.personalStreakBest() >= 7 ? 'bronze' : 'locked',
        currentProgress: this.personalStreakCount(),
        requirement: this.personalStreakBest() >= 30 ? 60 : this.personalStreakBest() >= 14 ? 30 : this.personalStreakBest() >= 7 ? 14 : 7,
        iconColor: this.personalStreakBest() >= 30 ? TIER_COLORS['gold'] : this.personalStreakBest() >= 14 ? TIER_COLORS['silver'] : this.personalStreakBest() >= 7 ? TIER_COLORS['bronze'] : TIER_COLORS['locked'],
      },
      {
        name: 'First Steps',
        description: 'Complete your first shared workout',
        tier: this.sharedStreakCount() >= 1 ? 'gold' : 'locked',
        currentProgress: Math.min(this.sharedStreakCount(), 1),
        requirement: 1,
        iconColor: this.sharedStreakCount() >= 1 ? TIER_COLORS['gold'] : TIER_COLORS['locked'],
      },
      {
        name: 'Week Warrior',
        description: 'Complete 4 shared workouts in total',
        tier: this.sharedStreakCount() >= 4 ? 'bronze' : 'locked',
        currentProgress: Math.min(this.sharedStreakCount(), 4),
        requirement: 4,
        iconColor: this.sharedStreakCount() >= 4 ? TIER_COLORS['bronze'] : TIER_COLORS['locked'],
      },
    ]);
  }

  ngOnDestroy(): void {
    this.streakService.stopWatching();
  }
}
