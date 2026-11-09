import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
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
import { MESSAGES } from '../../../core/i18n/messages.es';
import { Client } from '../../../core/models';
import { ClientService } from '../../../core/services/client.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
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
  private readonly confirm = inject(ConfirmDialogService);

  @ViewChild('cameraInput') private cameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') private galleryInput?: ElementRef<HTMLInputElement>;

  private replaceIndex: number | null = null;

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
        this.error.set(extractErrorMessage(error, MESSAGES.clients.loadFallback));
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

  openCamera(fallbackInput: HTMLInputElement, replaceIndex: number | null = null): void {
    this.replaceIndex = replaceIndex;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.toast.info(MESSAGES.prescriptions.browserCameraUnavailable);
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
      const target = this.replaceIndex;
      this.replaceIndex = null;

      if (!file) {
        return;
      }

      if (target === null) {
        this.addFiles([file]);
      } else {
        this.replaceFile(target, file);
      }
    });
  }

  changePhoto(index: number, fallbackInput: HTMLInputElement): void {
    this.openCamera(fallbackInput, index);
  }

  onFilesSelected(event: Event, input: HTMLInputElement): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    input.value = '';
    const target = this.replaceIndex;
    this.replaceIndex = null;

    if (target !== null) {
      if (files[0]) {
        this.replaceFile(target, files[0]);
      }
      return;
    }

    this.addFiles(files);
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const current = this.photos();

    if (current.length + files.length > MAX_PHOTOS) {
      this.toast.error(MESSAGES.prescriptions.maxPhotos(MAX_PHOTOS));
      return;
    }

    const valid: PhotoItem[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        this.toast.error(MESSAGES.prescriptions.invalidFormat(file.name));
        continue;
      }

      if (file.size > MAX_SIZE) {
        this.toast.error(MESSAGES.prescriptions.tooLarge(file.name));
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

  private replaceFile(index: number, file: File): void {
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.toast.error(MESSAGES.prescriptions.invalidFormat(file.name));
      return;
    }

    if (file.size > MAX_SIZE) {
      this.toast.error(MESSAGES.prescriptions.tooLarge(file.name));
      return;
    }

    const existing = this.photos()[index];

    if (!existing) {
      return;
    }

    const replacement: PhotoItem = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    };

    URL.revokeObjectURL(existing.preview);
    this.photos.update((photos) =>
      photos.map((photo, position) => (position === index ? replacement : photo))
    );
    this.resetInputs();
  }

  async confirmRemove(index: number): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Eliminar foto',
      message: '¿Eliminar esta foto?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.removePhoto(index);
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
    this.resetInputs();
  }

  private resetInputs(): void {
    if (this.cameraInput) {
      this.cameraInput.nativeElement.value = '';
    }

    if (this.galleryInput) {
      this.galleryInput.nativeElement.value = '';
    }
  }

  submit(): void {
    const client = this.client();

    if (!client) {
      this.error.set(MESSAGES.prescriptions.clientLoading);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.photos().length === 0) {
      this.error.set(MESSAGES.prescriptions.photoRequired);
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
        this.toast.success(MESSAGES.prescriptions.saveSuccess);
        this.router.navigate(['/clientes', client.id]);
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(error, MESSAGES.prescriptions.saveFallback));
      },
    });
  }
}
