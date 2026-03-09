import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PairService } from '../../core/services/pair.service';
import { PresenceService } from '../../core/services/presence.service';
import { UserService } from '../../core/services/user.service';
import { AudioService } from '../../core/services/audio.service';

@Component({
  selector: 'app-partner',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="screen-enter" style="padding: 20px 16px;">
      <h1 style="font-size: 28px; font-weight: 700; color: #f5f5f5; margin: 0 0 24px;">Partner</h1>

      @if (pair.activePair()) {
        <div style="background: #1a1a1a; border-radius: 16px; padding: 24px; text-align: center;">
          <div
            class="partner-avatar"
            [class.live]="presence.partnerOnline()"
            style="width: 64px; height: 64px; border-radius: 50%; background: #333; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #888;"
          >
            {{ partnerInitial() }}
          </div>
          <p style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 4px;">
            {{ partnerName() || 'Partner linked' }}
          </p>
          <p style="font-size: 14px; color: #888; margin: 0;">
            {{ presence.partnerOnline() ? 'Online now' : 'Offline' }}
          </p>
        </div>
      } @else {
        <div style="text-align: center; padding: 32px 0;">
          <p style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px;">No partner linked</p>
          <p style="color: #888; font-size: 14px; margin: 0 0 24px;">Invite someone to train with you.</p>
          <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px; margin: 0 auto;">
            <input
              type="email"
              [(ngModel)]="inviteEmail"
              placeholder="Partner's email"
              aria-label="Partner's email address"
              style="background: #1a1a1a; border: 1px solid #333; border-radius: 10px; padding: 14px 16px; color: #f5f5f5; font-size: 16px; outline: none;"
            />
            <button
              style="background: #4ade80; color: #0f0f0f; border: none; border-radius: 12px; padding: 16px; font-size: 16px; font-weight: 600; cursor: pointer;"
              (click)="sendInvite()"
              [disabled]="!inviteEmail || sending()"
            >
              {{ sending() ? 'Sending...' : 'Send Invite' }}
            </button>
            @if (error()) {
              <p style="color: #ef4444; text-align: center; font-size: 14px; margin: 0;">{{ error() }}</p>
            }
            @if (success()) {
              <p style="color: #4ade80; text-align: center; font-size: 14px; margin: 0;">Invite sent! Tell your partner to sign up with that email.</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class PartnerComponent {
  readonly pair = inject(PairService);
  readonly presence = inject(PresenceService);
  private userService = inject(UserService);
  private audio = inject(AudioService);

  inviteEmail = '';
  sending = signal(false);
  error = signal('');
  success = signal(false);

  readonly partnerName = signal('');
  readonly partnerInitial = signal('P');

  constructor() {
    // Load partner profile for display name
    const partnerUid = this.pair.partnerUid();
    if (partnerUid) {
      this.userService.getProfile(partnerUid).then(profile => {
        if (profile) {
          this.partnerName.set(profile.displayName);
          this.partnerInitial.set(profile.displayName.charAt(0).toUpperCase());
        }
      });
    }
  }

  async sendInvite(): Promise<void> {
    if (!this.inviteEmail) return;
    this.sending.set(true);
    this.error.set('');
    this.success.set(false);
    try {
      await this.pair.createPairAndInvite(this.inviteEmail);
      this.audio.play('nudge-sent');
      this.success.set(true);
      this.inviteEmail = '';
    } catch (err: unknown) {
      this.audio.play('error');
      this.error.set(err instanceof Error ? err.message : 'Failed to send invite. Please try again.');
    } finally {
      this.sending.set(false);
    }
  }
}
