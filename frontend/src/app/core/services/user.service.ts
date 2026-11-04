import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiData, Paginated, User } from '../models';

export interface CreateUserPayload {
  name: string;
  username: string;
  password: string;
  password_confirmation: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(page = 1, perPage = 10): Observable<Paginated<User>> {
    const params = new HttpParams().set('page', String(page)).set('per_page', String(perPage));

    return this.http.get<Paginated<User>>(`${this.api}/users`, { params });
  }

  create(payload: CreateUserPayload): Observable<ApiData<User> & { message: string }> {
    return this.http.post<ApiData<User> & { message: string }>(`${this.api}/users`, payload);
  }
}
