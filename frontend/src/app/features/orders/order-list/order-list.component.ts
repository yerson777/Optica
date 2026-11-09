import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MESSAGES } from '../../../core/i18n/messages.es';
import { Order, OrderStatus } from '../../../core/models';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/utils/error-message';
import { formatCurrency, formatPhone } from '../../../core/utils/format';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip.component';

@Component({
  selector: 'app-order-list',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressBarModule,
    StatusChipComponent,
    PaginationComponent,
  ],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListComponent implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly statusFilter = signal<OrderStatus | ''>('');
  readonly searchTerm = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly busyId = signal<number | null>(null);
  readonly pageSize = signal(10);

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');

    if (status && ['pending', 'ready', 'delivered', 'cancelled'].includes(status)) {
      this.statusFilter.set(status as OrderStatus);
    }

    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.orders
      .list({
        status: this.statusFilter(),
        search: this.searchTerm().trim(),
        from: this.dateFrom(),
        to: this.dateTo(),
        page: this.page(),
        per_page: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          this.items.set(response.data);
          this.total.set(response.total);
          this.lastPage.set(response.last_page);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(extractErrorMessage(error, MESSAGES.orders.loadListFallback));
        },
      });
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as OrderStatus | '';
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  onDateChange(kind: 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (kind === 'from') {
      this.dateFrom.set(value);
    } else {
      this.dateTo.set(value);
    }

    this.page.set(1);
    this.load();
  }

  resetFilters(): void {
    this.statusFilter.set('');
    this.searchTerm.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.page.set(1);
    this.load();
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

  open(order: Order): void {
    this.router.navigate(['/pedidos', order.id]);
  }

  async markReady(order: Order): Promise<void> {
    this.busyId.set(order.id);

    this.orders.updateStatus(order.id, 'ready').subscribe({
      next: (response) => {
        this.busyId.set(null);
        this.toast.success(response.message || MESSAGES.orders.readyFallback);
        this.notifications.refreshUnreadCount();
        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractErrorMessage(error, MESSAGES.orders.updateFallback));
      },
    });
  }

  async markDelivered(order: Order): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: MESSAGES.orders.deliveredTitle,
      message: MESSAGES.orders.deliveredMessage(
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

  async deleteOrder(order: Order): Promise<void> {
    if (this.busyId() !== null) {
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

    this.busyId.set(order.id);

    this.orders.destroy(order.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(MESSAGES.orders.deleteSuccess);
        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractErrorMessage(error, MESSAGES.orders.deleteFallback));
      },
    });
  }

  phone(order: Order): string {
    return formatPhone(order.client?.phone);
  }

  money(value: number | string | null): string {
    return formatCurrency(value);
  }
}
