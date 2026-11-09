import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterModule } from '@angular/router';
import { MESSAGES } from '../../core/i18n/messages.es';
import { AppNotification } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/utils/error-message';
import { PaginationComponent } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, RouterModule, MatIconModule,     MatProgressBarModule, PaginationComponent],
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
  readonly pageSize = signal(10);
  readonly total = signal(0);
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
      .list({ unread: this.onlyUnread(), page: this.page(), per_page: this.pageSize() })
      .subscribe({
        next: (response) => {
          this.items.set(response.data);
          this.lastPage.set(response.last_page);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(extractErrorMessage(error, MESSAGES.notifications.loadFallback));
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
        this.toast.error(extractErrorMessage(error, MESSAGES.notifications.markReadFallback));
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
        this.toast.success(MESSAGES.notifications.markAllSuccess);
        this.load();
      },
      error: (error) => {
        this.markingAll.set(false);
        this.toast.error(extractErrorMessage(error, MESSAGES.notifications.markAllFallback));
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
      this.toast.warning(MESSAGES.notifications.invalidDays);
      return;
    }

    this.savingSettings.set(true);

    this.settings.update(days).subscribe({
      next: (response) => {
        this.savingSettings.set(false);
        this.alertDays.set(response.data.pending_alert_days);
        this.toast.success(response.message || MESSAGES.notifications.settingsSuccess);
      },
      error: (error) => {
        this.savingSettings.set(false);
        this.toast.error(extractErrorMessage(error, MESSAGES.notifications.settingsFallback));
      },
    });
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
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
        return MESSAGES.notifications.types.ready;
      case 'overdue':
        return MESSAGES.notifications.types.overdue;
      case 'stale':
        return MESSAGES.notifications.types.stale;
      default:
        return MESSAGES.notifications.types.default;
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
