import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Client, Prescription, PrescriptionImage } from '../../../core/models';
import { ClientService } from '../../../core/services/client.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/utils/error-message';
import { formatCurrency, todayInputDate } from '../../../core/utils/format';
import {
  notFutureDateValidator,
  trimmedRequired,
} from '../../../core/validators/field-validators';
import { AuthImageComponent } from '../../../shared/ui/auth-image.component';
import {
  ImageViewerData,
  ImageViewerDialogComponent,
} from '../../../shared/ui/image-viewer-dialog.component';

@Component({
  selector: 'app-order-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule,
    AuthImageComponent,
  ],
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clients = inject(ClientService);
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly client = signal<Client | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly today = todayInputDate();

  readonly lensTypes = [
    'Monofocal',
    'Bifocal',
    'Progresivo',
    'Ocupacional',
    'Fotocromático',
    'Antirreflejo',
    'Lentes de sol',
    'Otro',
  ];

  readonly form = this.fb.group({
    prescription_id: [null as number | null, [Validators.required]],
    lens_type: ['', [Validators.required, Validators.maxLength(100), trimmedRequired]],
    observations: ['', [Validators.maxLength(2000)]],
    price: [null as number | null, [Validators.min(0), Validators.max(999999)]],
    advance: [null as number | null, [Validators.min(0), Validators.max(999999)]],
    ordered_at: [todayInputDate(), [Validators.required, notFutureDateValidator]],
  });

  constructor() {
    this.form.controls.price.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncAdvanceError());

    this.form.controls.advance.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncAdvanceError());
  }

  ngOnInit(): void {
    const clientId = Number(this.route.snapshot.queryParamMap.get('clientId'));
    const prescriptionId = Number(this.route.snapshot.queryParamMap.get('prescriptionId'));

    if (!clientId) {
      this.toast.info('Selecciona primero un cliente para crear su pedido.');
      this.router.navigate(['/clientes']);
      return;
    }

    this.clients.get(clientId).subscribe({
      next: (response) => {
        this.client.set(response.data);
        this.loading.set(false);

        const prescriptions = response.data.prescriptions ?? [];
        const selected = prescriptions.find((item) => item.id === prescriptionId);

        if (selected) {
          this.form.controls.prescription_id.setValue(selected.id);
        } else if (prescriptions.length === 1) {
          this.form.controls.prescription_id.setValue(prescriptions[0].id);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(error, 'No se pudo cargar el cliente.'));
      },
    });
  }

  get prescriptions(): Prescription[] {
    return this.client()?.prescriptions ?? [];
  }

  selectedPrescription(): Prescription | null {
    const id = this.form.controls.prescription_id.value;

    return this.prescriptions.find((prescription) => prescription.id === id) ?? null;
  }

  balance(): number | null {
    const price = this.form.controls.price.value;
    const advance = this.form.controls.advance.value;

    if (price === null || price === undefined) {
      return null;
    }

    return Math.round((Number(price) - Number(advance ?? 0)) * 100) / 100;
  }

  private syncAdvanceError(): void {
    const control = this.form.controls.advance;
    const errors = control.errors ?? {};

    if (this.advanceExceedsPrice()) {
      control.setErrors({ ...errors, exceedsPrice: true });
      return;
    }

    if (errors['exceedsPrice']) {
      const remaining = { ...errors };
      delete remaining['exceedsPrice'];
      control.setErrors(Object.keys(remaining).length > 0 ? remaining : null);
    }
  }

  advanceExceedsPrice(): boolean {
    const price = this.form.controls.price.value;
    const advance = this.form.controls.advance.value;

    return price !== null && advance !== null && Number(advance) > Number(price);
  }

  money(value: number | null | undefined): string {
    return formatCurrency(value);
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

  submit(): void {
    const client = this.client();

    if (!client) {
      return;
    }

    if (this.prescriptions.length === 0) {
      this.error.set('Este cliente todavía no tiene una receta. Registra una antes de crear el pedido.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.advanceExceedsPrice()) {
      this.error.set('El adelanto no puede ser mayor que el precio total.');
      return;
    }

    const value = this.form.getRawValue();

    this.saving.set(true);
    this.error.set(null);

    this.orders
      .create({
        client_id: client.id,
        prescription_id: Number(value.prescription_id),
        lens_type: (value.lens_type ?? '').trim(),
        observations: value.observations?.trim() || null,
        price: value.price === null ? null : Number(value.price),
        advance: value.advance === null ? null : Number(value.advance),
        ordered_at: value.ordered_at ?? todayInputDate(),
      })
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.toast.success(`Pedido #${response.data.id} registrado correctamente.`);
          this.router.navigate(['/pedidos', response.data.id]);
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(extractErrorMessage(error, 'No se pudo registrar el pedido.'));
        },
      });
  }
}
