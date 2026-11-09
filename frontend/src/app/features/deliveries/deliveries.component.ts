import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterModule } from '@angular/router';
import { MESSAGES } from '../../core/i18n/messages.es';
import { Order } from '../../core/models';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/utils/error-message';
import { formatPhone, formatWhatsAppNumber } from '../../core/utils/format';
import { PaginationComponent } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-deliveries',
  imports: [CommonModule, RouterModule, MatIconModule,     MatProgressBarModule, PaginationComponent],
  templateUrl: './deliveries.component.html',
  styleUrl: './deliveries.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveriesComponent implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly items = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly busyId = signal<number | null>(null);
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = signal(10);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.orders
      .list({
        status: 'ready',
        page: this.page(),
        per_page: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          if (response.data.length === 0 && this.page() > 1) {
            this.page.update((page) => page - 1);
            this.load();
            return;
          }

          this.items.set(response.data);
          this.total.set(response.total);
          this.lastPage.set(response.last_page);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(extractErrorMessage(error, MESSAGES.deliveries.loadFallback));
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  phone(order: Order): string {
    return formatPhone(order.client?.phone);
  }

  open(order: Order): void {
    this.router.navigate(['/pedidos', order.id]);
  }

  async deliver(order: Order): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: MESSAGES.orders.deliveryConfirmTitle,
      message: MESSAGES.orders.deliveryConfirmMessage(
        order.id,
        order.client?.full_name ?? ''
      ),
      confirmText: MESSAGES.orders.deliveredConfirm,
      cancelText: MESSAGES.common.cancel,
    });

    if (!confirmed) {
      return;
    }

    this.busyId.set(order.id);

    this.orders.updateStatus(order.id, 'delivered').subscribe({
      next: (response) => {
        this.busyId.set(null);
        this.toast.success(response.message || MESSAGES.orders.deliveredFallback);
        this.notifications.refreshUnreadCount();

        if (this.items().length === 1 && this.page() > 1) {
          this.page.update((page) => page - 1);
        }

        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractErrorMessage(error, MESSAGES.orders.markDeliveredFallback));
      },
    });
  }

  async cancelOrder(order: Order): Promise<void> {
    if (this.busyId() !== null) {
      return;
    }

    const confirmed = await this.confirm.ask({
      title: MESSAGES.orders.cancelTitle,
      message: MESSAGES.orders.cancelMessageFor(
        order.id,
        order.client?.full_name ?? ''
      ),
      confirmText: MESSAGES.orders.cancelConfirm,
      cancelText: MESSAGES.common.cancel,
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.busyId.set(order.id);

    this.orders.updateStatus(order.id, 'cancelled').subscribe({
      next: (response) => {
        this.busyId.set(null);
        this.toast.success(response.message || MESSAGES.orders.cancelSuccess);
        this.notifications.refreshUnreadCount();
        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractErrorMessage(error, MESSAGES.orders.cancelFallback));
      },
    });
  }

  sendWhatsApp(order: Order): void {
    const waPhone = formatWhatsAppNumber(order.client?.phone ?? null);

    if (!waPhone) {
      this.toast.error(MESSAGES.common.invalidPhone);
      return;
    }

    const name = order.client?.full_name ?? 'cliente';
    const message = `¡Hola ${name}! \u{1F44B}\u{1F60A}\n¡Tenemos excelentes noticias! \u{1F389} Tus lentes ya están listos \u{1F453}\u2728\nPuedes pasar a recogerlos cuando gustes. ¡Te esperamos con mucho gusto! \u{1F499}`;
    const encodedText = encodeURIComponent(message);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const url = isMobile
      ? `https://wa.me/${waPhone}?text=${encodedText}`
      : `https://web.whatsapp.com/send?phone=${waPhone}&text=${encodedText}`;

    window.open(url, '_blank', 'noopener');
  }
}
