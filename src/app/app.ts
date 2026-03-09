import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ConnectivityService } from './core/services/connectivity.service';
import { AuthService } from './core/services/auth.service';
import { AudioService } from './core/services/audio.service';
import { PwaInstallService } from './core/services/pwa-install.service';
import { InstallBannerComponent } from './shared/components/install-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, InstallBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly connectivity = inject(ConnectivityService);
  readonly auth = inject(AuthService);
  readonly pwaInstall = inject(PwaInstallService);
  private audio = inject(AudioService);

  async ngOnInit(): Promise<void> {
    // Initialize audio on first user interaction (browser autoplay policy)
    const initAudio = async () => {
      await this.audio.init();
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });
  }

  async onInstallClicked(): Promise<void> {
    await this.pwaInstall.triggerInstall();
  }

  onInstallDismissed(): void {
    this.pwaInstall.dismissPrompt();
  }
}
