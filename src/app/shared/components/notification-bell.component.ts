import { Component, inject, signal, computed } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { AudioService } from '../../core/services/audio.service';
import { AuthService } from '../../core/services/auth.service';
import { SwipeCompleteDirective } from '../directives/swipe-complete.directive';
import { InAppNotification, NotificationType } from '../../core/models';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [SwipeCompleteDirective],
  template: `
    <button class="bell-btn" (click)="togglePanel()" aria-label="Notifications">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      @if (notificationService.unreadCount() > 0) {
        <span class="badge">{{ notificationService.unreadCount() }}</span>
      }
    </button>

    @if (panelOpen()) {
      <div class="overlay" (click)="togglePanel()"></div>
      <div class="panel">
        <div class="panel-header">
          <h3>Notifications</h3>
          @if (notificationService.unreadCount() > 0) {
            <button class="mark-all-btn" (click)="markAllRead()">Mark all read</button>
          }
        </div>
        <div class="panel-body">
          @if (notificationService.notifications().length === 0) {
            <div class="empty">No notifications yet</div>
          }
          @for (n of notificationService.notifications(); track n.id) {
            <div
              class="notif-card"
              [class.unread]="!n.read"
              appSwipeComplete
              (swipeComplete)="onSwipeRead(n)"
            >
              <span class="notif-icon">{{ getIcon(n.type) }}</span>
              <div class="notif-content">
                <p class="notif-title">{{ n.title }}</p>
                <p class="notif-body">{{ n.body }}</p>
                <p class="notif-time">{{ timeAgo(n.createdAt) }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { position: relative; }
    .bell-btn {
      position: relative;
      background: none;
      border: none;
      color: #f5f5f5;
      cursor: pointer;
      padding: 8px;
      min-height: 48px;
      min-width: 48px;
    }
    .badge {
      position: absolute;
      top: 2px;
      right: 2px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 998;
    }
    .panel {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 70vh;
      background: #0f0f0f;
      border-radius: 16px 16px 0 0;
      z-index: 999;
      display: flex;
      flex-direction: column;
      animation: slideUp 200ms ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #222;
    }
    .panel-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #f5f5f5;
    }
    .mark-all-btn {
      background: none;
      border: none;
      color: #4ade80;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .panel-body {
      overflow-y: auto;
      padding: 8px 16px 24px;
    }
    .empty {
      text-align: center;
      color: #666;
      padding: 40px 0;
      font-size: 15px;
    }
    .notif-card {
      display: flex;
      gap: 12px;
      padding: 14px;
      background: #1a1a1a;
      border-radius: 12px;
      margin-bottom: 8px;
      &.unread { border-left: 3px solid #4ade80; }
    }
    .notif-icon {
      font-size: 20px;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .notif-content { flex: 1; min-width: 0; }
    .notif-title {
      margin: 0 0 2px;
      font-size: 14px;
      font-weight: 600;
      color: #f5f5f5;
    }
    .notif-body {
      margin: 0 0 4px;
      font-size: 13px;
      color: #999;
    }
    .notif-time {
      margin: 0;
      font-size: 11px;
      color: #666;
    }
  `],
})
export class NotificationBellComponent {
  readonly notificationService = inject(NotificationService);
  private audio = inject(AudioService);
  private auth = inject(AuthService);

  readonly panelOpen = signal(false);

  private readonly iconMap: Record<NotificationType, string> = {
    workout_ready: '💪',
    partner_completed: '✓',
    sign_off_pending: '⏳',
    streak_expiring: '🔥',
    medal_close: '🏅',
    nudge_received: '👋',
    weekly_recap: '📊',
    reaction_received: '🎉',
  };

  togglePanel(): void {
    this.audio.play('tap-secondary');
    this.panelOpen.update(v => !v);
  }

  getIcon(type: NotificationType): string {
    return this.iconMap[type] ?? '🔔';
  }

  timeAgo(ts: Timestamp): string {
    const now = Date.now();
    const then = ts.toMillis();
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  }

  onSwipeRead(n: InAppNotification): void {
    const uid = this.auth.uid();
    if (!uid || n.read) return;
    this.audio.play('tap-secondary');
    this.notificationService.markRead(uid, n.id);
  }

  markAllRead(): void {
    const uid = this.auth.uid();
    if (!uid) return;
    this.audio.play('tap-secondary');
    this.notificationService.markAllRead(uid);
  }
}
