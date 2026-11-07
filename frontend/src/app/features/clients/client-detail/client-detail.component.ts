import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MESSAGES } from '../../../core/i18n/messages.es';
import { Client, Prescription, PrescriptionImage } from '../../../core/models';
import { ClientService } from '../../../core/services/client.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/utils/error-message';
import { formatCurrency, formatPhone } from '../../../core/utils/format';
import { AuthImageComponent } from '../../../shared/ui/auth-image.component';
import {
  ImageViewerData,
  ImageViewerDialogComponent,
} from '../../../shared/ui/image-viewer-dialog.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip.component';

@Component({
  selector: 'app-client-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    StatusChipComponent,
    AuthImageComponent,
    PaginationComponent,
  ],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDetailComponent implements OnInit {
  private readonly clients = inject(ClientService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly client = signal<Client | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly prescriptionsPage = signal(1);
  readonly ordersPage = signal(1);
  readonly prescriptionsLastPage = signal(1);
  readonly ordersLastPage = signal(1);
  readonly pageSize = signal(10);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.router.navigate(['/clientes']);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.clients
      .get(id, {
        paginated: true,
        prescriptionsPage: this.prescriptionsPage(),
        ordersPage: this.ordersPage(),
        perPage: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          this.client.set(response.data);
          this.prescriptionsLastPage.set(
            response.data.prescriptions_pagination?.last_page ?? 1
          );
          this.ordersLastPage.set(response.data.orders_pagination?.last_page ?? 1);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(extractErrorMessage(error, MESSAGES.clients.loadDetailFallback));
        },
      });
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.prescriptionsPage.set(1);
    this.ordersPage.set(1);
    this.load();
  }

  goPrescriptionsPage(page: number): void {
    this.prescriptionsPage.set(page);
    this.load();
    this.scrollTo('recetas');
  }

  goOrdersPage(page: number): void {
    this.ordersPage.set(page);
    this.load();
    this.scrollTo('pedidos');
  }

  private scrollTo(id: string): void {
    setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      80
    );
  }

  get hasPrescriptions(): boolean {
    return (this.client()?.prescriptions_count ?? 0) > 0;
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

  newPrescription(): void {
    const client = this.client();

    if (client) {
      this.router.navigate(['/clientes', client.id, 'recetas', 'nueva']);
    }
  }

  newOrder(prescription?: Prescription): void {
    const client = this.client();

    if (!client) {
      return;
    }

    if (!this.hasPrescriptions) {
      this.toast.info(MESSAGES.clients.prescriptionRequired);
      return;
    }

    this.router.navigate(['/pedidos/nuevo'], {
      queryParams: {
        clientId: client.id,
        ...(prescription ? { prescriptionId: prescription.id } : {}),
      },
    });
  }

  orderCount(prescription: Prescription): number {
    return prescription.orders?.length ?? 0;
  }

  phone(): string {
    return formatPhone(this.client()?.phone);
  }

  money(value: number | string | null | undefined): string {
    return formatCurrency(value);
  }
}
