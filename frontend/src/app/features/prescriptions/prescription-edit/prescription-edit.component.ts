import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
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
import { Prescription, PrescriptionImage } from '../../../core/models';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ImageService } from '../../../core/services/image.service';
import { PrescriptionService } from '../../../core/services/prescription.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/utils/error-message';
import { todayInputDate } from '../../../core/utils/format';
import { notFutureDateValidator } from '../../../core/validators/field-validators';
import { AuthImageComponent } from '../../../shared/ui/auth-image.component';
import { CameraDialogComponent } from '../../../shared/ui/camera-dialog.component';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 8;

@Component({
  selector: 'app-prescription-edit',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    AuthImageComponent,
  ],
  templateUrl: './prescription-edit.component.html',
  styleUrl: './prescription-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly prescriptions = inject(PrescriptionService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly images = inject(ImageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  @ViewChild('cameraInput') private cameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') private galleryInput?: ElementRef<HTMLInputElement>;

  private prescriptionId = 0;
  private clientId = 0;
  private pendingReplace: PrescriptionImage | null = null;

  readonly prescription = signal<Prescription | null>(null);
  readonly imagesList = computed<PrescriptionImage[]>(() => this.prescription()?.images ?? []);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly busyImageId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly maxPhotos = MAX_PHOTOS;
  readonly today = todayInputDate();

  readonly form = this.fb.nonNullable.group({
    registered_at: [todayInputDate(), [Validators.required, notFutureDateValidator]],
    observations: ['', [Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.clientId = Number(this.route.snapshot.paramMap.get('id'));
    this.prescriptionId = Number(this.route.snapshot.paramMap.get('prescriptionId'));

    if (!this.prescriptionId) {
      this.router.navigate(['/clientes']);
      return;
    }

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.prescriptions.get(this.prescriptionId).subscribe({
      next: (response) => {
        const prescription = response.data;
        this.prescription.set(prescription);
        this.form.setValue({
          registered_at: prescription.registered_at,
          observations: prescription.observations ?? '',
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(error, MESSAGES.prescriptions.editLoadFallback));
      },
    });
  }

  backLink(): Array<string | number> {
    const clientId = this.prescription()?.client?.id ?? this.clientId;

    return clientId ? ['/clientes', clientId] : ['/clientes'];
  }

  openCamera(fallbackInput: HTMLInputElement, replace: PrescriptionImage | null = null): void {
    this.pendingReplace = replace;

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
      const target = this.pendingReplace;
      this.pendingReplace = null;

      if (!file) {
        return;
      }

      if (target) {
        this.replace(target, file);
      } else {
        this.addFiles([file]);
      }
    });
  }

  changePhoto(image: PrescriptionImage, fallbackInput: HTMLInputElement): void {
    this.openCamera(fallbackInput, image);
  }

  onFilesSelected(event: Event, input: HTMLInputElement): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    input.value = '';
    const target = this.pendingReplace;
    this.pendingReplace = null;

    if (target) {
      if (files[0]) {
        this.replace(target, files[0]);
      }
      return;
    }

    this.addFiles(files);
  }

  async confirmRemove(image: PrescriptionImage): Promise<void> {
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

    this.busyImageId.set(image.id);

    this.prescriptions.deleteImage(this.prescriptionId, image.id).subscribe({
      next: (response) => {
        this.busyImageId.set(null);
        this.images.forget(image.id);
        this.prescription.update((current) =>
          current ? { ...current, images: response.data.images } : current
        );
        this.toast.success(MESSAGES.prescriptions.imageDeleteSuccess);
      },
      error: (error) => {
        this.busyImageId.set(null);
        this.error.set(extractErrorMessage(error, MESSAGES.prescriptions.imageDeleteFallback));
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.saving.set(true);
    this.error.set(null);

    this.prescriptions
      .update(this.prescriptionId, {
        registered_at: value.registered_at,
        observations: value.observations.trim() || null,
      })
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.prescription.update((current) =>
            current ? { ...current, ...response.data } : response.data
          );
          this.toast.success(MESSAGES.prescriptions.updateSuccess);
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(extractErrorMessage(error, MESSAGES.prescriptions.updateFallback));
        },
      });
  }

  async deletePrescription(): Promise<void> {
    const prescription = this.prescription();

    if (!prescription) {
      return;
    }

    if ((prescription.orders?.length ?? 0) > 0) {
      this.toast.info(MESSAGES.prescriptions.deleteBlockedOrders);
      return;
    }

    const confirmed = await this.confirm.ask({
      title: MESSAGES.prescriptions.deleteConfirmTitle,
      message: MESSAGES.prescriptions.deleteConfirmMessage,
      confirmText: MESSAGES.prescriptions.deleteConfirmText,
      cancelText: MESSAGES.prescriptions.deleteCancelText,
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.prescriptions.delete(prescription.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.imagesList().forEach((image) => this.images.forget(image.id));
        this.toast.success(MESSAGES.prescriptions.deleteSuccess);
        this.router.navigate(this.backLink());
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(error, MESSAGES.prescriptions.deleteFallback));
      },
    });
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    if (this.imagesList().length + files.length > MAX_PHOTOS) {
      this.toast.error(MESSAGES.prescriptions.maxPhotos(MAX_PHOTOS));
      return;
    }

    const valid: File[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        this.toast.error(MESSAGES.prescriptions.invalidFormat(file.name));
        continue;
      }

      if (file.size > MAX_SIZE) {
        this.toast.error(MESSAGES.prescriptions.tooLarge(file.name));
        continue;
      }

      valid.push(file);
    }

    if (!valid.length) {
      return;
    }

    const formData = new FormData();
    valid.forEach((file) => formData.append('images[]', file, file.name));

    this.saving.set(true);

    this.prescriptions.addImages(this.prescriptionId, formData).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.prescription.update((current) =>
          current ? { ...current, images: response.data.images } : current
        );
        this.toast.success(MESSAGES.prescriptions.imageAddSuccess);
        this.resetInputs();
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(error, MESSAGES.prescriptions.imageAddFallback));
      },
    });
  }

  private replace(image: PrescriptionImage, file: File): void {
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.toast.error(MESSAGES.prescriptions.invalidFormat(file.name));
      return;
    }

    if (file.size > MAX_SIZE) {
      this.toast.error(MESSAGES.prescriptions.tooLarge(file.name));
      return;
    }

    const formData = new FormData();
    formData.append('image', file, file.name);

    this.busyImageId.set(image.id);

    this.prescriptions.replaceImage(this.prescriptionId, image.id, formData).subscribe({
      next: (response) => {
        this.busyImageId.set(null);
        this.images.forget(image.id);
        this.prescription.update((current) =>
          current ? { ...current, images: response.data.images } : current
        );
        this.toast.success(MESSAGES.prescriptions.imageReplaceSuccess);
        this.resetInputs();
      },
      error: (error) => {
        this.busyImageId.set(null);
        this.error.set(extractErrorMessage(error, MESSAGES.prescriptions.imageReplaceFallback));
      },
    });
  }

  private resetInputs(): void {
    if (this.cameraInput) {
      this.cameraInput.nativeElement.value = '';
    }

    if (this.galleryInput) {
      this.galleryInput.nativeElement.value = '';
    }
  }
}
