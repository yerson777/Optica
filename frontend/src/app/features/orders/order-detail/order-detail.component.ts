import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MESSAGES } from '../../../core/i18n/messages.es';
import {
  ORDER_STATUS_LABELS,
  Order,
  OrderStatus,
  PrescriptionImage,
} from '../../../core/models';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/utils/error-message';
import { formatCurrency, formatPhone, formatWhatsAppNumber } from '../../../core/utils/format';
import { AuthImageComponent } from '../../../shared/ui/auth-image.component';
import {
  ImageViewerData,
  ImageViewerDialogComponent,
} from '../../../shared/ui/image-viewer-dialog.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip.component';

@Component({
  selector: 'app-order-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressBarModule,
    StatusChipComponent,
    AuthImageComponent,
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.router.navigate(['/pedidos']);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.orders.get(id).subscribe({
      next: (response) => {
        this.order.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(error, MESSAGES.orders.loadFallback));
      },
    });
  }

  phone(order: Order): string {
    return formatPhone(order.client?.phone);
  }

  money(value: number | string | null): string {
    return formatCurrency(value);
  }

  statusLabel(status: OrderStatus | null): string {
    return status ? ORDER_STATUS_LABELS[status] : MESSAGES.orders.created;
  }

  openImage(image: PrescriptionImage, title?: string): void {
    this.dialog.open<ImageViewerDialogComponent, ImageViewerData>(
      ImageViewerDialogComponent,
      {
        data: { image, title },
        width: 'min(1000px, 94vw)',
        maxWidth: '94vw',
        panelClass: 'app-dialog',
        autoFocus: false,
      }
    );
  }

  async markReady(): Promise<void> {
    await this.changeStatus(
      'ready',
      MESSAGES.orders.markReadyTitle,
      MESSAGES.orders.markReadyMessage,
      MESSAGES.orders.markReadyConfirm,
      false
    );
  }

  async markDelivered(): Promise<void> {
    await this.changeStatus(
      'delivered',
      MESSAGES.orders.markDeliveredTitle,
      MESSAGES.orders.markDeliveredMessage,
      MESSAGES.orders.deliveredConfirm,
      false
    );
  }

  async backToPending(): Promise<void> {
    await this.changeStatus(
      'pending',
      MESSAGES.orders.backToPendingTitle,
      MESSAGES.orders.backToPendingMessage,
      MESSAGES.orders.backToPendingConfirm,
      false
    );
  }

  async cancel(): Promise<void> {
    const order = this.order();

    if (!order) {
      return;
    }

    await this.changeStatus(
      'cancelled',
      MESSAGES.orders.cancelTitle,
      MESSAGES.orders.cancelMessageFor(order.id, order.client?.full_name ?? ''),
      MESSAGES.orders.cancelConfirm,
      true
    );
  }

  async delete(): Promise<void> {
    const order = this.order();

    if (!order) {
      return;
    }

    const confirmed = await this.confirm.ask({
      title: MESSAGES.orders.deleteTitle,
      message: MESSAGES.orders.deleteMessageFor(
        order.id,
        order.client?.full_name ?? ''
      ),
      confirmText: MESSAGES.orders.deleteConfirm,
      cancelText: MESSAGES.common.cancel,
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.busy.set(true);

    this.orders.destroy(order.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(MESSAGES.orders.deleteSuccess);
        this.router.navigate(['/pedidos']);
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(
          extractErrorMessage(error, MESSAGES.orders.deleteFallback)
        );
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

  private async changeStatus(
    status: OrderStatus,
    title: string,
    message: string,
    confirmText: string,
    danger: boolean
  ): Promise<void> {
    const order = this.order();

    if (!order || this.busy()) {
      return;
    }

    const confirmed = await this.confirm.ask({
      title,
      message,
      confirmText,
      cancelText: MESSAGES.common.cancel,
      danger,
    });

    if (!confirmed) {
      return;
    }

    this.busy.set(true);

    this.orders.updateStatus(order.id, status).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.order.set(response.data);
        this.toast.success(
          response.message ||
            (status === 'cancelled' ? MESSAGES.orders.cancelSuccess : MESSAGES.orders.updatedFallback)
        );
        this.notifications.refreshUnreadCount();
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(
          extractErrorMessage(
            error,
            status === 'cancelled' ? MESSAGES.orders.cancelFallback : MESSAGES.orders.updateFallback
          )
        );
        this.load();
      },
    });
  }
}
