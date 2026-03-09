import { Component, inject, signal, OnInit, OnDestroy, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { PairService } from '../../core/services/pair.service';
import { PlanService } from '../../core/services/plan.service';
import { SessionService } from '../../core/services/session.service';
import { PresenceService } from '../../core/services/presence.service';
import { StreakService } from '../../core/services/streak.service';
import { AudioService } from '../../core/services/audio.service';
import { FirestoreService } from '../../core/services/firestore.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell.component';
import { SessionDoc, UserDoc } from '../../core/models';
import { SEED_EXERCISES, SEED_VARIANTS } from '../../core/data/exercises';
import { ExerciseDoc, ExerciseVariantDoc } from '../../core/models';

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [NotificationBellComponent],
  template: `
    <div class="today-screen screen-enter">
      <header class="today-header">
        <div>
          <h1>Today</h1>
          <p class="date">{{ todayFormatted }}</p>
        </div>
        <div class="header-right">
          <app-notification-bell />
          <div class="streak-badge" aria-label="Current streak">
            {{ streakCount() }} 🔥
          </div>
        </div>
      </header>

      <!-- Loading state -->
      @if (loading()) {
        <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px 0;">
          <div class="skeleton-line" style="height: 120px; border-radius: 16px;"></div>
          <div class="skeleton-line" style="height: 80px; border-radius: 12px;"></div>
        </div>
      }

      <!-- No partner linked state -->
      @else if (!pair.activePair()) {
        <div class="empty-state">
          <p class="empty-title">No partner linked yet</p>
          <p class="empty-subtitle">Invite your partner to get started with shared accountability.</p>
          <button class="btn-primary" (click)="goToPartner()">Invite a Partner</button>
        </div>
      }

      <!-- No plan created state -->
      @else if (!todaySession()) {
        <div class="empty-state">
          <p class="empty-title">No workout planned for today</p>
          <p class="empty-subtitle">Create a weekly plan to start training together.</p>
          <button class="btn-primary" (click)="goToPlan()">Build a Plan</button>
        </div>
      }

      <!-- Rest day state -->
      @else if (todaySession()!.mode === 'rest') {
        <div class="rest-card">
          <p class="rest-title">Rest Day</p>
          <p class="rest-subtitle">Recovery is part of the plan.</p>
          <div class="streak-display">Streak: {{ streakCount() }} days</div>
        </div>
      }

      <!-- Active workout card -->
      @else {
        <div class="workout-card" (click)="openWorkout()">
          <div class="card-top">
            <span class="mode-badge" [class]="todaySession()!.mode">
              {{ todaySession()!.mode === 'together' ? 'Together' : 'Separate' }}
            </span>
            <span class="duration">~{{ getEstimatedDuration() }} min</span>
          </div>

          <h2 class="workout-title">{{ getWorkoutTitle() }}</h2>

          <div class="partner-statuses">
            <!-- My status -->
            <div class="status-item">
              <div class="avatar me" [class.done]="myCompleted()">
                {{ myCompleted() ? '✓' : userInitial() }}
              </div>
              <span>{{ myCompleted() ? 'Done' : 'Pending' }}</span>
            </div>

            <!-- Partner status -->
            <div class="status-item">
              <div
                class="avatar partner-avatar"
                [class.live]="presence.partnerOnline()"
                [class.done]="partnerCompleted()"
              >
                {{ partnerCompleted() ? '✓' : partnerInitial() }}
              </div>
              <span>{{ partnerCompleted() ? 'Done' : 'Pending' }}</span>
            </div>
          </div>

          <button class="btn-primary start-btn">
            {{ myCompleted() ? 'View Workout' : 'Start Workout' }}
          </button>
        </div>

        <!-- North Star medal target -->
        <div class="north-star-card">
          <p class="ns-label">Next milestone</p>
          <p class="ns-target">Complete 3 shared workouts this week</p>
          <div class="ns-progress-bar">
            <div class="ns-fill" [style.width.%]="northStarProgress()"></div>
          </div>
        </div>
      }

      <!-- Finish Setup card (deferred onboarding) -->
      @if (user.profile() && !user.profile()!.onboardingComplete) {
        <div class="setup-card">
          <p class="setup-title">Finish your profile</p>
          <p class="setup-subtitle">Add workout preferences for better personalized sessions.</p>
          <button class="btn-secondary" (click)="goToSettings()">Complete Setup</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .today-screen { padding: 20px 16px; }
    .today-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    h1 { font-size: 28px; font-weight: 700; color: #f5f5f5; margin: 0; }
    .date { color: #888; font-size: 14px; margin: 4px 0 0; }
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .streak-badge {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 16px;
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: 48px 16px;
    }
    .empty-title { font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px; }
    .empty-subtitle { color: #888; font-size: 14px; margin: 0 0 24px; }

    .rest-card {
      background: #1a1a1a;
      border-radius: 16px;
      padding: 32px 24px;
      text-align: center;
    }
    .rest-title { font-size: 20px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px; }
    .rest-subtitle { color: #888; font-size: 15px; margin: 0 0 16px; }
    .streak-display { color: #4ade80; font-weight: 600; }

    .workout-card {
      background: #1a1a1a;
      border-radius: 16px;
      padding: 20px;
      cursor: pointer;
      margin-bottom: 16px;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .mode-badge {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 6px;
      &.together { background: #0a2a15; color: #4ade80; }
      &.separate { background: #1a1a3a; color: #818cf8; }
    }
    .duration { color: #888; font-size: 13px; }
    .workout-title { font-size: 20px; font-weight: 600; color: #f5f5f5; margin: 0 0 16px; }

    .partner-statuses {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #888;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      color: #888;
      &.done { background: #0a2a15; color: #4ade80; }
      &.me { border: 2px solid #555; }
    }

    .start-btn { width: 100%; }

    .north-star-card {
      background: #1a1a1a;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .ns-label { color: #888; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .ns-target { color: #f5f5f5; font-size: 15px; font-weight: 500; margin: 0 0 12px; }
    .ns-progress-bar {
      height: 6px;
      background: #333;
      border-radius: 3px;
      overflow: hidden;
    }
    .ns-fill {
      height: 100%;
      background: #4ade80;
      border-radius: 3px;
      transition: width 300ms ease;
    }

    .setup-card {
      background: #1a1a2a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 16px;
    }
    .setup-title { font-size: 15px; font-weight: 600; color: #f5f5f5; margin: 0 0 4px; }
    .setup-subtitle { font-size: 13px; color: #888; margin: 0 0 12px; }
    .btn-primary {
      background: #4ade80;
      color: #0f0f0f;
      border: none;
      border-radius: 12px;
      padding: 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      min-height: 56px;
      width: 100%;
    }
    .btn-secondary {
      background: #2a2a2a;
      color: #f5f5f5;
      border: none;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
  `],
})
export class TodayComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  private fs = inject(FirestoreService);
  private audio = inject(AudioService);
  private sessionService = inject(SessionService);
  private planService = inject(PlanService);
  private streakService = inject(StreakService);
  private notificationService = inject(NotificationService);
  readonly user = inject(UserService);
  readonly pair = inject(PairService);
  readonly presence = inject(PresenceService);

  readonly todaySession = computed(() => this.sessionService.todaySession());
  northStarProgress = signal(33);
  sessionGenerating = signal(false);
  loading = signal(true);

  readonly streakCount = computed(() =>
    this.streakService.getSharedStreak('shared_completion')?.currentCount ?? 0
  );

  readonly todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  readonly userInitial = computed(() => {
    const name = this.user.profile()?.displayName ?? '';
    return name.charAt(0).toUpperCase();
  });

  readonly partnerInitial = signal('P');

  // Load partner profile for real initial
  private partnerLoader = effect(() => {
    const partnerUid = this.pair.partnerUid();
    if (partnerUid) {
      this.user.getProfile(partnerUid).then(profile => {
        if (profile) {
          this.partnerInitial.set(profile.displayName.charAt(0).toUpperCase());
        }
      });
    }
  });

  readonly myCompleted = computed(() => {
    const session = this.todaySession();
    const uid = this.auth.uid();
    if (!session || !uid) return false;
    return session.users[uid]?.completionState === 'completed';
  });

  readonly partnerCompleted = computed(() => {
    const session = this.todaySession();
    const uid = this.auth.uid();
    if (!session || !uid) return false;
    const partnerData = Object.entries(session.users).find(([id]) => id !== uid);
    return partnerData?.[1]?.completionState === 'completed';
  });

  // Reactive: when pair becomes available, start watchers and auto-generate session
  private pairWatcher = effect(() => {
    const pairData = this.pair.activePair();
    if (pairData) {
      this.sessionService.watchTodaySession(pairData.id);
      this.planService.watchPlans(pairData.id);
      this.streakService.watchStreaks(pairData.id);
      this.presence.goOnline(pairData.id);
      const partnerUid = this.pair.partnerUid();
      if (partnerUid) {
        this.presence.watchPartner(pairData.id, partnerUid);
      }
    }
  });

  // Auto-generate session when plan is available and no session exists
  private sessionGenerator = effect(() => {
    const plan = this.planService.activePlan();
    const pairData = this.pair.activePair();
    const profile = this.user.profile();
    const session = this.sessionService.todaySession();

    if (plan && pairData && profile && !session && !this.sessionGenerating()) {
      this.generateSession(pairData.id, plan, profile);
    }
  });

  ngOnInit(): void {
    this.user.watchProfile();
    this.pair.watchPair();
    const uid = this.auth.uid();
    if (uid) {
      this.notificationService.watchNotifications(uid);
    }
    // Resolve loading after a brief wait for initial data
    setTimeout(() => this.loading.set(false), 1500);
  }

  ngOnDestroy(): void {
    this.sessionService.stopWatching();
    this.planService.stopWatching();
    this.streakService.stopWatching();
    this.user.stopWatching();
    this.presence.stopWatching();
    this.notificationService.stopWatching();
  }

  private async generateSession(pairId: string, plan: import('../../core/models').PlanDoc, userProfile: UserDoc): Promise<void> {
    this.sessionGenerating.set(true);
    try {
      // For MVP, use profile as both users if partner profile not available
      const partnerProfile = await this.fs.get<UserDoc>(`users/${this.pair.partnerUid()}`);
      const userB = partnerProfile ?? { ...userProfile, id: this.pair.partnerUid() ?? 'partner' };

      // Use seed data as exercise library (in production, these would come from Firestore)
      const exercises = SEED_EXERCISES.map((e, i) => ({ ...e, id: `ex-${i}` })) as ExerciseDoc[];
      const variants = SEED_VARIANTS.map((v, i) => ({
        id: `var-${i}`,
        exerciseId: exercises.find(e => e.slug === v.exerciseSlug)?.id ?? '',
        variantName: v.variantName,
        difficultyTier: v.difficultyTier,
        repDefault: v.repDefault,
        timeDefaultSeconds: v.timeDefaultSeconds,
        loadType: v.loadType,
        notes: v.notes,
      })) as ExerciseVariantDoc[];

      await this.sessionService.generateTodaySession(
        pairId, plan, { ...userProfile, id: this.auth.uid()! }, userB as UserDoc, exercises, variants
      );
    } catch (err) {
      console.warn('Session generation skipped:', err);
    } finally {
      this.sessionGenerating.set(false);
    }
  }

  getWorkoutTitle(): string {
    const session = this.todaySession();
    if (!session) return '';
    const mode = session.mode === 'together' ? 'Together' : 'Separate';
    return `${mode} Workout`;
  }

  getEstimatedDuration(): number {
    const session = this.todaySession();
    const uid = this.auth.uid();
    if (!session || !uid) return 30;
    return session.users[uid]?.assignedWorkoutPayload?.totalDurationMinutes ?? 30;
  }

  openWorkout(): void {
    const session = this.todaySession();
    if (!session) return;
    this.audio.play('tap-primary');
    this.router.navigate(['/workout', session.id]);
  }

  goToPartner(): void {
    this.audio.play('tap-primary');
    this.router.navigate(['/partner']);
  }

  goToPlan(): void {
    this.audio.play('tap-primary');
    this.router.navigate(['/plan']);
  }

  goToSettings(): void {
    this.audio.play('tap-secondary');
    this.router.navigate(['/settings']);
  }
}
