import { Injectable, signal } from '@angular/core';

export type SoundId =
  | 'tap-primary'
  | 'tap-secondary'
  | 'exercise-complete'
  | 'countdown-tick'
  | 'countdown-go'
  | 'timer-work'
  | 'timer-rest'
  | 'timer-warning'
  | 'workout-complete'
  | 'shared-complete'
  | 'medal-unlock'
  | 'streak-advance'
  | 'partner-done'
  | 'nudge-sent'
  | 'nudge-received'
  | 'error';

interface SoundConfig {
  file: string;
  volume: number;
  playbackRate: number;
}

const SOUND_MAP: Record<SoundId, SoundConfig> = {
  'tap-primary':       { file: 'tap-primary.mp3',                    volume: 1.0, playbackRate: 1.0 },
  'tap-secondary':     { file: 'tap-primary.mp3',                    volume: 0.6, playbackRate: 1.0 },
  'exercise-complete': { file: 'tap-primary.mp3',                    volume: 1.0, playbackRate: 1.3 },
  'countdown-tick':    { file: 'countdown-tick.mp3',                 volume: 1.0, playbackRate: 1.0 },
  'countdown-go':      { file: 'countdown-go.mp3',                   volume: 1.0, playbackRate: 1.0 },
  'timer-work':        { file: 'timer-work.mp3',                     volume: 1.0, playbackRate: 1.0 },
  'timer-rest':        { file: 'timer-rest.mp3',                     volume: 1.0, playbackRate: 1.0 },
  'timer-warning':     { file: 'warning-sound.mp3',                  volume: 1.0, playbackRate: 1.0 },
  'workout-complete':  { file: 'workout-complete.mp3',               volume: 1.0, playbackRate: 1.0 },
  'shared-complete':   { file: 'workout-complete-shared-complete.mp3', volume: 1.0, playbackRate: 1.0 },
  'medal-unlock':      { file: 'medal-unlock-streak-advance.mp3',    volume: 1.0, playbackRate: 1.0 },
  'streak-advance':    { file: 'medal-unlock-streak-advance.mp3',    volume: 0.8, playbackRate: 1.1 },
  'partner-done':      { file: 'nudge-received.mp3',                 volume: 0.8, playbackRate: 1.0 },
  'nudge-sent':        { file: 'nudge-sent.mp3',                     volume: 1.0, playbackRate: 1.0 },
  'nudge-received':    { file: 'nudge-received.mp3',                 volume: 1.0, playbackRate: 1.0 },
  'error':             { file: 'error.mp3',                          volume: 1.0, playbackRate: 1.0 },
};

// Haptic patterns for key interactions
const HAPTIC_MAP: Partial<Record<SoundId, number | number[]>> = {
  'exercise-complete': 10,
  'workout-complete': 50,
  'shared-complete': [50, 30, 50],
  'medal-unlock': [30, 20, 30, 20, 50],
  'countdown-go': 30,
  'error': 20,
};

@Injectable({ providedIn: 'root' })
export class AudioService {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private initialized = false;

  readonly enabled = signal(true);

  async init(): Promise<void> {
    if (this.initialized) return;
    this.context = new AudioContext();

    const uniqueFiles = new Set(Object.values(SOUND_MAP).map(s => s.file));
    const loadPromises = Array.from(uniqueFiles).map(file => this.loadBuffer(file));
    await Promise.all(loadPromises);

    this.initialized = true;
  }

  play(soundId: SoundId): void {
    if (!this.enabled() || !this.context || !this.initialized) return;

    const config = SOUND_MAP[soundId];
    const buffer = this.buffers.get(config.file);
    if (!buffer) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = config.playbackRate;

    const gain = this.context.createGain();
    gain.gain.value = config.volume;

    source.connect(gain);
    gain.connect(this.context.destination);
    source.start(0);

    // Haptic feedback
    const haptic = HAPTIC_MAP[soundId];
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(haptic);
    }
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
  }

  private async loadBuffer(file: string): Promise<void> {
    try {
      const response = await fetch(`/sounds/${file}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
      this.buffers.set(file, audioBuffer);
    } catch (err) {
      console.warn(`Failed to load sound: ${file}`, err);
    }
  }
}
