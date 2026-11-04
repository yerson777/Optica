import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Client } from '../../../core/models';
import { ClientService } from '../../../core/services/client.service';
import { PrescriptionService } from '../../../core/services/prescription.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/utils/error-message';
import { todayInputDate } from '../../../core/utils/format';
import { notFutureDateValidator } from '../../../core/validators/field-validators';
import { CameraDialogComponent } from '../../../shared/ui/camera-dialog.component';

interface PhotoItem {
  file: File;
  preview: string;
  name: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 8;

@Component({
  selector: 'app-prescription-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './prescription-form.component.html',
  styleUrl: './prescription-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly clients = inject(ClientService);
  private readonly prescriptions = inject(PrescriptionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly client = signal<Client | null>(null);
  readonly photos = signal<PhotoItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly maxPhotos = MAX_PHOTOS;
  readonly today = todayInputDate();

  readonly form = this.fb.nonNullable.group({
    registered_at: [todayInputDate(), [Validators.required, notFutureDateValidator]],
    observations: ['', [Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.router.navigate(['/clientes']);
      return;
    }

    this.clients.get(id).subscribe({
      next: (response) => {
        this.client.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(error, 'No se pudo cargar el cliente.'));
      },
    });
  }

  ngOnDestroy(): void {
    this.photos().forEach((photo) => URL.revokeObjectURL(photo.preview));
  }

  backLink(): Array<string | number> {
    const client = this.client();

    return client ? ['/clientes', client.id] : ['/clientes'];
  }

  openCamera(fallbackInput: HTMLInputElement): void {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.toast.info(
        'Tu navegador no permite abrir la cámara directamente. Usa el selector de fotos.'
      );
      fallbackInput.click();
      return;
    }

    const dialogRef = this.dialog.open<CameraDialogComponent, void, File | null>(
      CameraDialogComponent,
      {
        width: 'min(960px, 96vw)',
        maxWidth: '96vw',
        panelClass: 'app-dialog',
        autoFocus: false,
      }
    );

    dialogRef.afterClosed().subscribe((file) => {
      if (file) {
        this.addFiles([file]);
      }
    });
  }

  onFilesSelected(event: Event, input: HTMLInputElement): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    input.value = '';
    this.addFiles(files);
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const current = this.photos();

    if (current.length + files.length > MAX_PHOTOS) {
      this.toast.error(`Puedes agregar como máximo ${MAX_PHOTOS} fotografías por receta.`);
      return;
    }

    const valid: PhotoItem[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        this.toast.error(
          `"${file.name}" no es un formato permitido. Usa JPG, PNG o WEBP.`
        );
        continue;
      }

      if (file.size > MAX_SIZE) {
        this.toast.error(`"${file.name}" pesa más de 10 MB. Intenta con otra foto.`);
        continue;
      }

      valid.push({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
      });
    }

    if (valid.length) {
      this.photos.update((photos) => [...photos, ...valid]);
    }
  }

  removePhoto(index: number): void {
    this.photos.update((photos) => {
      const copy = [...photos];
      const [removed] = copy.splice(index, 1);

      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }

      return copy;
    });
  }

  submit(): void {
    const client = this.client();

    if (!client) {
      this.error.set('Estamos cargando los datos del cliente. Inténtalo nuevamente en un momento.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.photos().length === 0) {
      this.error.set('Agrega al menos una fotografía de la receta.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('client_id', String(client.id));
    formData.append('registered_at', this.form.controls.registered_at.value);
    formData.append('observations', this.form.controls.observations.value.trim());
    this.photos().forEach((photo) => formData.append('images[]', photo.file, photo.name));

    this.prescriptions.create(formData).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('La receta se guardó correctamente.');
        this.router.navigate(['/clientes', client.id]);
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(error, 'No se pudo guardar la receta.'));
      },
    });
  }
}
