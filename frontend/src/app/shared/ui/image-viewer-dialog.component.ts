import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MESSAGES } from '../../core/i18n/messages.es';
import { PrescriptionImage } from '../../core/models';
import { ImageService } from '../../core/services/image.service';
import { AuthImageComponent } from './auth-image.component';

export interface ImageViewerData {
  image: PrescriptionImage;
  title?: string;
}

@Component({
  selector: 'app-image-viewer-dialog',
  imports: [MatDialogModule, MatIconModule, AuthImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viewer">
      <div class="viewer__head">
        <div>
          <h2>{{ data.title || messages.imageViewer.defaultTitle }}</h2>
          <p class="small">{{ data.image.original_name }}</p>
        </div>
        <div class="viewer__actions">
          <button type="button" class="btn btn--outline btn--sm" (click)="download()">
            <mat-icon>download</mat-icon>
            {{ messages.imageViewer.download }}
          </button>
          <button type="button" class="btn btn--ghost btn--sm" (click)="close()" aria-label="Cerrar">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
      <div
        class="viewer__stage"
        [class.viewer__stage--zoomed]="zoomed()"
        (click)="zoomed.set(!zoomed())"
      >
        <app-auth-image [image]="data.image" [alt]="data.image.original_name" />
      </div>
      <p class="viewer__hint small">
        {{ zoomed() ? messages.imageViewer.zoomOut : messages.imageViewer.zoomIn }}
      </p>
    </div>
  `,
  styles: [
    `
      .viewer {
        padding: 18px;
      }
      .viewer__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 14px;
      }
      .viewer__head h2 {
        font-size: 1.1rem;
      }
      .viewer__head p {
        color: #6a7d7d;
        margin-top: 2px;
        word-break: break-word;
      }
      .viewer__actions {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-shrink: 0;
      }
      .viewer__stage {
        background: #142424;
        border-radius: 14px;
        overflow: auto;
        height: min(70vh, 720px);
        cursor: zoom-in;
      }
      .viewer__stage app-auth-image {
        height: 100%;
      }
      .viewer__stage ::ng-deep img {
        object-fit: contain !important;
      }
      .viewer__stage--zoomed {
        cursor: zoom-out;
      }
      .viewer__stage--zoomed ::ng-deep img {
        width: auto !important;
        height: auto !important;
        max-width: none;
        min-width: 140%;
      }
      .viewer__hint {
        text-align: center;
        color: #6a7d7d;
        margin-top: 10px;
      }
    `,
  ],
})
export class ImageViewerDialogComponent {
  readonly data = inject<ImageViewerData>(MAT_DIALOG_DATA);
  readonly messages = MESSAGES;
  private readonly dialogRef = inject(MatDialogRef<ImageViewerDialogComponent>);
  private readonly images = inject(ImageService);

  readonly zoomed = signal(false);

  download(): void {
    this.images.download(this.data.image);
  }

  close(): void {
    this.dialogRef.close();
  }
}
