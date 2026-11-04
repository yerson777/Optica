import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, finalize, of, switchMap, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client, Paginated } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ClientService } from '../../core/services/client.service';
import { ImageService } from '../../core/services/image.service';
import { NotificationService } from '../../core/services/notification.service';
import { PwaService } from '../../core/services/pwa.service';
import { ToastService } from '../../core/services/toast.service';
import { ChangePasswordDialogComponent } from './change-password-dialog.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatListModule,
    MatProgressBarModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationService);
  private readonly clients = inject(ClientService);
  private readonly images = inject(ImageService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  readonly pwa = inject(PwaService);
  readonly user = this.auth.user;
  readonly isMobile = toSignal(
    this.breakpoint.observe('(max-width: 900px)').pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  readonly sidenavOpen = signal(true);
  readonly currentUrl = signal(this.router.url);

  readonly navItems: NavItem[] = [
    { label: 'Inicio', icon: 'dashboard', route: '/inicio' },
    { label: 'Nuevo cliente', icon: 'person_add', route: '/clientes/nuevo' },
    { label: 'Buscar cliente', icon: 'manage_search', route: '/clientes' },
    { label: 'Pedidos', icon: 'shopping_bag', route: '/pedidos' },
    { label: 'Avisos de entrega', icon: 'local_shipping', route: '/entregas' },
    { label: 'Historial', icon: 'history', route: '/historial' },
    { label: 'Avisos', icon: 'notifications', route: '/avisos' },
    { label: 'Crear usuario', icon: 'group_add', route: '/usuarios' },
  ];

  readonly searching = signal(false);
  readonly results = signal<Client[]>([]);
  readonly showResults = signal(false);
  readonly searchTerm = signal('');
  readonly unreadCount = this.notifications.unreadCount;
  private readonly searchSubject = new Subject<string>();

  constructor() {
    effect(() => {
      this.sidenavOpen.set(!this.isMobile());
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.trim() === '') {
            return of({
              current_page: 1,
              data: [],
              last_page: 1,
              per_page: 6,
              total: 0,
            } as Paginated<Client>);
          }

          this.searching.set(true);

          return this.clients.list({ search: term, per_page: 6 }).pipe(
            finalize(() => this.searching.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.results.set(response.data);
          this.showResults.set(true);
        },
        error: () => {
          this.results.set([]);
          this.searching.set(false);
        },
      });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeResults();
        this.notifications.refreshUnreadCount();

        if (this.isMobile()) {
          this.sidenavOpen.set(false);
        }
      });

    timer(0, 60000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.notifications.refreshUnreadCount());
  }

  isActive(item: NavItem): boolean {
    const url = this.currentUrl().split('?')[0];

    if (item.route === '/clientes') {
      return url.startsWith('/clientes') && !url.startsWith('/clientes/nuevo');
    }

    if (item.route === '/clientes/nuevo') {
      return url.startsWith('/clientes/nuevo');
    }

    return url === item.route || url.startsWith(item.route + '/');
  }

  toggleSidenav(): void {
    this.sidenavOpen.update((open) => !open);
  }

  onSearchInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);

    if (term.trim() === '') {
      this.results.set([]);
      this.showResults.set(false);
      return;
    }

    this.searchSubject.next(term);
  }

  onSearchFocus(): void {
    if (this.results().length || this.searchTerm().trim() !== '') {
      this.showResults.set(true);
    }
  }

  onSearchBlur(): void {
    setTimeout(() => this.showResults.set(false), 180);
  }

  submitGlobalSearch(): void {
    const term = this.searchTerm().trim();

    if (term === '') {
      return;
    }

    this.router.navigate(['/clientes'], { queryParams: { q: term } });
  }

  selectClient(client: Client): void {
    this.router.navigate(['/clientes', client.id]);
    this.clearSearch();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.results.set([]);
    this.showResults.set(false);
  }

  closeResults(): void {
    this.showResults.set(false);
  }

  openSearchPage(): void {
    this.router.navigate(['/clientes'], { queryParams: { focus: 1 } });
  }

  goToNotifications(): void {
    this.router.navigate(['/avisos']);
  }

  changePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, {
      width: '430px',
      maxWidth: '92vw',
      panelClass: 'app-dialog',
      autoFocus: false,
    });
  }

  onInstallClick(): void {
    if (this.isMobile()) {
      this.sidenavOpen.set(false);
    }

    void this.installApp();
  }

  async installApp(): Promise<void> {
    if (this.pwa.installed()) {
      return;
    }

    if (this.pwa.canInstall()) {
      const outcome = await this.pwa.promptInstall();

      if (outcome === 'accepted') {
        this.toast.success('Aplicación instalada correctamente.');
      } else if (outcome === 'dismissed') {
        this.toast.info('Puedes instalarla cuando quieras desde el menú del navegador.');
      }

      return;
    }

    this.toast.info(
      'Para instalar: abre el menú del navegador y elige “Instalar aplicación” o “Agregar a pantalla de inicio”.'
    );
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout(): void {
    this.images.clear();
    this.router.navigate(['/login']);
  }
}
