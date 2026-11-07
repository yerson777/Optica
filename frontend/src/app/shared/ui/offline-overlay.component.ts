import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MESSAGES } from '../../core/i18n/messages.es';
import { ConnectivityService } from '../../core/services/connectivity.service';

@Component({
  selector: 'app-offline-overlay',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (connectivity.offline()) {
      <div class="offline" role="alertdialog" aria-live="assertive" aria-modal="true">
        <div class="offline__card">
          <div class="offline__brand">
            <span class="material-icons">visibility</span>
            <strong>Óptica</strong>
          </div>

          <div class="offline__icon">
            <mat-icon>{{ icon() }}</mat-icon>
          </div>

          <h2>{{ title() }}</h2>
          <p class="offline__message">{{ message() }}</p>

          <button
            type="button"
            class="btn btn--primary btn--lg btn--block"
            [disabled]="connectivity.checking()"
            (click)="retry()"
          >
            @if (connectivity.checking()) {
              <span class="offline__spinner"></span>
              {{ messages.common.checking }}
            } @else {
              <span class="material-icons">refresh</span>
              {{ messages.common.retry }}
            }
          </button>

          <p class="offline__hint">{{ messages.connectivity.hint }}</p>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .offline {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: grid;
        place-items: center;
        padding: 20px;
        background:
          radial-gradient(circle at 20% 15%, rgba(0, 160, 160, 0.2), transparent 40%),
          rgba(245, 248, 248, 0.94);
        backdrop-filter: blur(6px);
      }

      .offline__card {
        width: 100%;
        max-width: 420px;
        background: #fff;
        border: 1px solid var(--optic-border);
        border-radius: 22px;
        box-shadow: 0 24px 60px rgba(20, 70, 70, 0.18);
        padding: 28px;
        text-align: center;
      }

      .offline__brand {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--optic-primary-dark);
        font-size: 1.05rem;
        margin-bottom: 18px;
      }

      .offline__brand .material-icons {
        font-size: 24px;
        color: var(--optic-primary);
      }

      .offline__icon {
        width: 72px;
        height: 72px;
        margin: 0 auto 16px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--optic-warning-soft);
        color: var(--optic-warning);
      }

      .offline__icon mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }

      h2 {
        font-size: 1.35rem;
        margin-bottom: 8px;
      }

      .offline__message {
        color: var(--optic-muted);
        font-size: 0.92rem;
        margin-bottom: 20px;
        line-height: 1.5;
      }

      .offline__hint {
        margin-top: 16px;
        font-size: 0.76rem;
        color: #879999;
        line-height: 1.45;
      }

      .offline__spinner {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-top-color: #fff;
        animation: spin 0.7s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 480px) {
        .offline__card {
          padding: 22px 18px;
        }
      }
    `,
  ],
})
export class OfflineOverlayComponent implements OnInit {
  readonly connectivity = inject(ConnectivityService);
  readonly messages = MESSAGES;

  ngOnInit(): void {
    this.connectivity.start();
  }

  title(): string {
    return this.connectivity.problem() === 'network'
      ? MESSAGES.connectivity.offlineTitle
      : MESSAGES.connectivity.serverTitle;
  }

  message(): string {
    return this.connectivity.problem() === 'network'
      ? MESSAGES.connectivity.offlineMessage
      : MESSAGES.connectivity.serverMessage;
  }

  icon(): string {
    return this.connectivity.problem() === 'network' ? 'wifi_off' : 'cloud_off';
  }

  retry(): void {
    void this.connectivity.check();
  }
}
