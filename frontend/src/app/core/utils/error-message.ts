import { HttpErrorResponse } from '@angular/common/http';
import { MESSAGES } from '../i18n/messages.es';

export function extractServerMessage(error: unknown): string | null {
  if (error instanceof HttpErrorResponse) {
    const message = error.error?.message;

    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }

  return null;
}

export function extractErrorMessage(error: unknown, fallback: string = MESSAGES.common.unexpected): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return MESSAGES.common.network;
    }

    if (error.status === 408 || error.status === 504) {
      return MESSAGES.common.timeout;
    }

    if (error.status >= 500) {
      return MESSAGES.common.server;
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

    const serverMessage =
      typeof error.error?.message === 'string' && error.error.message.trim() !== ''
        ? error.error.message
        : null;

    if (serverMessage) {
      return serverMessage;
    }

    if (error.status === 401) {
      return MESSAGES.common.sessionExpired;
    }

    if (error.status === 403) {
      return MESSAGES.common.forbidden;
    }

    if (error.status === 404) {
      return MESSAGES.common.notFound;
    }

    if (error.status === 429) {
      return MESSAGES.common.tooManyRequests;
    }
  }

  return fallback;
}
