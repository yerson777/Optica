import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() === 0) {
      <div class="pagination__empty">No se encontraron registros.</div>
    } @else {
      <nav class="pagination" aria-label="Paginación">
        <div class="pagination__info">
          Mostrando {{ from() }}-{{ to() }} de {{ total() }} registros
        </div>

        <div class="pagination__controls">
          <label class="pagination__size-label">Mostrar</label>
          <select
            class="pagination__size"
            [value]="pageSize()"
            (change)="setSize($any($event.target).value)"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          <label class="pagination__size-label">por página</label>

          <button
            type="button"
            class="btn btn--outline btn--sm"
            [disabled]="page() <= 1"
            (click)="go(page() - 1)"
          >
            <mat-icon>chevron_left</mat-icon>
            Anterior
          </button>

          @for (p of pages(); track p) {
            @if (p === -1) {
              <span class="pagination__ellipsis">…</span>
            } @else {
              <button
                type="button"
                class="btn btn--outline btn--sm"
                [class.btn--primary]="page() === p"
                [disabled]="page() === p"
                (click)="go(p)"
              >
                {{ p }}
              </button>
            }
          }

          <button
            type="button"
            class="btn btn--outline btn--sm"
            [disabled]="page() >= lastPage()"
            (click)="go(page() + 1)"
          >
            Siguiente
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </nav>
    }
  `,
  styles: [
    `
      .pagination {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 20px;
        font-size: 0.88rem;
      }

      .pagination__info {
        color: var(--optic-muted);
      }

      .pagination__controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .pagination__size-label {
        color: var(--optic-muted);
        font-size: 0.82rem;
        white-space: nowrap;
      }

      .pagination__size {
        font-size: 0.82rem;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid var(--optic-border);
        background: #fff;
        color: var(--optic-text);
        cursor: pointer;
      }

      .pagination__ellipsis {
        color: var(--optic-muted);
        font-size: 0.9rem;
        padding: 0 4px;
      }

      .pagination__empty {
        color: var(--optic-muted);
        font-size: 0.88rem;
        margin-top: 16px;
        text-align: center;
      }

      @media (max-width: 600px) {
        .pagination {
          gap: 10px;
        }
        .pagination__controls {
          flex-direction: column;
          align-items: stretch;
        }
        .pagination__size-label {
          display: none;
        }
        .pagination__size {
          width: 100%;
        }
        .pagination button {
          flex: 1;
          justify-content: center;
        }
      }
    `,
  ],
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly lastPage = input<number>(1);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly from = computed(() => {
    if (this.total() === 0) {
      return 0;
    }
    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  readonly pages = computed(() => {
    const last = Math.max(1, this.lastPage());
    const current = Math.max(1, Math.min(this.page(), last));
    const show = 2;
    const pages: (number | string)[] = [];
    let start = Math.max(1, current - show);
    let end = Math.min(last, current + show);

    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push('…');
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < last) {
      if (end < last - 1) {
        pages.push('…');
      }
      pages.push(last);
    }

    return pages as number[];
  });

  go(target: number): void {
    const last = Math.max(1, this.lastPage());
    if (target >= 1 && target <= last && target !== this.page()) {
      this.pageChange.emit(target);
    }
  }

  setSize(value: unknown): void {
    const size = Number(value);
    if ([10, 20, 50].includes(size) && size !== this.pageSize()) {
      this.pageSizeChange.emit(size);
    }
  }
}
