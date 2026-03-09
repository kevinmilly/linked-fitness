import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { AudioService } from '../../core/services/audio.service';
import { FirestoreService } from '../../core/services/firestore.service';
import { UserDoc } from '../../core/models';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth-screen screen-enter">
      <div class="auth-header">
        <h1>Linked Fitness<br>Partners</h1>
        <p class="tagline">Train together when you can.<br>Stay accountable when you can't.</p>
      </div>

      <div class="auth-form">
        @if (mode() === 'signin') {
          <div class="form-group">
            <input
              type="email"
              [(ngModel)]="email"
              placeholder="Email"
              class="input"
              autocomplete="email"
              aria-label="Email address"
            />
          </div>
          <div class="form-group">
            <input
              type="password"
              [(ngModel)]="password"
              placeholder="Password"
              class="input"
              autocomplete="current-password"
              aria-label="Password"
            />
          </div>
          <button class="btn-primary" (click)="signIn()" [disabled]="loading()">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>
          <button class="btn-google" (click)="signInWithGoogle()" [disabled]="loading()">
            Continue with Google
          </button>
          <p class="switch-mode">
            No account?
            <button class="link-btn" (click)="mode.set('signup')">Sign up</button>
          </p>
        } @else {
          <div class="form-group">
            <input
              type="text"
              [(ngModel)]="displayName"
              placeholder="Display name"
              class="input"
              autocomplete="name"
              aria-label="Display name"
            />
          </div>
          <div class="form-group">
            <input
              type="email"
              [(ngModel)]="email"
              placeholder="Email"
              class="input"
              autocomplete="email"
              aria-label="Email address"
            />
          </div>
          <div class="form-group">
            <input
              type="password"
              [(ngModel)]="password"
              placeholder="Password (min 6 characters)"
              class="input"
              autocomplete="new-password"
              aria-label="Password"
            />
          </div>
          <button class="btn-primary" (click)="signUp()" [disabled]="loading()">
            {{ loading() ? 'Creating account...' : 'Create Account' }}
          </button>
          <p class="switch-mode">
            Already have an account?
            <button class="link-btn" (click)="mode.set('signin')">Sign in</button>
          </p>
        }

        @if (error()) {
          <p class="error-msg">{{ error() }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-screen {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 24px;
      max-width: 400px;
      margin: 0 auto;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 48px;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      color: #f5f5f5;
      line-height: 1.2;
      margin: 0;
    }
    .tagline {
      color: #888;
      margin-top: 12px;
      font-size: 15px;
      line-height: 1.5;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .form-group { display: flex; flex-direction: column; }
    .input {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 10px;
      padding: 14px 16px;
      color: #f5f5f5;
      font-size: 16px;
      outline: none;
      transition: border-color 150ms;
      &:focus { border-color: #4ade80; }
    }
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
      &:disabled { opacity: 0.5; }
    }
    .btn-google {
      background: #1a1a1a;
      color: #f5f5f5;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 14px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      min-height: 48px;
    }
    .switch-mode {
      text-align: center;
      color: #888;
      font-size: 14px;
      margin-top: 8px;
    }
    .link-btn {
      background: none;
      border: none;
      color: #4ade80;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      min-height: auto;
      min-width: auto;
      padding: 4px;
    }
    .error-msg {
      color: #ef4444;
      text-align: center;
      font-size: 14px;
    }
  `],
})
export class AuthComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private audio = inject(AudioService);
  private router = inject(Router);
  private fs = inject(FirestoreService);

  mode = signal<'signin' | 'signup'>('signin');
  email = '';
  password = '';
  displayName = '';
  loading = signal(false);
  error = signal('');

  async signIn(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const user = await this.authService.signIn(this.email, this.password);
      this.audio.play('tap-primary');
      const profile = await this.fs.get<UserDoc>(`users/${user.uid}`);
      this.router.navigate([profile ? '/today' : '/onboarding']);
    } catch (err: unknown) {
      this.audio.play('error');
      this.error.set(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      this.loading.set(false);
    }
  }

  async signUp(): Promise<void> {
    if (!this.displayName.trim()) {
      this.error.set('Display name is required');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      await this.authService.signUp(this.email, this.password);
      this.audio.play('tap-primary');
      this.router.navigate(['/onboarding']);
    } catch (err: unknown) {
      this.audio.play('error');
      this.error.set(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      this.loading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const user = await this.authService.signInWithGoogle();
      this.audio.play('tap-primary');
      const profile = await this.fs.get<UserDoc>(`users/${user.uid}`);
      this.router.navigate([profile ? '/today' : '/onboarding']);
    } catch (err: unknown) {
      this.audio.play('error');
      this.error.set(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      this.loading.set(false);
    }
  }
}
