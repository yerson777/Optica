import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PrescriptionImage } from '../models';

@Injectable({ providedIn: 'root' })
export class ImageService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private readonly cache = new Map<number, string>();
  private readonly pending = new Map<number, Observable<string>>();

  objectUrl(image: PrescriptionImage | number): Observable<string> {
    const id = typeof image === 'number' ? image : image.id;
    const cached = this.cache.get(id);

    if (cached) {
      return of(cached);
    }

    const existing = this.pending.get(id);

    if (existing) {
      return existing;
    }

    const request: Observable<string> = this.http
      .get(`${this.api}/prescription-images/${id}/file`, { responseType: 'blob' })
      .pipe(
        map((blob) => {
          const url = URL.createObjectURL(blob);
          this.cache.set(id, url);
          return url;
        }),
        finalize(() => this.pending.delete(id)),
        shareReplay(1)
      );

    this.pending.set(id, request);

    return request;
  }

  download(image: PrescriptionImage): void {
    this.http
      .get(`${this.api}/prescription-images/${image.id}/download`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = image.original_name || `receta-${image.id}.jpg`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        },
      });
  }

  clear(): void {
    this.cache.forEach((url) => URL.revokeObjectURL(url));
    this.cache.clear();
    this.pending.clear();
  }
}
