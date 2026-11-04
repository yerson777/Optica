import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.endsWith('/login')) {
        auth.clearSession();

        if (!router.url.startsWith('/login')) {
          router.navigate(['/login']);
        }
      }

      if (error.status === 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('optica:connection-lost'));
      }

      return throwError(() => error);
    })
  );
};
