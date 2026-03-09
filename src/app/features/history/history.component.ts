import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SessionService } from '../../core/services/session.service';
import { PairService } from '../../core/services/pair.service';
import { AuthService } from '../../core/services/auth.service';
import { SessionDoc } from '../../core/models/session.model';

interface WeekGroup {
  label: string;
  sessions: SessionDoc[];
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="screen-enter" style="padding: 20px 16px;">
      <h1 style="font-size: 28px; font-weight: 700; color: #f5f5f5; margin: 0 0 8px;">History</h1>
      <p style="color: #888; font-size: 14px; margin: 0 0 20px;">Last 30 days</p>

      @if (!pairService.activePair()) {
        <div style="text-align: center; padding: 48px 16px;">
          <p style="font-size: 18px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px;">No partner linked yet</p>
          <p style="color: #888; font-size: 14px; margin: 0;">Link with a partner to start tracking workout history.</p>
        </div>
      } @else if (loading()) {
        <div style="color: #888; text-align: center; padding: 40px 0;">Loading...</div>
      } @else if (weekGroups().length === 0) {
        <div style="text-align: center; padding: 60px 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <p style="color: #888; font-size: 15px; margin: 0;">No completed sessions yet.</p>
          <p style="color: #666; font-size: 13px; margin: 4px 0 0;">Start your first workout!</p>
        </div>
      } @else {
        <div style="display: flex; flex-direction: column; gap: 24px;">
          @for (week of weekGroups(); track week.label) {
            <div>
              <h2 style="font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;">{{ week.label }}</h2>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                @for (session of week.sessions; track session.id) {
                  <div style="background: #1a1a1a; border-radius: 12px; padding: 14px 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="color: #f5f5f5; font-size: 14px; font-weight: 500;">{{ session.scheduledDate | date:'EEE, MMM d' }}</span>
                      <span
                        style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px;"
                        [style.background]="session.mode === 'together' ? '#4ade8022' : '#60a5fa22'"
                        [style.color]="session.mode === 'together' ? '#4ade80' : '#60a5fa'"
                      >{{ session.mode }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #aaa; font-size: 13px;">{{ getWorkoutType(session) }}</span>
                      <span
                        style="font-size: 12px; font-weight: 500;"
                        [style.color]="session.status === 'shared_complete' ? '#4ade80' : session.status === 'awaiting_partner_confirmation' ? '#facc15' : '#888'"
                      >{{ getStatusLabel(session.status) }}</span>
                    </div>
                    @if (getMyData(session); as myData) {
                      @if (myData.effortRating) {
                        <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
                          <span style="color: #666; font-size: 12px;">Effort:</span>
                          <div style="display: flex; gap: 2px;">
                            @for (i of [1,2,3,4,5]; track i) {
                              <span
                                style="width: 8px; height: 8px; border-radius: 50%;"
                                [style.background]="i <= effortToFive(myData.effortRating || 0) ? '#4ade80' : '#333'"
                              ></span>
                            }
                          </div>
                          <span style="color: #666; font-size: 11px; margin-left: 4px;">{{ myData.effortRating }}/10</span>
                        </div>
                      }
                    }
                    @if (session.reactions?.length) {
                      <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
                        @for (r of session.reactions; track r.emoji + r.fromUid) {
                          <span style="background: #0f0f0f; border: 1px solid #333; border-radius: 12px; padding: 2px 8px; font-size: 14px;">{{ r.emoji }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class HistoryComponent implements OnInit {
  private sessionService = inject(SessionService);
  readonly pairService = inject(PairService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  private sessions = signal<SessionDoc[]>([]);

  readonly weekGroups = computed<WeekGroup[]>(() => {
    const all = this.sessions();
    if (all.length === 0) return [];

    const groups = new Map<string, SessionDoc[]>();

    for (const session of all) {
      const date = new Date(session.scheduledDate);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(session);
    }

    const sorted = Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, sessions]) => {
        const weekDate = new Date(key);
        const endDate = new Date(weekDate);
        endDate.setDate(weekDate.getDate() + 6);
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          label: `${fmt(weekDate)} - ${fmt(endDate)}`,
          sessions: sessions.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
        };
      });

    return sorted;
  });

  async ngOnInit(): Promise<void> {
    const pairId = this.pairService.activePair()?.id;
    if (!pairId) {
      this.loading.set(false);
      return;
    }

    const now = new Date();
    const end = now.toISOString().split('T')[0];
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const results = await this.sessionService.getSessionsForDateRange(pairId, start, end);
      // Only show sessions that have some completion
      const completed = results.filter(s =>
        s.status === 'shared_complete' ||
        s.status === 'awaiting_partner_confirmation' ||
        Object.values(s.users).some(u => u.completionState === 'completed')
      );
      this.sessions.set(completed);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      this.loading.set(false);
    }
  }

  getWorkoutType(session: SessionDoc): string {
    const uid = this.auth.uid();
    if (!uid) return '';
    const userData = session.users[uid];
    if (!userData) {
      // Show first user's type
      const first = Object.values(session.users)[0];
      return first?.assignedTrackType?.replace(/_/g, ' ') ?? '';
    }
    return userData.assignedTrackType?.replace(/_/g, ' ') ?? '';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'shared_complete': return 'Both done';
      case 'awaiting_partner_confirmation': return 'Waiting on partner';
      case 'in_progress': return 'In progress';
      default: return status;
    }
  }

  effortToFive(rating: number): number {
    return Math.round(rating / 2);
  }

  getMyData(session: SessionDoc) {
    const uid = this.auth.uid();
    if (!uid) return null;
    return session.users[uid] ?? null;
  }
}
