import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal(false);
  readonly installed = signal(Capacitor.isNativePlatform() || this.isStandalone());

  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      this.deferredPrompt = promptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.installed.set(true);
    });
  }

  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }

    const promptEvent = this.deferredPrompt;
    this.deferredPrompt = null;
    this.canInstall.set(false);

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    return choice.outcome;
  }

  private isStandalone(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const displayModeStandalone =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)').matches
        : false;

    return displayModeStandalone || navigatorWithStandalone.standalone === true;
  }
}
