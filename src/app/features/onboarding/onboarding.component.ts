import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { PairService } from '../../core/services/pair.service';
import { AudioService } from '../../core/services/audio.service';
import { ExperienceLevel, PrimaryGoal } from '../../core/models';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="onboarding-screen screen-enter">
      <!-- Step 1: Quick Profile -->
      @if (step() === 1) {
        <div class="step screen-enter">
          @if (pendingInvite()) {
            <div class="invite-banner">
              <span class="invite-icon">🤝</span>
              <p>You've been invited to be a fitness partner!</p>
              <p class="invite-detail">Set up your profile and you'll be linked automatically.</p>
            </div>
          } @else {
            <h2>Welcome! Let's get you set up.</h2>
            <p class="subtitle">This takes about 30 seconds.</p>
          }

          <div class="form-group">
            <label>Display Name</label>
            <input type="text" [(ngModel)]="displayName" placeholder="Your name" class="input" />
          </div>

          <label class="section-label">Experience Level</label>
          <div class="option-grid">
            @for (level of experienceLevels; track level.value) {
              <button
                class="option-card"
                [class.selected]="selectedLevel() === level.value"
                (click)="selectLevel(level.value)"
              >
                <span class="option-emoji">{{ level.emoji }}</span>
                <span class="option-label">{{ level.label }}</span>
              </button>
            }
          </div>

          <label class="section-label">Primary Goal</label>
          <div class="option-grid">
            @for (goal of goals; track goal.value) {
              <button
                class="option-card"
                [class.selected]="selectedGoal() === goal.value"
                (click)="selectGoal(goal.value)"
              >
                <span class="option-label">{{ goal.label }}</span>
              </button>
            }
          </div>

          <button
            class="btn-primary"
            (click)="goToStep2()"
            [disabled]="!canProceedStep1()"
          >
            Next
          </button>
        </div>
      }

      <!-- Step 2a: Invited partner — accept & go -->
      @if (step() === 2 && pendingInvite()) {
        <div class="step screen-enter">
          <div class="success-hero">
            <span class="success-icon">🎉</span>
            <h2>You're all set!</h2>
            <p class="subtitle">Linking you with your partner now...</p>
          </div>

          <div class="checklist">
            <div class="check-item" [class.done]="profileCreated()">
              <span class="check-mark">{{ profileCreated() ? '✓' : '·' }}</span>
              <span>Profile created</span>
            </div>
            <div class="check-item" [class.done]="inviteAccepted()">
              <span class="check-mark">{{ inviteAccepted() ? '✓' : '·' }}</span>
              <span>Partner linked</span>
            </div>
          </div>

          @if (error()) {
            <p class="error-msg">{{ error() }}</p>
            <button class="btn-primary" (click)="retryAcceptInvite()">Try Again</button>
          }
        </div>
      }

      <!-- Step 2b: Regular user — invite a partner -->
      @if (step() === 2 && !pendingInvite()) {
        <div class="step screen-enter">
          <h2>Link your partner</h2>
          <p class="subtitle">Invite someone to train with you. You can skip this for now.</p>

          <div class="form-group">
            <label>Partner's email</label>
            <input
              type="email"
              [(ngModel)]="partnerEmail"
              placeholder="partner@email.com"
              class="input"
            />
          </div>

          <button class="btn-primary" (click)="finishWithPartner()" [disabled]="!partnerEmail || loading()">
            {{ loading() ? 'Setting up...' : 'Invite & Get Started' }}
          </button>

          <button class="btn-skip" (click)="finishWithoutPartner()" [disabled]="loading()">
            Skip for now — I'll set this up later
          </button>

          @if (error()) {
            <p class="error-msg">{{ error() }}</p>
          }
        </div>
      }

      <!-- Step 3: Invite sent confirmation (inviter only) -->
      @if (step() === 3) {
        <div class="step screen-enter">
          <div class="success-hero">
            <span class="success-icon">📨</span>
            <h2>Invite sent!</h2>
            <p class="subtitle">Here's what to tell your partner:</p>
          </div>

          <div class="share-card">
            <p class="share-instructions">
              "Hey! I just set us up on <strong>Linked Fitness Partners</strong>.
              Sign up with <strong>{{ partnerEmail }}</strong> and we'll be linked automatically."
            </p>
            <button class="btn-copy" (click)="copyInstructions()">
              {{ copied() ? 'Copied!' : 'Copy message' }}
            </button>
          </div>

          <div class="how-it-works">
            <p class="section-label">How it works for them:</p>
            <div class="hw-step">
              <span class="hw-num">1</span>
              <span>They sign up with {{ partnerEmail }}</span>
            </div>
            <div class="hw-step">
              <span class="hw-num">2</span>
              <span>They'll see they've been invited during setup</span>
            </div>
            <div class="hw-step">
              <span class="hw-num">3</span>
              <span>You'll be linked automatically — no codes needed</span>
            </div>
          </div>

          <button class="btn-primary" (click)="goToApp()">
            Got it — let's go
          </button>

          <p class="invite-note">Invite expires in 7 days. You can resend from Settings anytime.</p>
        </div>
      }

      <!-- Step indicator -->
      <div class="step-dots">
        @for (dot of totalSteps(); track dot) {
          <span class="dot" [class.active]="step() === dot"></span>
        }
      </div>
    </div>
  `,
  styles: [`
    .onboarding-screen {
      min-height: 100vh;
      padding: 24px;
      max-width: 420px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .step { display: flex; flex-direction: column; gap: 16px; }
    h2 { font-size: 24px; font-weight: 700; color: #f5f5f5; margin: 0; }
    .subtitle { color: #888; font-size: 15px; margin: 0; }
    .section-label { color: #ccc; font-size: 14px; font-weight: 600; margin-top: 8px; }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      label { color: #ccc; font-size: 14px; font-weight: 500; }
    }
    .input {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 10px;
      padding: 14px 16px;
      color: #f5f5f5;
      font-size: 16px;
      outline: none;
      &:focus { border-color: #4ade80; }
    }
    .option-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .option-card {
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 12px;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: border-color 150ms, background 150ms;
      min-height: 48px;
      &.selected {
        border-color: #4ade80;
        background: #0a2a15;
      }
    }
    .option-emoji { font-size: 24px; }
    .option-label { font-size: 14px; color: #ccc; font-weight: 500; text-align: center; }
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
      margin-top: 8px;
      &:disabled { opacity: 0.4; }
    }
    .btn-skip {
      background: none;
      border: 1px solid #333;
      border-radius: 12px;
      color: #888;
      padding: 14px;
      font-size: 15px;
      cursor: pointer;
      min-height: 48px;
    }
    .step-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 32px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #333;
      transition: background 200ms;
      &.active { background: #4ade80; }
    }
    .error-msg { color: #ef4444; text-align: center; font-size: 14px; }

    /* Invite banner for invited partners */
    .invite-banner {
      background: linear-gradient(135deg, #0a2a15, #1a1a2e);
      border: 1px solid #4ade80;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin-bottom: 8px;
      .invite-icon { font-size: 36px; display: block; margin-bottom: 8px; }
      p { color: #f5f5f5; font-size: 17px; font-weight: 600; margin: 0; }
      .invite-detail { color: #888; font-size: 14px; font-weight: 400; margin-top: 6px; }
    }

    /* Success hero */
    .success-hero {
      text-align: center;
      padding: 16px 0;
      .success-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    }

    /* Checklist for invite acceptance progress */
    .checklist {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #1a1a1a;
      border-radius: 12px;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #666;
      font-size: 15px;
      transition: color 300ms;
      &.done { color: #4ade80; }
    }
    .check-mark {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #2a2a2a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .check-item.done .check-mark {
      background: #0a2a15;
    }

    /* Share card for inviter */
    .share-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 14px;
      padding: 20px;
    }
    .share-instructions {
      color: #ccc;
      font-size: 15px;
      line-height: 1.5;
      margin: 0 0 14px 0;
      strong { color: #f5f5f5; }
    }
    .btn-copy {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 10px;
      color: #f5f5f5;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      transition: background 150ms;
      &:hover { background: #333; }
    }

    /* How it works steps */
    .how-it-works {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .hw-step {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #ccc;
      font-size: 14px;
    }
    .hw-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #2a2a2a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #4ade80;
      flex-shrink: 0;
    }
    .invite-note {
      color: #666;
      font-size: 13px;
      text-align: center;
      margin: 0;
    }
  `],
})
export class OnboardingComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private pairService = inject(PairService);
  private audio = inject(AudioService);

  step = signal(1);
  displayName = '';
  selectedLevel = signal<ExperienceLevel | null>(null);
  selectedGoal = signal<PrimaryGoal | null>(null);
  partnerEmail = '';
  loading = signal(false);
  error = signal('');
  copied = signal(false);

  // Invite detection
  pendingInvite = signal<{ pairId: string; inviteId: string } | null>(null);
  profileCreated = signal(false);
  inviteAccepted = signal(false);

  totalSteps = signal([1, 2]);

  experienceLevels = [
    { value: 'beginner' as ExperienceLevel, label: 'Beginner', emoji: '🌱' },
    { value: 'novice' as ExperienceLevel, label: 'Novice', emoji: '🌿' },
    { value: 'intermediate' as ExperienceLevel, label: 'Intermediate', emoji: '💪' },
    { value: 'advanced' as ExperienceLevel, label: 'Advanced', emoji: '🔥' },
  ];

  goals = [
    { value: 'get_back_in_shape' as PrimaryGoal, label: 'Get Back in Shape' },
    { value: 'consistency' as PrimaryGoal, label: 'Stay Consistent' },
    { value: 'strength' as PrimaryGoal, label: 'Build Strength' },
    { value: 'general_fitness' as PrimaryGoal, label: 'General Fitness' },
  ];

  async ngOnInit(): Promise<void> {
    // Check if this user was invited by someone
    const email = this.auth.currentUser()?.email;
    if (email) {
      try {
        const invite = await this.pairService.getPendingInviteForEmail(email);
        if (invite) {
          this.pendingInvite.set(invite);
        }
      } catch {
        // Silently continue — they can still onboard normally
      }
    }
  }

  canProceedStep1(): boolean {
    return !!this.displayName.trim() && !!this.selectedLevel() && !!this.selectedGoal();
  }

  selectLevel(level: ExperienceLevel): void {
    this.selectedLevel.set(level);
    this.audio.play('tap-secondary');
  }

  selectGoal(goal: PrimaryGoal): void {
    this.selectedGoal.set(goal);
    this.audio.play('tap-secondary');
  }

  async goToStep2(): Promise<void> {
    this.audio.play('tap-primary');
    try {
      await this.userService.createProfile({
        displayName: this.displayName.trim(),
        experienceLevel: this.selectedLevel()!,
        primaryGoal: this.selectedGoal()!,
      });
      this.profileCreated.set(true);
      this.step.set(2);

      // If invited, auto-accept the invite
      if (this.pendingInvite()) {
        await this.acceptPendingInvite();
      }
    } catch (err: unknown) {
      this.audio.play('error');
      this.error.set(err instanceof Error ? err.message : 'Failed to save profile');
    }
  }

  private async acceptPendingInvite(): Promise<void> {
    const invite = this.pendingInvite()!;
    try {
      await this.pairService.acceptInvite(invite.pairId, invite.inviteId);
      this.inviteAccepted.set(true);
      this.audio.play('tap-primary');
      // Brief pause to show the success state, then navigate
      setTimeout(() => this.router.navigate(['/today']), 1500);
    } catch (err: unknown) {
      this.audio.play('error');
      this.error.set(err instanceof Error ? err.message : 'Failed to link with partner');
    }
  }

  async retryAcceptInvite(): Promise<void> {
    this.error.set('');
    await this.acceptPendingInvite();
  }

  async finishWithPartner(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.pairService.createPairAndInvite(this.partnerEmail);
      this.audio.play('tap-primary');
      this.totalSteps.set([1, 2, 3]);
      this.step.set(3);
    } catch (err: unknown) {
      this.audio.play('error');
      this.error.set(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      this.loading.set(false);
    }
  }

  async finishWithoutPartner(): Promise<void> {
    this.audio.play('tap-secondary');
    this.router.navigate(['/today']);
  }

  async copyInstructions(): Promise<void> {
    const msg = `Hey! I just set us up on Linked Fitness Partners. Sign up with ${this.partnerEmail} and we'll be linked automatically. Download it here: ${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(msg);
      this.copied.set(true);
      this.audio.play('tap-primary');
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Fallback: select text for manual copy
      this.copied.set(false);
    }
  }

  goToApp(): void {
    this.audio.play('tap-primary');
    this.router.navigate(['/today']);
  }
}
