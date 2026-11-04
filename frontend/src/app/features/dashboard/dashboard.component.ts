import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { DashboardData } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../core/utils/error-message';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  route: string;
  tone: string;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, MatIconModule, MatProgressBarModule, StatusChipComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly firstName = computed(() => (this.auth.user()?.name || '').split(' ')[0] || 'equipo');
  readonly today = new Date();

  readonly quickActions: QuickAction[] = [
    {
      label: 'Nuevo cliente',
      description: 'Registra a una persona',
      icon: 'person_add',
      route: '/clientes/nuevo',
      tone: 'teal',
    },
    {
      label: 'Buscar cliente',
      description: 'Encuentra su ficha',
      icon: 'manage_search',
      route: '/clientes',
      tone: 'blue',
    },
    {
      label: 'Pedidos pendientes',
      description: 'Revisa lo que falta',
      icon: 'shopping_bag',
      route: '/pedidos',
      tone: 'orange',
      queryParams: { status: 'pending' },
    },
    {
      label: 'Historial',
      description: 'Consultas anteriores',
      icon: 'history',
      route: '/historial',
      tone: 'violet',
    },
    {
      label: 'Avisos de entrega',
      description: 'Lentes listos',
      icon: 'local_shipping',
      route: '/entregas',
      tone: 'green',
    },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboard.get().subscribe({
      next: (response) => {
        this.data.set(response.data);
        this.loading.set(false);
        this.notifications.refreshUnreadCount();
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(error, 'No se pudo cargar el panel de inicio.'));
      },
    });
  }
}
