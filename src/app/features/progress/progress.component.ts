import { Component, inject, computed, OnDestroy, effect } from '@angular/core';
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

      @if (!pair.activePair()) {
        <div style="text-align: center; padding: 48px 16px;">
          <p style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px;">No partner linked yet</p>
          <p style="color: #888; font-size: 14px; margin: 0;">Link with a partner to start tracking shared progress.</p>
        </div>
      } @else {
        <!-- Streaks -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
          <div style="background: #1a1a1a; border-radius: 14px; padding: 16px; text-align: center;">
            <div style="font-size: 36px; font-weight: 800; color: #4ade80;">
              {{ sharedStreakCount() }}
            </div>
            <div style="font-size: 12px; color: #888; margin-top: 4px;">Shared Streak</div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">Best: {{ sharedStreakBest() }}</div>
          </div>
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
              <div style="height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
                <div
                  style="height: 100%; border-radius: 3px; transition: width 300ms ease;"
                  [style.width.%]="(medal.currentProgress / medal.requirement) * 100"
                  [style.background]="medal.iconColor"
                ></div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                <span style="font-size: 11px; color: #888;">{{ medal.currentProgress }} / {{ medal.requirement }}</span>
                <span style="font-size: 11px; color: #666;">
                  {{ medal.currentProgress >= medal.requirement ? 'Complete!' : (medal.requirement - medal.currentProgress) + ' more to go' }}
                </span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProgressComponent implements OnDestroy {
  readonly pair = inject(PairService);
  private streakService = inject(StreakService);
  private audio = inject(AudioService);

  private watchEffect = effect(() => {
    const pairId = this.pair.activePair()?.id;
    if (pairId) {
      this.streakService.watchStreaks(pairId);
    }
  });

  readonly sharedStreakCount = computed(() =>
    this.streakService.getSharedStreak('shared_completion')?.currentCount ?? 0
  );
  readonly sharedStreakBest = computed(() =>
    this.streakService.getSharedStreak('shared_completion')?.bestCount ?? 0
  );
  readonly personalStreakCount = computed(() =>
    this.streakService.getPersonalStreak('personal_completion')?.currentCount ?? 0
  );
  readonly personalStreakBest = computed(() =>
    this.streakService.getPersonalStreak('personal_completion')?.bestCount ?? 0
  );

  readonly medals = computed<MedalDisplay[]>(() => {
    const shared = this.sharedStreakCount();
    const personalBest = this.personalStreakBest();
    const personal = this.personalStreakCount();

    return [
      {
        name: 'First Steps',
        description: 'Complete your first shared workout',
        tier: shared >= 1 ? 'gold' : 'locked',
        currentProgress: Math.min(shared, 1),
        requirement: 1,
        iconColor: shared >= 1 ? TIER_COLORS['gold'] : TIER_COLORS['locked'],
      },
      {
        name: 'Week Warrior',
        description: 'Complete 4 shared workouts in total',
        tier: shared >= 4 ? 'bronze' : 'locked',
        currentProgress: Math.min(shared, 4),
        requirement: 4,
        iconColor: shared >= 4 ? TIER_COLORS['bronze'] : TIER_COLORS['locked'],
      },
      {
        name: 'Team Consistency',
        description: 'Complete shared workouts together',
        tier: shared >= 20 ? 'gold' : shared >= 10 ? 'silver' : shared >= 5 ? 'bronze' : 'locked',
        currentProgress: shared,
        requirement: shared >= 20 ? 50 : shared >= 10 ? 20 : shared >= 5 ? 10 : 5,
        iconColor: shared >= 20 ? TIER_COLORS['gold'] : shared >= 10 ? TIER_COLORS['silver'] : shared >= 5 ? TIER_COLORS['bronze'] : TIER_COLORS['locked'],
      },
      {
        name: 'Momentum Keeper',
        description: 'Maintain your personal streak',
        tier: personalBest >= 30 ? 'gold' : personalBest >= 14 ? 'silver' : personalBest >= 7 ? 'bronze' : 'locked',
        currentProgress: personal,
        requirement: personalBest >= 30 ? 60 : personalBest >= 14 ? 30 : personalBest >= 7 ? 14 : 7,
        iconColor: personalBest >= 30 ? TIER_COLORS['gold'] : personalBest >= 14 ? TIER_COLORS['silver'] : personalBest >= 7 ? TIER_COLORS['bronze'] : TIER_COLORS['locked'],
      },
    ];
  });

  ngOnDestroy(): void {
    this.streakService.stopWatching();
  }
}
