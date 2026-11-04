import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ORDER_STATUS_ICONS, ORDER_STATUS_LABELS, OrderStatus } from '../../core/models';

@Component({
  selector: 'app-status-chip',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="status-chip"
      [class.status-chip--pending]="status() === 'pending'"
      [class.status-chip--ready]="status() === 'ready'"
      [class.status-chip--delivered]="status() === 'delivered'"
      [class.status-chip--cancelled]="status() === 'cancelled'"
    >
      <mat-icon>{{ icon() }}</mat-icon>
      {{ label() }}
    </span>
  `,
})
export class StatusChipComponent {
  readonly status = input.required<OrderStatus>();
  readonly label = computed(() => ORDER_STATUS_LABELS[this.status()] ?? this.status());
  readonly icon = computed(() => ORDER_STATUS_ICONS[this.status()] ?? 'info');
}
