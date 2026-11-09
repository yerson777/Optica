import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  closing: boolean;
}

const DURATIONS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 4000,
  error: 6000,
};

const MAX_TOASTS = 3;
const EXIT_MS = 180;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<ToastItem[]>([]);
  readonly toasts = this.items.asReadonly();

  private sequence = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  warning(message: string): void {
    this.push('warning', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    const current = this.items().find((item) => item.id === id);

    if (!current || current.closing) {
      return;
    }

    this.clearTimer(id);
    this.items.update((items) =>
      items.map((item) => (item.id === id ? { ...item, closing: true } : item))
    );

    const exitTimer = setTimeout(() => {
      this.items.update((items) => items.filter((item) => item.id !== id));
      this.timers.delete(id);
    }, EXIT_MS);

    this.timers.set(id, exitTimer);
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.items.set([]);
  }

  private push(type: ToastType, message: string): void {
    const text = message?.trim();

    if (!text) {
      return;
    }

    const id = ++this.sequence;

    this.items.update((items) => [...items, { id, type, message: text, closing: false }].slice(-MAX_TOASTS));
    this.pruneTimers();

    const timer = setTimeout(() => this.dismiss(id), DURATIONS[type]);
    this.timers.set(id, timer);
  }

  private pruneTimers(): void {
    const activeIds = new Set(this.items().map((item) => item.id));

    this.timers.forEach((timer, id) => {
      if (!activeIds.has(id)) {
        clearTimeout(timer);
        this.timers.delete(id);
      }
    });
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
