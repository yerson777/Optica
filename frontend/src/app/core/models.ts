export type OrderStatus = 'pending' | 'ready' | 'delivered' | 'cancelled';

export interface User {
  id: number;
  name: string;
  username: string;
  is_active: boolean;
  created_at?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface Client {
  id: number;
  full_name: string;
  phone: string;
  observations: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: number | null;
  creator?: Pick<User, 'id' | 'name'> | null;
  prescriptions?: Prescription[];
  orders?: Order[];
  orders_count?: number;
  prescriptions_count?: number;
  latest_order?: Order | null;
  prescriptions_pagination?: PaginationMeta;
  orders_pagination?: PaginationMeta;
}

export interface PrescriptionImage {
  id: number;
  prescription_id: number;
  original_name: string;
  mime_type: string;
  file_size: number;
  url: string;
  download_url: string;
  created_at: string;
}

export interface Prescription {
  id: number;
  client_id: number;
  observations: string | null;
  registered_at: string;
  created_at: string;
  created_by?: number | null;
  client?: Pick<Client, 'id' | 'full_name' | 'phone'>;
  creator?: Pick<User, 'id' | 'name'> | null;
  images: PrescriptionImage[];
  orders?: Order[];
  orders_count?: number;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
  changed_by: number | null;
  changer?: Pick<User, 'id' | 'name'> | null;
}

export interface Order {
  id: number;
  client_id: number;
  prescription_id: number;
  lens_type: string;
  observations: string | null;
  price: string | number | null;
  advance: string | number | null;
  balance: number | null;
  status: OrderStatus;
  status_label: string;
  ordered_at: string;
  ready_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at?: string;
  days_pending: number;
  created_by?: number | null;
  delivered_by?: number | null;
  client?: Client;
  prescription?: Prescription;
  creator?: Pick<User, 'id' | 'name'> | null;
  delivery_user?: Pick<User, 'id' | 'name'> | null;
  status_histories?: OrderStatusHistory[];
}

export interface AppNotification {
  id: number;
  user_id: number;
  order_id: number;
  type: 'ready' | 'overdue' | 'stale' | string;
  message: string;
  read_at: string | null;
  created_at: string;
  order?: Order;
}

export interface DashboardStats {
  total_clients: number;
  pending_orders: number;
  ready_orders: number;
  delivered_this_month: number;
}

export interface DashboardData {
  stats: DashboardStats;
  alerts: AppNotification[];
  unread_notifications: number;
  recent_orders: Order[];
  pending_alert_days: number;
}

export interface Paginated<T> {
  current_page: number;
  data: T[];
  first_page_url?: string;
  from?: number | null;
  last_page: number;
  last_page_url?: string;
  links?: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url?: string | null;
  path?: string;
  per_page: number;
  prev_page_url?: string | null;
  to?: number | null;
  total: number;
  unread_count?: number;
}

export interface ApiData<T> {
  data: T;
  message?: string;
}

export interface DuplicateErrorResponse {
  message: string;
  duplicates: Client[];
}

export interface Settings {
  pending_alert_days: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  ready: 'Listo para entregar',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  pending: 'schedule',
  ready: 'notifications_active',
  delivered: 'check_circle',
  cancelled: 'cancel',
};
