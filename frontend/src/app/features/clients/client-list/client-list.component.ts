import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { MESSAGES } from '../../../core/i18n/messages.es';
import { Client } from '../../../core/models';
import { ClientService } from '../../../core/services/client.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/utils/error-message';
import { formatPhone } from '../../../core/utils/format';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip.component';

@Component({
  selector: 'app-client-list',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressBarModule,
    StatusChipComponent,
    PaginationComponent,
  ],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientListComponent implements OnInit {
  private readonly clients = inject(ClientService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = signal(10);

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const q = params.get('q') ?? '';
      this.searchTerm.set(q);
      this.page.set(1);
      this.load();
    });
  }

  onSearchInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.clients
      .list({
        search: this.searchTerm().trim(),
        page: this.page(),
        per_page: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          this.items.set(response.data);
          this.total.set(response.total);
          this.lastPage.set(response.last_page);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(extractErrorMessage(error, MESSAGES.clients.loadListFallback));
        },
      });
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage() || page === this.page()) {
      return;
    }

    this.page.set(page);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openClient(client: Client): void {
    this.router.navigate(['/clientes', client.id]);
  }

  phone(client: Client): string {
    return formatPhone(client.phone);
  }
}
