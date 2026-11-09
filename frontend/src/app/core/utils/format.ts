import { MESSAGES } from '../i18n/messages.es';
import { ORDER_STATUS_LABELS, Order } from '../models';

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) {
    return MESSAGES.common.noPhone;
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }

  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith('51')) {
    return `+51 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  return phone;
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return MESSAGES.common.emptyValue;
  }

  const numeric = typeof value === 'string' ? Number(value) : value;

  if (Number.isNaN(numeric)) {
    return MESSAGES.common.emptyValue;
  }

  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  }).format(numeric);
}

export function toInputDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function todayInputDate(): string {
  return toInputDate(new Date());
}

export function formatPrescriptionBlockMessage(
  orders: Order[] | null | undefined
): string {
  const list = orders ?? [];

  if (!list.length) {
    return MESSAGES.prescriptions.deleteBlockedOrders;
  }

  const labels = [
    ...new Set(list.map((o) => ORDER_STATUS_LABELS[o.status] ?? o.status)),
  ];
  const count = list.length;

  if (count === 1) {
    return `Esta receta tiene 1 pedido asociado (${labels[0]}). Elimínalo desde Pedidos primero.`;
  }

  return `Esta receta tiene ${count} pedidos asociados (${labels.join(
    ', '
  )}). Elimínalos desde Pedidos primero.`;
}

export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return MESSAGES.common.emptyValue;
  }

  const [year, month, day] = value.slice(0, 10).split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function formatWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  const cleaned = phone.replace(/[\s\-+]/g, '');

  if (!/^\d+$/.test(cleaned) || cleaned.length < 8) {
    return null;
  }

  return cleaned.length === 8 ? '591' + cleaned : cleaned;
}
