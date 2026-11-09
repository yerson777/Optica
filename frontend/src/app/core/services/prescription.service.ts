import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiData, Paginated, Prescription } from '../models';

export interface PrescriptionQuery {
  client_id?: number;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(query: PrescriptionQuery = {}): Observable<Paginated<Prescription>> {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<Paginated<Prescription>>(`${this.api}/prescriptions`, { params });
  }

  get(id: number): Observable<ApiData<Prescription>> {
    return this.http.get<ApiData<Prescription>>(`${this.api}/prescriptions/${id}`);
  }

  create(formData: FormData): Observable<ApiData<Prescription>> {
    return this.http.post<ApiData<Prescription>>(`${this.api}/prescriptions`, formData);
  }

  update(
    id: number,
    payload: { registered_at: string; observations: string | null }
  ): Observable<ApiData<Prescription>> {
    return this.http.put<ApiData<Prescription>>(`${this.api}/prescriptions/${id}`, payload);
  }

  addImages(id: number, formData: FormData): Observable<ApiData<Prescription>> {
    return this.http.post<ApiData<Prescription>>(`${this.api}/prescriptions/${id}/images`, formData);
  }

  replaceImage(
    prescriptionId: number,
    imageId: number,
    formData: FormData
  ): Observable<ApiData<Prescription>> {
    return this.http.post<ApiData<Prescription>>(
      `${this.api}/prescriptions/${prescriptionId}/images/${imageId}`,
      formData
    );
  }

  deleteImage(prescriptionId: number, imageId: number): Observable<ApiData<Prescription>> {
    return this.http.delete<ApiData<Prescription>>(
      `${this.api}/prescriptions/${prescriptionId}/images/${imageId}`
    );
  }
}
