import { Component, input, output, inject, OnInit, signal } from '@angular/core';
import { AudioService } from '../../core/services/audio.service';
import { SEED_EXERCISES } from '../../core/data/exercises';

type ContentType = 'partner-activity' | 'mobility' | 'weekly-summary';

@Component({
  selector: 'app-rest-day-card',
  standalone: true,
  template: `
    <div class="rest-day-card">
      <p class="rest-label">Rest Day</p>

      @if (contentType() === 'partner-activity' && partnerActivity()) {
        <p class="rest-content">{{ partnerActivity() }}</p>
      }

      @if (contentType() === 'mobility') {
        <p class="rest-content">Try some mobility work today</p>
        <div class="mobility-suggestion">
          <p class="mob-name">{{ mobilityExercise().name }}</p>
          <p class="mob-detail">{{ mobilityExercise().cues }}</p>
        </div>
        <button class="rest-cta" (click)="onMobilityCta()">Do a Quick Stretch</button>
      }

      @if (contentType() === 'weekly-summary') {
        <p class="rest-content">{{ weeklySummary() }}</p>
      }
    </div>
  `,
  styles: [`
    .rest-day-card {
      background: #1a1a1a;
      border-radius: 16px;
      padding: 24px 20px;
      text-align: center;
    }
    .rest-label {
      font-size: 12px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px;
    }
    .rest-content {
      font-size: 15px;
      color: #ccc;
      margin: 0 0 16px;
      line-height: 1.5;
    }
    .mobility-suggestion {
      background: #0f0f0f;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
    }
    .mob-name {
      font-size: 15px;
      font-weight: 600;
      color: #f5f5f5;
      margin: 0 0 4px;
    }
    .mob-detail {
      font-size: 13px;
      color: #888;
      margin: 0;
    }
    .rest-cta {
      background: #0a2a15;
      border: 1px solid #4ade80;
      border-radius: 12px;
      color: #4ade80;
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      min-height: 48px;
    }
  `],
})
export class RestDayCardComponent implements OnInit {
  private audio = inject(AudioService);

  partnerActivity = input<string>('');
  weeklyCompleted = input(0);
  weeklyGoal = input(5);

  mobilityTapped = output<void>();

  contentType = signal<ContentType>('mobility');
  mobilityExercise = signal({ name: '', cues: '' });
  weeklySummary = signal('');

  ngOnInit(): void {
    // Rotate content based on day of week
    const day = new Date().getDay();
    if (this.partnerActivity() && day % 3 === 0) {
      this.contentType.set('partner-activity');
    } else if (day % 3 === 1) {
      this.contentType.set('weekly-summary');
      this.weeklySummary.set(
        `${this.weeklyCompleted()}/${this.weeklyGoal()} workouts done this week` +
        (this.weeklyGoal() - this.weeklyCompleted() > 0
          ? `, ${this.weeklyGoal() - this.weeklyCompleted()} more to hit your goal`
          : ' — goal reached!')
      );
    } else {
      this.contentType.set('mobility');
      this.pickMobilityExercise();
    }
  }

  private pickMobilityExercise(): void {
    const mobilityExercises = SEED_EXERCISES.filter(e =>
      e.workoutTypeTags.includes('mobility' as any) || e.workoutTypeTags.includes('recovery' as any)
    );
    if (mobilityExercises.length === 0) return;
    const random = mobilityExercises[Math.floor(Math.random() * mobilityExercises.length)];
    this.mobilityExercise.set({
      name: random.name,
      cues: random.coachingCues?.join(' · ') ?? 'Hold for 30 seconds each side',
    });
  }

  onMobilityCta(): void {
    this.audio.play('tap-primary');
    this.mobilityTapped.emit();
  }
}
