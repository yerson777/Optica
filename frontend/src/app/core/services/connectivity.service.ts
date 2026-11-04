import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type ConnectionProblem = 'network' | 'server';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private started = false;
  private timer: number | null = null;

  readonly offline = signal(false);
  readonly checking = signal(false);
  readonly problem = signal<ConnectionProblem>('network');

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }

    this.started = true;

    window.addEventListener('online', () => {
      void this.check();
    });

    window.addEventListener('offline', () => {
      this.markOffline('network');
    });

    window.addEventListener('optica:connection-lost', () => {
      this.markOffline(navigator.onLine ? 'server' : 'network');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.check();
      }
    });

    this.timer = window.setInterval(() => {
      if (!this.checking()) {
        void this.check();
      }
    }, 30000);

    void this.check();
  }

  async check(): Promise<void> {
    if (this.checking()) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.markOffline('network');
      return;
    }

    this.checking.set(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${environment.apiUrl}/ping`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!navigator.onLine) {
        this.markOffline('network');
      } else if (response.ok) {
        this.offline.set(false);
      } else {
        this.markOffline('server');
      }
    } catch {
      this.markOffline(navigator.onLine ? 'server' : 'network');
    } finally {
      window.clearTimeout(timeout);
      this.checking.set(false);
    }
  }

  markOffline(problem: ConnectionProblem): void {
    this.problem.set(problem);
    this.offline.set(true);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }

    this.started = false;
  }
}
