import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../../core/services/auth.service';
import { FirestoreService } from '../../core/services/firestore.service';
import { PairService } from '../../core/services/pair.service';
import { PresenceService } from '../../core/services/presence.service';
import { AudioService } from '../../core/services/audio.service';
import { StreakService } from '../../core/services/streak.service';
import { SessionDoc, SessionExercise, CompletionState } from '../../core/models';
import { UserService } from '../../core/services/user.service';
import { SwipeCompleteDirective } from '../../shared/directives/swipe-complete.directive';

type WorkoutScreen = 'overview' | 'ready' | 'countdown' | 'active' | 'complete' | 'awaiting';

@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [SwipeCompleteDirective],
  template: `
    <!-- OVERVIEW -->
    @if (screen() === 'overview') {
      <div class="ws screen-enter">
        <button class="back-btn" (click)="goBack()">&#8592;</button>

        <div class="mode-badge-lg" [class]="session()?.mode ?? ''">
          {{ session()?.mode === 'together' ? 'Together' : 'Separate' }} Workout
        </div>

        <!-- Tab switcher for together mode -->
        @if (session()?.mode === 'together') {
          <div class="tab-row">
            <button class="tab" [class.active]="activeTab() === 'mine'" (click)="activeTab.set('mine')">My Track</button>
            <button class="tab" [class.active]="activeTab() === 'partner'" (click)="activeTab.set('partner')">Partner's Track</button>
          </div>
        }

        <!-- Exercise List -->
        <div class="exercise-list">
          @for (ex of displayExercises(); track ex.exerciseId; let i = $index) {
            <div class="exercise-card">
              <div class="ex-number">{{ i + 1 }}</div>
              <div class="ex-info">
                <div class="ex-name">{{ ex.variantName || ex.name }}</div>
                <div class="ex-detail">
                  @if (ex.reps) { <span>{{ ex.sets || 3 }} × {{ ex.reps }} reps</span> }
                  @else if (ex.durationSeconds) { <span>{{ ex.durationSeconds }}s</span> }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Work/Rest info -->
        @if (myPayload()?.workRestScheme; as scheme) {
          <div class="scheme-info">
            {{ scheme.workSeconds }}s work / {{ scheme.restSeconds }}s rest × {{ scheme.rounds }} rounds
          </div>
        }

        <!-- Duration -->
        <div class="duration-info">~{{ myPayload()?.totalDurationMinutes ?? 30 }} minutes</div>

        <!-- Partner status -->
        <div class="partner-row">
          <div class="partner-avatar" [class.live]="presence.partnerOnline()">
            {{ partnerInitial() }}
          </div>
          <span class="partner-label">
            {{ presence.partnerOnline() ? 'Partner is here' : 'Partner offline' }}
          </span>
        </div>

        <!-- Start button -->
        @if (!myCompleted()) {
          @if (session()?.mode === 'together') {
            <button class="btn-primary" (click)="tapReady()">I'm Ready</button>
          } @else {
            <button class="btn-primary" (click)="startWorkout()">Start Workout</button>
          }
        } @else {
          <button class="btn-primary" style="background: #333; color: #888;" disabled>Completed</button>
        }
      </div>
    }

    <!-- READY (Together mode waiting) -->
    @if (screen() === 'ready') {
      <div class="ws center-screen screen-enter">
        <div class="ready-pulse"></div>
        <p class="ready-text">Waiting for partner...</p>
        <p class="ready-sub">Both tap "I'm Ready" to start the countdown</p>
        <button class="btn-secondary" (click)="cancelReady()">Cancel</button>
      </div>
    }

    <!-- COUNTDOWN (3-2-1-Go) -->
    @if (screen() === 'countdown') {
      <div class="ws center-screen">
        <div class="countdown-number">{{ countdownValue() === 0 ? 'GO!' : countdownValue() }}</div>
      </div>
    }

    <!-- ACTIVE WORKOUT -->
    @if (screen() === 'active') {
      <div class="ws screen-enter">
        <!-- Timer bar -->
        @if (timerActive()) {
          <div class="timer-bar">
            <div class="timer-phase" [class.work]="timerPhase() === 'work'" [class.rest]="timerPhase() === 'rest'">
              {{ timerPhase() === 'work' ? 'WORK' : 'REST' }}
            </div>
            <div class="timer-display">{{ timerDisplay() }}</div>
            <div class="timer-round">Round {{ currentRound() }} / {{ totalRounds() }}</div>
          </div>
        }

        <!-- Exercise checklist -->
        <div class="exercise-list active-list">
          @for (ex of activeExercises(); track ex.exerciseId; let i = $index) {
            <div
              class="exercise-card"
              [class.done]="ex.completed"
              appSwipeComplete
              (swipeComplete)="completeExercise(i)"
            >
              <div class="ex-check">
                @if (ex.completed) { <span class="check-mark">✓</span> }
                @else { <span class="check-empty">{{ i + 1 }}</span> }
              </div>
              <div class="ex-info">
                <div class="ex-name" [class.done-text]="ex.completed">{{ ex.variantName || ex.name }}</div>
                <div class="ex-detail">
                  @if (ex.reps) { <span>{{ ex.sets || 3 }} × {{ ex.reps }}</span> }
                  @else if (ex.durationSeconds) { <span>{{ ex.durationSeconds }}s</span> }
                </div>
              </div>
              @if (!ex.completed) {
                <button class="check-btn" (click)="completeExercise(i)">Done</button>
              }
            </div>
          }
        </div>

        <!-- Finish button -->
        <button
          class="btn-primary finish-btn"
          [disabled]="!allExercisesDone()"
          (click)="finishWorkout()"
        >
          {{ allExercisesDone() ? 'Finish Workout' : completionLabel() }}
        </button>
      </div>
    }

    <!-- COMPLETE -->
    @if (screen() === 'complete') {
      <div class="ws center-screen screen-enter">
        <div class="complete-icon">✓</div>
        <h2 class="complete-title">Workout Complete!</h2>

        <!-- Effort rating -->
        <div class="rating-section">
          <p class="rating-label">How hard was that?</p>
          <div class="rating-row">
            @for (n of [1,2,3,4,5,6,7,8,9,10]; track n) {
              <button
                class="rating-btn"
                [class.selected]="effortRating() === n"
                (click)="setEffort(n)"
              >{{ n }}</button>
            }
          </div>
        </div>

        <button class="btn-primary" (click)="submitCompletion()">
          {{ submitting() ? 'Saving...' : 'Sign Off' }}
        </button>
      </div>
    }

    <!-- AWAITING PARTNER -->
    @if (screen() === 'awaiting') {
      <div class="ws center-screen screen-enter">
        <div class="partner-avatar large" [class.live]="presence.partnerOnline()">P</div>
        <h2 class="awaiting-title">You're done!</h2>
        <p class="awaiting-sub">Waiting for partner to complete...</p>

        @if (graceWindowLabel()) {
          <p class="grace-label">{{ graceWindowLabel() }}</p>
        }

        <p class="streak-safe">Your personal streak is safe. Shared streak needs both of you.</p>

        <button
          class="btn-nudge"
          [disabled]="nudgeSent()"
          (click)="nudgePartner()"
        >
          {{ nudgeSent() ? 'Nudge sent' : 'Nudge partner' }}
        </button>

        <button class="btn-secondary" (click)="goBack()">Back to Today</button>
      </div>
    }
  `,
  styles: [`
    .ws { padding: 20px 16px 100px; }
    .center-screen {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 16px;
    }
    .back-btn {
      background: none; border: none; color: #888; font-size: 24px;
      cursor: pointer; padding: 8px; min-width: 48px; min-height: 48px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
    }
    .mode-badge-lg {
      font-size: 20px; font-weight: 700; margin-bottom: 16px;
      &.together { color: #4ade80; }
      &.separate { color: #818cf8; }
    }
    .tab-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .tab {
      flex: 1; background: #1a1a1a; border: 1px solid #333; border-radius: 10px;
      padding: 10px; color: #888; font-size: 14px; font-weight: 600; cursor: pointer;
      min-height: 48px;
      &.active { border-color: #4ade80; color: #4ade80; background: #0a2a15; }
    }
    .exercise-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .exercise-card {
      background: #1a1a1a; border-radius: 12px; padding: 14px 16px;
      display: flex; align-items: center; gap: 12px;
      &.done { opacity: 0.5; }
    }
    .ex-number, .ex-check {
      width: 32px; height: 32px; border-radius: 50%; background: #333;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600; color: #888; flex-shrink: 0;
    }
    .check-mark { color: #4ade80; font-size: 16px; }
    .check-empty { color: #888; }
    .ex-info { flex: 1; }
    .ex-name { color: #f5f5f5; font-size: 15px; font-weight: 600; &.done-text { text-decoration: line-through; color: #666; } }
    .ex-detail { color: #888; font-size: 13px; margin-top: 2px; }
    .check-btn {
      background: #333; border: none; border-radius: 8px; color: #4ade80;
      font-size: 13px; font-weight: 600; padding: 8px 14px; cursor: pointer;
      min-height: 36px; min-width: 48px;
    }
    .scheme-info {
      background: #1a1a1a; border-radius: 10px; padding: 12px 16px;
      color: #888; font-size: 14px; text-align: center; margin-bottom: 12px;
    }
    .duration-info { color: #666; font-size: 13px; text-align: center; margin-bottom: 16px; }
    .partner-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
      justify-content: center;
    }
    .partner-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: #333;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600; color: #888;
      &.large { width: 72px; height: 72px; font-size: 28px; }
    }
    .partner-label { color: #888; font-size: 14px; }

    .btn-primary {
      width: 100%; background: #4ade80; color: #0f0f0f; border: none; border-radius: 14px;
      padding: 16px; font-size: 17px; font-weight: 700; cursor: pointer; min-height: 56px;
      &:disabled { opacity: 0.4; }
    }
    .btn-secondary {
      background: #1a1a1a; border: 1px solid #333; border-radius: 12px;
      color: #888; padding: 14px 24px; font-size: 15px; cursor: pointer; min-height: 48px;
    }
    .btn-nudge {
      background: #1a1a2a; border: 1px solid #818cf8; border-radius: 12px;
      color: #818cf8; padding: 14px 24px; font-size: 15px; font-weight: 600;
      cursor: pointer; min-height: 48px;
      &:disabled { opacity: 0.4; border-color: #444; color: #666; }
    }
    .finish-btn { margin-top: auto; }

    /* Ready screen */
    .ready-pulse {
      width: 100px; height: 100px; border-radius: 50%;
      background: rgba(74, 222, 128, 0.2);
      animation: heartbeat 2s ease-in-out infinite;
    }
    .ready-text { font-size: 20px; font-weight: 600; color: #f5f5f5; margin: 0; }
    .ready-sub { color: #888; font-size: 14px; margin: 0; }

    /* Countdown */
    .countdown-number {
      font-size: 96px; font-weight: 800; color: #4ade80;
      animation: countdownPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes countdownPop {
      0% { transform: scale(0.5); opacity: 0; }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Timer */
    .timer-bar {
      background: #1a1a1a; border-radius: 14px; padding: 16px;
      text-align: center; margin-bottom: 16px;
    }
    .timer-phase {
      font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: 4px;
      &.work { color: #4ade80; }
      &.rest { color: #818cf8; }
    }
    .timer-display { font-size: 48px; font-weight: 800; color: #f5f5f5; font-variant-numeric: tabular-nums; }
    .timer-round { color: #888; font-size: 13px; margin-top: 4px; }

    /* Active list */
    .active-list { margin-bottom: 24px; }

    /* Complete */
    .complete-icon {
      width: 80px; height: 80px; border-radius: 50%; background: #0a2a15; color: #4ade80;
      font-size: 36px; display: flex; align-items: center; justify-content: center;
      animation: slideUp 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .complete-title { font-size: 24px; font-weight: 700; color: #f5f5f5; margin: 0; }
    .rating-section { width: 100%; max-width: 340px; }
    .rating-label { color: #888; font-size: 14px; margin: 0 0 8px; }
    .rating-row { display: flex; gap: 3px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap; }
    .rating-btn {
      width: 36px; height: 36px; border-radius: 8px; border: 1px solid #333;
      background: #1a1a1a; color: #888; font-size: 13px; font-weight: 600;
      cursor: pointer; min-height: 36px; min-width: 36px; padding: 0;
      &.selected { background: #4ade80; color: #0f0f0f; border-color: #4ade80; }
      &:active { transform: scale(0.95); }
    }

    /* Awaiting */
    .awaiting-title { font-size: 22px; font-weight: 700; color: #f5f5f5; margin: 0; }
    .awaiting-sub { color: #888; font-size: 15px; margin: 0; }
    .grace-label { color: #f59e0b; font-size: 14px; font-weight: 500; margin: 0; }
    .streak-safe { color: #4ade80; font-size: 13px; max-width: 280px; margin: 0; }

    @keyframes heartbeat {
      0%   { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.6); }
      50%  { box-shadow: 0 0 0 20px rgba(74, 222, 128, 0); }
      100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }
    @keyframes slideUp {
      from { transform: translateY(40px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `],
})
export class WorkoutComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private fs = inject(FirestoreService);
  private pairService = inject(PairService);
  readonly presence = inject(PresenceService);
  private audio = inject(AudioService);
  private streakService = inject(StreakService);
  private userService = inject(UserService);

  readonly partnerInitial = signal('P');

  // State
  screen = signal<WorkoutScreen>('overview');
  session = signal<SessionDoc | null>(null);
  activeTab = signal<'mine' | 'partner'>('mine');
  activeExercises = signal<SessionExercise[]>([]);
  effortRating = signal<number | null>(null);
  submitting = signal(false);
  nudgeSent = signal(false);

  // Timer state
  timerActive = signal(false);
  timerPhase = signal<'work' | 'rest'>('work');
  timerSeconds = signal(0);
  currentRound = signal(1);
  totalRounds = signal(3);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Countdown state
  countdownValue = signal(3);
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Realtime
  private unsubSession: (() => void) | null = null;
  private unsubPartnerReady: (() => void) | null = null;

  readonly myPayload = computed(() => {
    const s = this.session();
    const uid = this.authService.uid();
    if (!s || !uid) return null;
    return s.users[uid]?.assignedWorkoutPayload ?? null;
  });

  readonly displayExercises = computed(() => {
    const s = this.session();
    const uid = this.authService.uid();
    if (!s || !uid) return [];
    const tab = this.activeTab();
    if (tab === 'mine') {
      return s.users[uid]?.assignedWorkoutPayload?.exercises ?? [];
    }
    const partnerId = Object.keys(s.users).find(id => id !== uid);
    return partnerId ? s.users[partnerId]?.assignedWorkoutPayload?.exercises ?? [] : [];
  });

  readonly myCompleted = computed(() => {
    const s = this.session();
    const uid = this.authService.uid();
    if (!s || !uid) return false;
    return s.users[uid]?.completionState === 'completed';
  });

  readonly partnerCompleted = computed(() => {
    const s = this.session();
    const uid = this.authService.uid();
    if (!s || !uid) return false;
    const partnerId = Object.keys(s.users).find(id => id !== uid);
    return partnerId ? s.users[partnerId]?.completionState === 'completed' : false;
  });

  readonly allExercisesDone = computed(() => {
    return this.activeExercises().length > 0 && this.activeExercises().every(e => e.completed);
  });

  readonly completionLabel = computed(() => {
    const exercises = this.activeExercises();
    const done = exercises.filter(e => e.completed).length;
    return `${done} / ${exercises.length} exercises done`;
  });

  readonly timerDisplay = computed(() => {
    const s = this.timerSeconds();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  });

  ngOnInit(): void {
    const sessionId = this.route.snapshot.params['sessionId'];
    const pairId = this.pairService.activePair()?.id;
    if (!pairId || !sessionId) return;

    // Watch session for real-time partner updates
    this.unsubSession = this.fs.onSnapshot<SessionDoc>(
      `pairs/${pairId}/sessions/${sessionId}`,
      (data) => {
        if (data) {
          this.session.set(data);
          // Check if partner just completed while we're on awaiting screen
          if (this.screen() === 'awaiting' && this.partnerCompleted()) {
            this.onSharedComplete();
          }
        }
      }
    );

    // Start presence & load partner profile
    this.presence.goOnline(pairId);
    const partnerUid = this.pairService.partnerUid();
    if (partnerUid) {
      this.presence.watchPartner(pairId, partnerUid);
      this.userService.getProfile(partnerUid).then(profile => {
        if (profile) {
          this.partnerInitial.set(profile.displayName.charAt(0).toUpperCase());
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.unsubSession?.();
    this.unsubPartnerReady?.();
    this.stopTimer();
    this.stopCountdown();
    this.presence.stopWatching();
  }

  goBack(): void {
    this.audio.play('tap-secondary');
    this.router.navigate(['/today']);
  }

  // ===== Together Mode: Ready + Countdown =====

  async tapReady(): Promise<void> {
    this.audio.play('tap-primary');
    this.screen.set('ready');

    const pairId = this.pairService.activePair()?.id;
    const partnerUid = this.pairService.partnerUid();
    if (!pairId || !partnerUid) return;

    await this.presence.setReady(pairId, true);

    // Watch partner ready state
    this.unsubPartnerReady = this.presence.watchPartnerReady(pairId, partnerUid, (ready) => {
      if (ready && this.screen() === 'ready') {
        this.startCountdown();
      }
    });
  }

  cancelReady(): void {
    this.audio.play('tap-secondary');
    this.screen.set('overview');
    const pairId = this.pairService.activePair()?.id;
    if (pairId) this.presence.setReady(pairId, false);
    this.unsubPartnerReady?.();
  }

  private startCountdown(): void {
    this.screen.set('countdown');
    this.countdownValue.set(3);
    this.audio.play('countdown-tick');

    this.countdownInterval = setInterval(() => {
      const val = this.countdownValue() - 1;
      this.countdownValue.set(val);
      if (val > 0) {
        this.audio.play('countdown-tick');
      } else {
        this.audio.play('countdown-go');
        this.stopCountdown();
        this.startWorkout();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // ===== Active Workout =====

  startWorkout(): void {
    this.screen.set('active');

    // Clone exercises into mutable state
    const exercises = (this.myPayload()?.exercises ?? []).map(e => ({ ...e, completed: false }));
    this.activeExercises.set(exercises);

    // Start timer if work/rest scheme exists
    const scheme = this.myPayload()?.workRestScheme;
    if (scheme) {
      this.startTimer(scheme.workSeconds, scheme.restSeconds, scheme.rounds);
    }

    // Mark session as started
    const pairId = this.pairService.activePair()?.id;
    const sessionId = this.session()?.id;
    const uid = this.authService.uid();
    if (pairId && sessionId && uid) {
      this.fs.update(`pairs/${pairId}/sessions/${sessionId}`, {
        status: 'in_progress',
        [`users.${uid}.startedAt`]: Timestamp.now(),
      });
    }

    this.audio.play('timer-work');
  }

  completeExercise(index: number): void {
    const exercises = [...this.activeExercises()];
    if (exercises[index] && !exercises[index].completed) {
      exercises[index] = { ...exercises[index], completed: true };
      this.activeExercises.set(exercises);
      this.audio.play('exercise-complete');
    }
  }

  finishWorkout(): void {
    this.stopTimer();
    this.audio.play('workout-complete');
    this.screen.set('complete');
  }

  setEffort(n: number): void {
    this.effortRating.set(n);
    this.audio.play('tap-secondary');
  }

  async submitCompletion(): Promise<void> {
    this.submitting.set(true);
    this.audio.play('tap-primary');

    const pairId = this.pairService.activePair()?.id;
    const sessionId = this.session()?.id;
    const uid = this.authService.uid();
    if (!pairId || !sessionId || !uid) return;

    try {
      const now = Timestamp.now();

      // Optimistic: update local session
      const updatedSession = { ...this.session()! };
      updatedSession.users = { ...updatedSession.users };
      updatedSession.users[uid] = {
        ...updatedSession.users[uid],
        completionState: 'completed' as CompletionState,
        completedAt: now,
        effortRating: this.effortRating() ?? undefined,
      };

      // Check if partner is also done
      const partnerDone = this.partnerCompleted();

      if (partnerDone) {
        updatedSession.status = 'shared_complete';
      } else {
        updatedSession.status = 'awaiting_partner_confirmation';
        // Set grace window: 6 AM next day
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(6, 0, 0, 0);
        updatedSession.graceWindowExpiresAt = Timestamp.fromDate(tomorrow);
      }

      this.session.set(updatedSession);

      // Write to Firestore
      const updates: Record<string, unknown> = {
        status: updatedSession.status,
        [`users.${uid}.completionState`]: 'completed',
        [`users.${uid}.completedAt`]: now,
      };
      if (this.effortRating()) {
        updates[`users.${uid}.effortRating`] = this.effortRating();
      }
      if (!partnerDone) {
        updates['graceWindowExpiresAt'] = updatedSession.graceWindowExpiresAt;
      }

      await this.fs.update(`pairs/${pairId}/sessions/${sessionId}`, updates);

      if (partnerDone) {
        await this.onSharedComplete();
      } else {
        this.screen.set('awaiting');
      }
    } catch (err) {
      console.error('Failed to submit completion', err);
      this.audio.play('error');
    } finally {
      this.submitting.set(false);
    }
  }

  async nudgePartner(): Promise<void> {
    this.nudgeSent.set(true);
    this.audio.play('nudge-sent');
    // In MVP: just mark it. Full implementation would call a Cloud Function.
  }

  graceWindowLabel(): string {
    const session = this.session();
    if (!session?.graceWindowExpiresAt) return '';
    const expires = session.graceWindowExpiresAt.toDate();
    const diff = expires.getTime() - Date.now();
    if (diff <= 0) return 'Grace window expired';
    const hours = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return `Partner has ${hours}h ${mins}m`;
  }

  // ===== Timer =====

  private startTimer(workSec: number, restSec: number, rounds: number): void {
    this.timerActive.set(true);
    this.timerPhase.set('work');
    this.timerSeconds.set(workSec);
    this.currentRound.set(1);
    this.totalRounds.set(rounds);

    this.timerInterval = setInterval(() => {
      const remaining = this.timerSeconds() - 1;

      if (remaining === 3 && this.timerPhase() === 'work') {
        this.audio.play('timer-warning');
      }

      if (remaining <= 0) {
        if (this.timerPhase() === 'work') {
          // Switch to rest
          this.timerPhase.set('rest');
          this.timerSeconds.set(restSec);
          this.audio.play('timer-rest');
        } else {
          // End of rest — next round or done
          const nextRound = this.currentRound() + 1;
          if (nextRound > rounds) {
            this.stopTimer();
            return;
          }
          this.currentRound.set(nextRound);
          this.timerPhase.set('work');
          this.timerSeconds.set(workSec);
          this.audio.play('timer-work');
        }
      } else {
        this.timerSeconds.set(remaining);
      }
    }, 1000);
  }

  private stopTimer(): void {
    this.timerActive.set(false);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ===== Shared Complete =====

  private async onSharedComplete(): Promise<void> {
    this.audio.play('shared-complete');
    this.audio.play('streak-advance');

    const pairId = this.pairService.activePair()?.id;
    if (pairId) {
      await this.streakService.advanceStreaksOnSharedComplete(pairId);
    }

    // Brief celebration then go back
    setTimeout(() => {
      this.router.navigate(['/today']);
    }, 2500);
  }
}
