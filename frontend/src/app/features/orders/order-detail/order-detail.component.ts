import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { formatCurrency, formatPhone } from '../../../core/utils/format';
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
        this.error.set(extractErrorMessage(error, 'No se pudo cargar el pedido.'));
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
    return status ? ORDER_STATUS_LABELS[status] : 'Creado';
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
      'Marcar listo para entregar',
      'El pedido pasará a la lista de entregas. ¿Deseas continuar?',
      'Sí, marcar listo',
      false
    );
  }

  async markDelivered(): Promise<void> {
    await this.changeStatus(
      'delivered',
      'Marcar como entregado',
      '¿Confirmas que los lentes ya fueron entregados al cliente?\n\nSe guardará la fecha, la hora y el usuario responsable.',
      'Sí, marcar entregado',
      false
    );
  }

  async backToPending(): Promise<void> {
    await this.changeStatus(
      'pending',
      'Volver a pendiente',
      'El pedido volverá a la lista de pendientes. ¿Deseas continuar?',
      'Sí, volver a pendiente',
      false
    );
  }

  async cancel(): Promise<void> {
    await this.changeStatus(
      'cancelled',
      'Cancelar pedido',
      'El pedido quedará registrado como cancelado y no se borrará del historial.\n\n¿Deseas continuar?',
      'Sí, cancelar pedido',
      true
    );
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
      cancelText: 'Volver',
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
        this.toast.success(response.message || 'Pedido actualizado.');
        this.notifications.refreshUnreadCount();
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(extractErrorMessage(error, 'No se pudo actualizar el pedido.'));
        this.load();
      },
    });
  }
}
