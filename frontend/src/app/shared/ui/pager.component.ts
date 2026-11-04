import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pager',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (lastPage() > 1) {
      <nav class="pager" aria-label="Paginación">
        <button
          type="button"
          class="btn btn--outline btn--sm"
          [disabled]="page() <= 1"
          (click)="go(page() - 1)"
        >
          <mat-icon>chevron_left</mat-icon>
          Anterior
        </button>
        <span class="pager__info">Página {{ page() }} de {{ lastPage() }}</span>
        <button
          type="button"
          class="btn btn--outline btn--sm"
          [disabled]="page() >= lastPage()"
          (click)="go(page() + 1)"
        >
          Siguiente
          <mat-icon>chevron_right</mat-icon>
        </button>
      </nav>
    }
  `,
  styles: [
    `
      .pager {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-top: 20px;
        flex-wrap: wrap;
      }
      .pager__info {
        font-size: 0.84rem;
        color: var(--optic-muted);
      }
      @media (max-width: 480px) {
        .pager {
          gap: 8px;
        }
        .pager .btn {
          flex: 1 1 auto;
        }
      }
    `,
  ],
})
export class PagerComponent {
  readonly page = input.required<number>();
  readonly lastPage = input.required<number>();
  readonly pageChange = output<number>();

  go(target: number): void {
    if (target >= 1 && target <= this.lastPage() && target !== this.page()) {
      this.pageChange.emit(target);
    }
  }
}
