import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterModule } from '@angular/router';
import { Order } from '../../core/models';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/utils/error-message';
import { formatPhone } from '../../core/utils/format';
import { PagerComponent } from '../../shared/ui/pager.component';

@Component({
  selector: 'app-deliveries',
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressBarModule, PagerComponent],
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
  readonly pageSize = 12;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.orders
      .list({
        status: 'ready',
        page: this.page(),
        per_page: this.pageSize,
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
          this.toast.error(extractErrorMessage(error, 'No se pudieron cargar las entregas.'));
        },
      });
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
      title: 'Confirmar entrega',
      message: `¿Confirmas que el pedido #${order.id} de ${order.client?.full_name} fue entregado?\n\nSe guardará la fecha, la hora y tu usuario como responsable.`,
      confirmText: 'Sí, marcar entregado',
      cancelText: 'Cancelar',
    });

    if (!confirmed) {
      return;
    }

    this.busyId.set(order.id);

    this.orders.updateStatus(order.id, 'delivered').subscribe({
      next: (response) => {
        this.busyId.set(null);
        this.toast.success(response.message || 'Pedido entregado.');
        this.notifications.refreshUnreadCount();

        if (this.items().length === 1 && this.page() > 1) {
          this.page.update((page) => page - 1);
        }

        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractErrorMessage(error, 'No se pudo marcar como entregado.'));
      },
    });
  }
}
