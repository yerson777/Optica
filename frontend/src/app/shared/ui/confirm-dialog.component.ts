import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MESSAGES } from '../../core/i18n/messages.es';
import { ConfirmOptions } from '../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="confirm-message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn btn--outline" (click)="close(false)">
        {{ data.cancelText || messages.common.cancel }}
      </button>
      <button
        type="button"
        class="btn"
        [class.btn--danger]="data.danger"
        [class.btn--primary]="!data.danger"
        (click)="close(true)"
      >
        {{ data.confirmText || messages.common.accept }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .confirm-message {
        white-space: pre-line;
        color: #4a5b5c;
        margin: 8px 0 4px;
      }
      mat-dialog-content {
        min-width: 0;
      }
      mat-dialog-actions {
        gap: 10px;
        padding-bottom: 8px;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmOptions>(MAT_DIALOG_DATA);
  readonly messages = MESSAGES;
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
