import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/utils/error-message';
import { passwordMatchValidator } from '../../core/validators/field-validators';

@Component({
  selector: 'app-change-password-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Cambiar contraseña</h2>
    <mat-dialog-content>
      @if (saving()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <form [formGroup]="form" (ngSubmit)="save()" class="stack" style="margin-top: 8px;">
        <mat-form-field appearance="outline">
          <mat-label>Contraseña actual</mat-label>
          <input
            matInput
            type="password"
            formControlName="current_password"
            autocomplete="current-password"
            maxlength="255"
          />
          <mat-hint>La contraseña con la que ingresaste hoy.</mat-hint>
          @if (form.controls.current_password.touched && form.controls.current_password.invalid) {
            <mat-error>Escribe tu contraseña actual.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nueva contraseña</mat-label>
          <input
            matInput
            type="password"
            formControlName="password"
            autocomplete="new-password"
            maxlength="255"
          />
          <mat-hint>Mínimo 8 caracteres.</mat-hint>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <mat-error>Debe tener al menos 8 caracteres.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Repetir nueva contraseña</mat-label>
          <input
            matInput
            type="password"
            formControlName="password_confirmation"
            autocomplete="new-password"
            maxlength="255"
          />
          <mat-hint>Debe coincidir exactamente con la nueva contraseña.</mat-hint>
          @if (
            form.controls.password_confirmation.touched &&
            form.controls.password_confirmation.invalid
          ) {
            <mat-error>
              @if (form.controls.password_confirmation.errors?.['mismatch']) {
                Las contraseñas no coinciden.
              } @else {
                Repite la nueva contraseña.
              }
            </mat-error>
          }
        </mat-form-field>

        @if (error()) {
          <div class="banner banner--danger">
            <span class="material-icons">error</span>
            <span>{{ error() }}</span>
          </div>
        }

        <div class="btn-row" style="justify-content: flex-end;">
          <button type="button" class="btn btn--outline" (click)="close()">Cancelar</button>
          <button type="submit" class="btn btn--primary" [disabled]="saving()">
            Guardar contraseña
          </button>
        </div>
      </form>
    </mat-dialog-content>
  `,
})
export class ChangePasswordDialogComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    current_password: ['', [Validators.required, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(255)]],
    password_confirmation: ['', [Validators.required, Validators.maxLength(255)]],
  }, { validators: passwordMatchValidator });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (
      this.form.controls.password.value !== this.form.controls.password_confirmation.value
    ) {
      this.form.controls.password_confirmation.setErrors({ mismatch: true });
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.auth.changePassword(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.toast.success(response.message || 'Contraseña actualizada.');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(error, 'No se pudo cambiar la contraseña.'));
      },
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
