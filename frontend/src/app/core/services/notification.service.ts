import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiData, AppNotification, Paginated } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private readonly unread = signal(0);

  readonly unreadCount = this.unread.asReadonly();

  list(options: { unread?: boolean; page?: number; per_page?: number } = {}): Observable<
    Paginated<AppNotification>
  > {
    let params = new HttpParams()
      .set('page', String(options.page ?? 1))
      .set('per_page', String(options.per_page ?? 20));

    if (options.unread) {
      params = params.set('unread', '1');
    }

    return this.http.get<Paginated<AppNotification>>(`${this.api}/notifications`, { params }).pipe(
      tap((response) => {
        if (typeof response.unread_count === 'number') {
          this.unread.set(response.unread_count);
        }
      })
    );
  }

  refreshUnreadCount(): void {
    this.http
      .get<ApiData<{ count: number }>>(`${this.api}/notifications/unread-count`)
      .subscribe({
        next: (response) => this.unread.set(response.data.count),
        error: () => undefined,
      });
  }

  markRead(id: number): Observable<ApiData<AppNotification>> {
    return this.http
      .post<ApiData<AppNotification>>(`${this.api}/notifications/${id}/read`, {})
      .pipe(
        tap(() => this.unread.update((count) => Math.max(0, count - 1)))
      );
  }

  markAllRead(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.api}/notifications/read-all`, {})
      .pipe(tap(() => this.unread.set(0)));
  }
}
