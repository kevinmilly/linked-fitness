import { Component, output, input, inject } from '@angular/core';
import { AudioService } from '../../core/services/audio.service';

const REACTION_EMOJIS = ['🔥', '💪', '👏', '🎯', '⚡'];

@Component({
  selector: 'app-reaction-picker',
  standalone: true,
  template: `
    <div class="reaction-picker">
      @for (emoji of emojis; track emoji) {
        <button
          class="reaction-btn"
          [class.sent]="sentEmojis().includes(emoji)"
          [disabled]="sentEmojis().includes(emoji)"
          (click)="selectEmoji(emoji)"
          [attr.aria-label]="'React with ' + emoji"
        >
          {{ emoji }}
        </button>
      }
    </div>
  `,
  styles: [`
    .reaction-picker {
      display: flex;
      gap: 8px;
      justify-content: center;
      padding: 12px 0;
    }
    .reaction-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 1px solid #333;
      background: #1a1a1a;
      font-size: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 200ms ease, background 200ms ease;
    }
    .reaction-btn:active:not(:disabled) {
      transform: scale(1.2);
    }
    .reaction-btn.sent {
      background: #0a2a15;
      border-color: #4ade80;
      opacity: 0.7;
      cursor: default;
    }
  `],
})
export class ReactionPickerComponent {
  private audio = inject(AudioService);

  sentEmojis = input<string[]>([]);
  reactionSelected = output<string>();

  readonly emojis = REACTION_EMOJIS;

  selectEmoji(emoji: string): void {
    this.audio.play('reaction-sent');
    this.reactionSelected.emit(emoji);
  }
}
