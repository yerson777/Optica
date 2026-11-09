import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clients/client-list/client-list.component').then(
            (m) => m.ClientListComponent
          ),
      },
      {
        path: 'clientes/nuevo',
        loadComponent: () =>
          import('./features/clients/client-form/client-form.component').then(
            (m) => m.ClientFormComponent
          ),
      },
      {
        path: 'clientes/:id',
        loadComponent: () =>
          import('./features/clients/client-detail/client-detail.component').then(
            (m) => m.ClientDetailComponent
          ),
      },
      {
        path: 'clientes/:id/editar',
        loadComponent: () =>
          import('./features/clients/client-form/client-form.component').then(
            (m) => m.ClientFormComponent
          ),
      },
      {
        path: 'clientes/:id/recetas/nueva',
        loadComponent: () =>
          import('./features/prescriptions/prescription-form/prescription-form.component').then(
            (m) => m.PrescriptionFormComponent
          ),
      },
      {
        path: 'clientes/:id/recetas/:prescriptionId/editar',
        loadComponent: () =>
          import('./features/prescriptions/prescription-edit/prescription-edit.component').then(
            (m) => m.PrescriptionEditComponent
          ),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./features/orders/order-list/order-list.component').then(
            (m) => m.OrderListComponent
          ),
      },
      {
        path: 'pedidos/nuevo',
        loadComponent: () =>
          import('./features/orders/order-form/order-form.component').then(
            (m) => m.OrderFormComponent
          ),
      },
      {
        path: 'pedidos/:id',
        loadComponent: () =>
          import('./features/orders/order-detail/order-detail.component').then(
            (m) => m.OrderDetailComponent
          ),
      },
      {
        path: 'entregas',
        loadComponent: () =>
          import('./features/deliveries/deliveries.component').then(
            (m) => m.DeliveriesComponent
          ),
      },
      {
        path: 'avisos',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent
          ),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./features/history/history.component').then((m) => m.HistoryComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
