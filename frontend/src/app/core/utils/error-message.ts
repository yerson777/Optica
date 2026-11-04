import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
    }

    const errors = error.error?.errors;

    if (errors && typeof errors === 'object') {
      const first = Object.values(errors)[0];

      if (Array.isArray(first) && first.length) {
        return String(first[0]);
      }

      if (typeof first === 'string') {
        return first;
      }
    }

    if (typeof error.error?.message === 'string' && error.error.message.trim() !== '') {
      return error.error.message;
    }

    if (error.status === 403) {
      return 'No tienes permiso para realizar esta acción.';
    }

    if (error.status === 404) {
      return 'No se encontró la información solicitada.';
    }
  }

  return fallback;
}
