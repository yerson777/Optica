import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiData, Client, Paginated } from '../models';

export interface ClientQuery {
  search?: string;
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
}

export interface ClientPayload {
  full_name: string;
  phone: string;
  observations?: string | null;
  confirm_duplicate?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(query: ClientQuery = {}): Observable<Paginated<Client>> {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<Paginated<Client>>(`${this.api}/clients`, { params });
  }

  get(
    id: number,
    options: {
      paginated?: boolean;
      prescriptionsPage?: number;
      ordersPage?: number;
      perPage?: number;
    } = {}
  ): Observable<ApiData<Client>> {
    let params = new HttpParams();

    if (options.paginated) {
      params = params.set('paginated', '1').set('per_page', String(options.perPage ?? 6));

      if (options.prescriptionsPage) {
        params = params.set('prescriptions_page', String(options.prescriptionsPage));
      }

      if (options.ordersPage) {
        params = params.set('orders_page', String(options.ordersPage));
      }
    }

    return this.http.get<ApiData<Client>>(`${this.api}/clients/${id}`, { params });
  }

  create(payload: ClientPayload): Observable<ApiData<Client>> {
    return this.http.post<ApiData<Client>>(`${this.api}/clients`, payload);
  }

  update(id: number, payload: ClientPayload): Observable<ApiData<Client>> {
    return this.http.put<ApiData<Client>>(`${this.api}/clients/${id}`, payload);
  }

  duplicates(name: string, phone: string): Observable<ApiData<Client[]>> {
    let params = new HttpParams();

    if (name) {
      params = params.set('name', name);
    }

    if (phone) {
      params = params.set('phone', phone);
    }

    return this.http.get<ApiData<Client[]>>(`${this.api}/clients/duplicates`, { params });
  }
}
