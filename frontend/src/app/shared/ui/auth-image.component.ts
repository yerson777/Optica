import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { MESSAGES } from '../../core/i18n/messages.es';
import { PrescriptionImage } from '../../core/models';
import { ImageService } from '../../core/services/image.service';

@Component({
  selector: 'app-auth-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src()) {
      <img [src]="src()" [alt]="alt" loading="lazy" />
    } @else {
      <div class="auth-image__placeholder">
        <span class="material-icons">{{ failed() ? 'broken_image' : 'image' }}</span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .auth-image__placeholder {
        width: 100%;
        height: 100%;
        min-height: 80px;
        display: grid;
        place-items: center;
        color: #9bb7b7;
        background: #eef4f4;
      }
      .auth-image__placeholder .material-icons {
        font-size: 32px;
      }
    `,
  ],
})
export class AuthImageComponent implements OnChanges, OnDestroy {
  private readonly images = inject(ImageService);
  private subscription?: Subscription;

  @Input({ required: true }) image!: PrescriptionImage;
  @Input() alt: string = MESSAGES.imageViewer.defaultTitle;

  readonly src = signal<string | null>(null);
  readonly failed = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['image'] && this.image) {
      this.subscription?.unsubscribe();
      this.failed.set(false);
      this.subscription = this.images.objectUrl(this.image).subscribe({
        next: (url) => this.src.set(url),
        error: () => this.failed.set(true),
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
