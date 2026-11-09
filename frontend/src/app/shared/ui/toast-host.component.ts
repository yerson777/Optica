import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MESSAGES } from '../../core/i18n/messages.es';
import { ToastService, ToastType } from '../../core/services/toast.service';

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-host" [class.toast-host--login]="isLogin()" aria-live="polite" aria-atomic="false">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast"
          [class]="'toast toast--' + toast.type"
          [class.toast--closing]="toast.closing"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        >
          <span class="material-icons toast__icon" aria-hidden="true">{{ icon(toast.type) }}</span>
          <p class="toast__message">{{ toast.message }}</p>
          <button
            type="button"
            class="toast__close"
            [attr.aria-label]="messages.common.close"
            (click)="dismiss(toast.id)"
          >
            <span class="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .toast-host {
        position: fixed;
        top: 80px;
        right: 18px;
        z-index: 900;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: min(380px, calc(100vw - 24px));
        pointer-events: none;
      }

      .toast-host--login {
        top: 18px;
      }

      .toast {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 12px 12px 14px;
        border-radius: 14px;
        background: var(--optic-surface);
        border: 1px solid var(--optic-border);
        border-left: 5px solid var(--optic-primary);
        box-shadow: var(--shadow-md);
        color: var(--optic-text);
        animation: toast-in 0.22s ease-out;
      }

      .toast--closing {
        animation: toast-out 0.18s ease-in forwards;
      }

      .toast__icon {
        flex-shrink: 0;
        font-size: 22px;
        line-height: 1.25;
      }

      .toast__message {
        flex: 1;
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .toast__close {
        flex-shrink: 0;
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--optic-muted);
        cursor: pointer;
      }

      .toast__close:hover {
        background: var(--optic-bg);
        color: var(--optic-text);
      }

      .toast__close .material-icons {
        font-size: 18px;
      }

      .toast--success {
        border-left-color: var(--optic-success);
        background: var(--optic-success-soft);
      }

      .toast--success .toast__icon {
        color: var(--optic-success);
      }

      .toast--error {
        border-left-color: var(--optic-danger);
        background: var(--optic-danger-soft);
      }

      .toast--error .toast__icon {
        color: var(--optic-danger);
      }

      .toast--warning {
        border-left-color: var(--optic-warning);
        background: var(--optic-warning-soft);
      }

      .toast--warning .toast__icon {
        color: var(--optic-warning);
      }

      .toast--info {
        border-left-color: var(--optic-primary);
        background: var(--optic-info-soft);
      }

      .toast--info .toast__icon {
        color: var(--optic-primary-dark);
      }

      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(-8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes toast-out {
        to {
          opacity: 0;
          transform: translateY(-6px) scale(0.98);
        }
      }

      @media (max-width: 720px) {
        .toast-host {
          top: 72px;
          left: 50%;
          right: auto;
          transform: translateX(-50%);
          width: calc(100vw - 20px);
        }

        .toast-host--login {
          top: 12px;
        }
      }
    `,
  ],
})
export class ToastHostComponent {
  readonly messages = MESSAGES;

  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly toasts = this.toastService.toasts;
  readonly isLogin = signal(this.router.url.startsWith('/login'));

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.isLogin.set(this.router.url.startsWith('/login'));
    });
  }

  icon(type: ToastType): string {
    return TOAST_ICONS[type];
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
