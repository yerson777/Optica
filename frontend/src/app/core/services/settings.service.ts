import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiData, Settings } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  get(): Observable<ApiData<Settings>> {
    return this.http.get<ApiData<Settings>>(`${this.api}/settings`);
  }

  update(pendingAlertDays: number): Observable<ApiData<Settings> & { message: string }> {
    return this.http.put<ApiData<Settings> & { message: string }>(`${this.api}/settings`, {
      pending_alert_days: pendingAlertDays,
    });
  }
}
