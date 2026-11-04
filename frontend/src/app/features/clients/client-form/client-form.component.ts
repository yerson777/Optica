import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientService } from '../../../core/services/client.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/utils/error-message';
import { formatPhone } from '../../../core/utils/format';
import {
  phoneNumberValidator,
  trimmedRequired,
} from '../../../core/validators/field-validators';

@Component({
  selector: 'app-client-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clients = inject(ClientService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly clientId = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    full_name: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150),
        trimmedRequired,
      ],
    ],
    phone: [
      '',
      [
        Validators.required,
        Validators.maxLength(30),
        Validators.pattern(/^\+?[\d\s()-]{6,20}$/),
        phoneNumberValidator,
      ],
    ],
    observations: ['', [Validators.maxLength(2000)]],
  });

  get isEdit(): boolean {
    return this.clientId() !== null;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id) {
      this.clientId.set(id);
      this.loadClient(id);
    }
  }

  loadClient(id: number): void {
    this.loading.set(true);

    this.clients.get(id).subscribe({
      next: (response) => {
        const client = response.data;
        this.form.patchValue({
          full_name: client.full_name,
          phone: client.phone,
          observations: client.observations ?? '',
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(error, 'No se pudo cargar el cliente.'));
      },
    });
  }

  async submit(confirmDuplicate = false): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const payload = {
      full_name: value.full_name.trim(),
      phone: value.phone.trim(),
      observations: value.observations.trim() || null,
      confirm_duplicate: confirmDuplicate,
    };

    const request = this.isEdit
      ? this.clients.update(this.clientId()!, payload)
      : this.clients.create(payload);

    request.subscribe({
      next: (response) => {
        this.saving.set(false);
        this.toast.success(
          this.isEdit ? 'Los datos del cliente se actualizaron.' : 'El cliente se registró correctamente.'
        );
        this.router.navigate(['/clientes', response.data.id]);
      },
      error: async (error: HttpErrorResponse) => {
        this.saving.set(false);

        if (error.status === 409 && !confirmDuplicate) {
          const duplicates = (error.error?.duplicates ?? []) as Array<{
            full_name: string;
            phone: string;
          }>;

          const list = duplicates
            .map((client) => `• ${client.full_name} (${formatPhone(client.phone)})`)
            .join('\n');

          const proceed = await this.confirm.ask({
            title: 'Posible cliente repetido',
            message:
              'Ya existe un cliente con un nombre o celular parecido:\n\n' +
              list +
              '\n\nSi estás seguro de que es una persona diferente, puedes continuar.',
            confirmText: 'Sí, registrar de todas formas',
            cancelText: 'Revisar datos',
          });

          if (proceed) {
            void this.submit(true);
          }

          return;
        }

        this.error.set(extractErrorMessage(error, 'No se pudo guardar el cliente.'));
      },
    });
  }
}
