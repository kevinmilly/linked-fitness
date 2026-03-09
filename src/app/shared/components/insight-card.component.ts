import { Component, input } from '@angular/core';
import { WorkoutInsight } from '../../core/services/insights.service';

@Component({
  selector: 'app-insight-card',
  standalone: true,
  template: `
    <div class="insight-card">
      <h3 class="insight-title">This Month</h3>
      <div class="stat-grid">
        <div class="stat-tile">
          <span class="stat-value">{{ insight().totalWorkoutsThisMonth }}</span>
          <span class="stat-label">Workouts</span>
        </div>
        <div class="stat-tile">
          <span class="stat-value">{{ insight().currentStreak }}</span>
          <span class="stat-label">Streak</span>
        </div>
        <div class="stat-tile">
          <span class="stat-value">{{ insight().avgEffort }}
            <span class="trend" [class]="insight().effortTrend">
              {{ insight().effortTrend === 'up' ? '↑' : insight().effortTrend === 'down' ? '↓' : '→' }}
            </span>
          </span>
          <span class="stat-label">Avg Effort</span>
        </div>
        <div class="stat-tile">
          <span class="stat-value">{{ insight().partnerCompletionRate }}%</span>
          <span class="stat-label">Sync Rate</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .insight-card {
      background: #1a1a1a;
      border-radius: 16px;
      padding: 20px;
      animation: fadeIn 400ms ease;
    }
    .insight-title {
      font-size: 14px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 16px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .stat-tile {
      background: #0f0f0f;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #f5f5f5;
    }
    .stat-label {
      font-size: 12px;
      color: #888;
    }
    .trend {
      font-size: 16px;
      &.up { color: #4ade80; }
      &.down { color: #f87171; }
      &.stable { color: #888; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class InsightCardComponent {
  insight = input.required<WorkoutInsight>();
}
