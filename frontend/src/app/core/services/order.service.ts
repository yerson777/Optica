import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiData, Order, OrderStatus, Paginated } from '../models';

export interface OrderQuery {
  status?: OrderStatus | '';
  client_id?: number;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface OrderPayload {
  client_id: number;
  prescription_id: number;
  lens_type: string;
  observations?: string | null;
  price?: number | null;
  advance?: number | null;
  ordered_at: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(query: OrderQuery = {}): Observable<Paginated<Order>> {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<Paginated<Order>>(`${this.api}/orders`, { params });
  }

  get(id: number): Observable<ApiData<Order>> {
    return this.http.get<ApiData<Order>>(`${this.api}/orders/${id}`);
  }

  create(payload: OrderPayload): Observable<ApiData<Order>> {
    return this.http.post<ApiData<Order>>(`${this.api}/orders`, payload);
  }

  updateStatus(
    id: number,
    status: OrderStatus,
    note?: string
  ): Observable<ApiData<Order> & { message: string }> {
    return this.http.patch<ApiData<Order> & { message: string }>(
      `${this.api}/orders/${id}/status`,
      { status, note: note ?? null }
    );
  }

  destroy(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/orders/${id}`);
  }
}
