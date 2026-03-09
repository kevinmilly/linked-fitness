import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'lfp_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal(false);
  readonly installed = signal(false);

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.canInstall.set(false);
      this.deferredPrompt = null;
    });
  }

  async triggerInstall(): Promise<'accepted' | 'dismissed'> {
    if (!this.deferredPrompt) return 'dismissed';
    await this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.canInstall.set(false);
      this.deferredPrompt = null;
    }
    return outcome;
  }

  shouldShowPrompt(completedSessions: number = 0): boolean {
    if (!this.canInstall()) return false;
    if (this.installed()) return false;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_COOLDOWN_MS) return false;
    }

    return true;
  }

  dismissPrompt(): void {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }
}
