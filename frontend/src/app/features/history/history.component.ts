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
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MESSAGES } from '../../core/i18n/messages.es';
import {
  Client,
  Order,
  OrderStatus,
  Prescription,
  PrescriptionImage,
} from '../../core/models';
import { ClientService } from '../../core/services/client.service';
import { OrderService } from '../../core/services/order.service';
import { PrescriptionService } from '../../core/services/prescription.service';
import { ToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/utils/error-message';
import { formatCurrency, formatPhone } from '../../core/utils/format';
import { AuthImageComponent } from '../../shared/ui/auth-image.component';
import {
  ImageViewerData,
  ImageViewerDialogComponent,
} from '../../shared/ui/image-viewer-dialog.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';

type HistoryTab = 'orders' | 'prescriptions' | 'clients';

@Component({
  selector: 'app-history',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressBarModule,
    StatusChipComponent,
    AuthImageComponent,
    PaginationComponent,
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent implements OnInit {
  private readonly ordersService = inject(OrderService);
  private readonly prescriptionsService = inject(PrescriptionService);
  private readonly clientsService = inject(ClientService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<HistoryTab>('orders');
  readonly orders = signal<Order[]>([]);
  readonly prescriptions = signal<Prescription[]>([]);
  readonly clients = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly pageSize = signal(10);
  readonly searchTerm = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly statusFilter = signal<OrderStatus | ''>('');

  readonly tabs: Array<{ id: HistoryTab; label: string; icon: string }> = [
    { id: 'orders', label: 'Pedidos', icon: 'shopping_bag' },
    { id: 'prescriptions', label: 'Recetas', icon: 'description' },
    { id: 'clients', label: 'Clientes', icon: 'groups' },
  ];

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
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
      this.activeTab.set('orders');
    }

    this.load();
  }

  load(): void {
    const tab = this.activeTab();
    this.loading.set(true);

    if (tab === 'orders') {
      this.ordersService
        .list({
          search: this.searchTerm().trim(),
          from: this.dateFrom(),
          to: this.dateTo(),
          status: this.statusFilter(),
          page: this.page(),
            per_page: this.pageSize(),
        })
        .subscribe({
          next: (response) => {
            if (this.activeTab() !== 'orders') {
              return;
            }
            this.orders.set(response.data);
            this.total.set(response.total);
            this.lastPage.set(response.last_page);
            this.loading.set(false);
          },
          error: (error) => this.fail(error),
        });

      return;
    }

    if (tab === 'prescriptions') {
      this.prescriptionsService
        .list({
          search: this.searchTerm().trim(),
          from: this.dateFrom(),
          to: this.dateTo(),
          page: this.page(),
            per_page: this.pageSize(),
        })
        .subscribe({
          next: (response) => {
            if (this.activeTab() !== 'prescriptions') {
              return;
            }
            this.prescriptions.set(response.data);
            this.total.set(response.total);
            this.lastPage.set(response.last_page);
            this.loading.set(false);
          },
          error: (error) => this.fail(error),
        });

      return;
    }

    this.clientsService
      .list({
        search: this.searchTerm().trim(),
        from: this.dateFrom(),
        to: this.dateTo(),
        page: this.page(),
        per_page: 15,
      })
      .subscribe({
        next: (response) => {
          if (this.activeTab() !== 'clients') {
            return;
          }
          this.clients.set(response.data);
          this.total.set(response.total);
          this.lastPage.set(response.last_page);
          this.loading.set(false);
        },
        error: (error) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    this.loading.set(false);
    this.toast.error(extractErrorMessage(error, MESSAGES.history.loadFallback));
  }

  changeTab(tab: HistoryTab): void {
    if (tab === this.activeTab()) {
      return;
    }

    this.activeTab.set(tab);
    this.page.set(1);
    this.searchTerm.set('');
    this.statusFilter.set('');
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

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as OrderStatus | '');
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.statusFilter.set('');
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

  openOrder(order: Order): void {
    this.router.navigate(['/pedidos', order.id]);
  }

  openClient(client: Client | { id: number }): void {
    this.router.navigate(['/clientes', client.id]);
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

  phone(phone: string | null | undefined): string {
    return formatPhone(phone);
  }

  money(value: number | string | null): string {
    return formatCurrency(value);
  }
}
