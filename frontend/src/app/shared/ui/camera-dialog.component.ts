import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MESSAGES } from '../../core/i18n/messages.es';

type FacingMode = 'environment' | 'user';

@Component({
  selector: 'app-camera-dialog',
  imports: [MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="camera">
      <div class="camera__head">
        <div>
          <h2>{{ messages.camera.title }}</h2>
          <p class="muted small">{{ messages.camera.instruction }}</p>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" (click)="close()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      @if (error()) {
        <div class="banner banner--danger">
          <span class="material-icons">error</span>
          <span>{{ error() }}</span>
        </div>
      }

      <div class="camera__stage">
        <video #video autoplay playsinline muted (loadedmetadata)="onMetadata()"></video>

        @if (starting()) {
          <div class="camera__overlay">
            <mat-progress-bar mode="indeterminate" />
            <p>{{ messages.camera.opening }}</p>
          </div>
        } @else if (!error()) {
          <div class="camera__frame" aria-hidden="true"></div>
        }
      </div>

      <div class="camera__actions">
        <button type="button" class="btn btn--outline" (click)="close()">
          {{ messages.common.cancel }}
        </button>

        @if (canSwitch() && !error()) {
          <button type="button" class="btn btn--soft" (click)="switchCamera()">
            <mat-icon>cameraswitch</mat-icon>
            {{ messages.camera.switchCamera }}
          </button>
        }

        <button
          type="button"
          class="btn btn--primary"
          [disabled]="!videoReady() || starting() || capturing() || !!error()"
          (click)="capture()"
        >
          <mat-icon>photo_camera</mat-icon>
          {{ capturing() ? messages.camera.capturing : messages.camera.capture }}
        </button>
      </div>

      <p class="camera__hint small muted">{{ messages.camera.hint }}</p>
    </div>
  `,
  styles: [
    `
      .camera {
        padding: 18px;
      }
      .camera__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        margin-bottom: 12px;
      }
      .camera__head h2 {
        font-size: 1.15rem;
        margin-bottom: 2px;
      }
      .camera__stage {
        position: relative;
        background: #102020;
        border-radius: 15px;
        overflow: hidden;
        aspect-ratio: 16 / 10;
        max-height: 62vh;
        display: grid;
        place-items: center;
      }
      video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      .camera__overlay {
        position: absolute;
        inset: 0;
        background: rgba(16, 32, 32, 0.72);
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        text-align: center;
      }
      .camera__overlay mat-progress-bar {
        width: min(240px, 70%);
      }
      .camera__frame {
        position: absolute;
        inset: 9% 7%;
        border: 2px dashed rgba(255, 255, 255, 0.75);
        border-radius: 12px;
        pointer-events: none;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.12);
      }
      .camera__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 14px;
        flex-wrap: wrap;
      }
      .camera__hint {
        margin-top: 9px;
        text-align: right;
      }
      @media (max-width: 600px) {
        .camera {
          padding: 12px;
        }
        .camera__stage {
          aspect-ratio: 3 / 4;
        }
        .camera__actions {
          flex-direction: column-reverse;
        }
        .camera__actions .btn {
          width: 100%;
        }
        .camera__hint {
          text-align: center;
        }
      }
    `,
  ],
})
export class CameraDialogComponent implements AfterViewInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<CameraDialogComponent, File | null>);

  readonly messages = MESSAGES;

  @ViewChild('video') private videoRef?: ElementRef<HTMLVideoElement>;

  private stream: MediaStream | null = null;
  private facingMode: FacingMode = 'environment';
  private requestId = 0;
  private isClosing = false;

  readonly error = signal<string | null>(null);
  readonly starting = signal(true);
  readonly videoReady = signal(false);
  readonly canSwitch = signal(false);
  readonly capturing = signal(false);

  ngAfterViewInit(): void {
    void this.startCamera();
  }

  ngOnDestroy(): void {
    this.isClosing = true;
    this.requestId++;
    this.stopCamera();
  }

  onMetadata(): void {
    this.videoReady.set(true);
  }

  async switchCamera(): Promise<void> {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    await this.startCamera();
  }

  close(): void {
    this.isClosing = true;
    this.requestId++;
    this.stopCamera();
    this.dialogRef.close(null);
  }

  async capture(): Promise<void> {
    const video = this.videoRef?.nativeElement;

    if (!video || !video.videoWidth || !video.videoHeight) {
      this.error.set(MESSAGES.camera.notReady);
      return;
    }

    this.capturing.set(true);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      this.capturing.set(false);
      this.error.set(MESSAGES.camera.processError);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        this.capturing.set(false);

        if (!blob) {
          this.error.set(MESSAGES.camera.generateError);
          return;
        }

        const file = new File([blob], `receta-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        this.stopCamera();
        this.dialogRef.close(file);
      },
      'image/jpeg',
      0.95
    );
  }

  private async startCamera(): Promise<void> {
    const requestId = ++this.requestId;
    this.stopCamera();
    this.error.set(null);
    this.starting.set(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.starting.set(false);
      this.error.set(MESSAGES.camera.unsupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: this.facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      if (this.isClosing || requestId !== this.requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.stream = stream;

      const video = this.videoRef?.nativeElement;

      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);

        if (video.readyState >= 1) {
          this.videoReady.set(true);
        }
      }

      const devices = await navigator.mediaDevices
        .enumerateDevices()
        .catch(() => [] as MediaDeviceInfo[]);

      this.canSwitch.set(
        devices.filter((device) => device.kind === 'videoinput').length > 1
      );
    } catch (error) {
      if (!this.isClosing && requestId === this.requestId) {
        this.error.set(this.cameraErrorMessage(error));
      }
    } finally {
      if (requestId === this.requestId) {
        this.starting.set(false);
      }
    }
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    const video = this.videoRef?.nativeElement;

    if (video) {
      video.srcObject = null;
    }

    this.videoReady.set(false);
  }

  private cameraErrorMessage(error: unknown): string {
    const name = error instanceof DOMException ? error.name : '';

    switch (name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return MESSAGES.camera.permissionDenied;
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return MESSAGES.camera.notFound;
      case 'NotReadableError':
      case 'TrackStartError':
        return MESSAGES.camera.inUse;
      default:
        return MESSAGES.camera.openError;
    }
  }
}
