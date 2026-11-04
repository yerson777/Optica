import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterModule } from '@angular/router';
import { AppNotification } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/utils/error-message';
import { PagerComponent } from '../../shared/ui/pager.component';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressBarModule, PagerComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent implements OnInit {
  private readonly notifications = inject(NotificationService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(true);
  readonly onlyUnread = signal(false);
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly unreadCount = this.notifications.unreadCount;
  readonly alertDays = signal(5);
  readonly savingSettings = signal(false);
  readonly markingAll = signal(false);

  ngOnInit(): void {
    this.load();
    this.loadSettings();
  }

  load(): void {
    this.loading.set(true);

    this.notifications
      .list({ unread: this.onlyUnread(), page: this.page(), per_page: 20 })
      .subscribe({
        next: (response) => {
          this.items.set(response.data);
          this.lastPage.set(response.last_page);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(extractErrorMessage(error, 'No se pudieron cargar los avisos.'));
        },
      });
  }

  loadSettings(): void {
    this.settings.get().subscribe({
      next: (response) => this.alertDays.set(response.data.pending_alert_days),
      error: () => undefined,
    });
  }

  toggleUnread(): void {
    this.onlyUnread.update((value) => !value);
    this.page.set(1);
    this.load();
  }

  markRead(notification: AppNotification): void {
    if (notification.read_at) {
      return;
    }

    this.notifications.markRead(notification.id).subscribe({
      next: (response) => {
        this.items.update((items) =>
          items.map((item) => (item.id === notification.id ? response.data : item))
        );
      },
      error: (error) => {
        this.toast.error(extractErrorMessage(error, 'No se pudo marcar el aviso como leído.'));
      },
    });
  }

  markAllRead(): void {
    if (this.unreadCount() === 0) {
      return;
    }

    this.markingAll.set(true);

    this.notifications.markAllRead().subscribe({
      next: () => {
        this.markingAll.set(false);
        this.toast.success('Todos los avisos se marcaron como leídos.');
        this.load();
      },
      error: (error) => {
        this.markingAll.set(false);
        this.toast.error(extractErrorMessage(error, 'No se pudieron marcar los avisos.'));
      },
    });
  }

  openOrder(notification: AppNotification): void {
    this.markRead(notification);
    this.router.navigate(['/pedidos', notification.order_id]);
  }

  onDaysInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (Number.isFinite(value)) {
      this.alertDays.set(value);
    }
  }

  saveSettings(): void {
    const days = Number(this.alertDays());

    if (!Number.isInteger(days) || days < 1 || days > 60) {
      this.toast.error('El plazo debe ser un número entero entre 1 y 60 días.');
      return;
    }

    this.savingSettings.set(true);

    this.settings.update(days).subscribe({
      next: (response) => {
        this.savingSettings.set(false);
        this.alertDays.set(response.data.pending_alert_days);
        this.toast.success(response.message || 'Configuración guardada.');
      },
      error: (error) => {
        this.savingSettings.set(false);
        this.toast.error(extractErrorMessage(error, 'No se pudo guardar la configuración.'));
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage() || page === this.page()) {
      return;
    }

    this.page.set(page);
    this.load();
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'ready':
        return 'Listo para entregar';
      case 'overdue':
        return 'Pedido pendiente';
      case 'stale':
        return 'Requiere atención';
      default:
        return 'Aviso';
    }
  }

  typeIcon(type: string): string {
    switch (type) {
      case 'ready':
        return 'notifications_active';
      case 'stale':
        return 'priority_high';
      default:
        return 'schedule';
    }
  }
}
