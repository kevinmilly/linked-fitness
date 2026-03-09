import { Component, inject, output } from '@angular/core';
import { AudioService } from '../../core/services/audio.service';

@Component({
  selector: 'app-install-banner',
  standalone: true,
  template: `
    <div class="install-banner">
      <div class="install-content">
        <div class="install-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div class="install-text">
          <span class="install-title">Add to Home Screen</span>
          <span class="install-subtitle">Quick access to your workouts</span>
        </div>
      </div>
      <div class="install-actions">
        <button class="install-btn" (click)="onInstall()">Install</button>
        <button class="dismiss-btn" (click)="onDismiss()" aria-label="Dismiss">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .install-banner {
      position: fixed;
      bottom: 72px;
      left: 8px;
      right: 8px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 99;
      animation: slideUp 300ms ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .install-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .install-icon {
      width: 44px;
      height: 44px;
      background: #222;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .install-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .install-title {
      color: #f5f5f5;
      font-size: 14px;
      font-weight: 600;
    }

    .install-subtitle {
      color: #888;
      font-size: 12px;
    }

    .install-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .install-btn {
      background: #4ade80;
      color: #0a0a0a;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      min-height: 48px;
      min-width: 48px;
    }

    .dismiss-btn {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 8px;
      min-height: 48px;
      min-width: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `],
})
export class InstallBannerComponent {
  private audio = inject(AudioService);

  readonly installClicked = output<void>();
  readonly dismissed = output<void>();

  onInstall(): void {
    this.audio.play('tap-primary');
    this.installClicked.emit();
  }

  onDismiss(): void {
    this.audio.play('tap-secondary');
    this.dismissed.emit();
  }
}
