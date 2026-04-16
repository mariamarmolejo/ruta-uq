import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AxiosError } from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TripStatus, ReservationStatus } from '@/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  // Format as Colombian Peso without decimals
  const formatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `$${formatted}`;
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return format(d, "d 'de' MMMM yyyy, h:mm a", { locale: es });
}

export function formatDateShort(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return format(d, "EEE d MMM · h:mm a", { locale: es });
}

export function formatDateOnly(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'd MMM yyyy', { locale: es });
}

export function formatTimeOnly(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'h:mm a', { locale: es });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (message) return message;
    if (error.response?.status === 401) return 'Credenciales inválidas.';
    if (error.response?.status === 403) return 'No tienes permiso para realizar esta acción.';
    if (error.response?.status === 409) return 'Ya existe un recurso con esos datos.';
    if (error.response?.status === 404) return 'Recurso no encontrado.';
    if (!error.response) return 'Sin conexión. Verifica tu internet.';
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Error desconocido. Intenta de nuevo.';
}

// ---- Status labels (Spanish) ----

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  SCHEDULED:   'Programado',
  IN_PROGRESS: 'En curso',
  COMPLETED:   'Completado',
  CANCELLED:   'Cancelado',
};

export const TRIP_STATUS_COLOR: Record<TripStatus, string> = {
  SCHEDULED:   '#2563eb',
  IN_PROGRESS: '#16a34a',
  COMPLETED:   '#737373',
  CANCELLED:   '#dc2626',
};

export const TRIP_STATUS_BG: Record<TripStatus, string> = {
  SCHEDULED:   '#dbeafe',
  IN_PROGRESS: '#dcfce7',
  COMPLETED:   '#f5f5f5',
  CANCELLED:   '#fee2e2',
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: 'Pago pendiente',
  CONFIRMED:       'Confirmada',
  PAYMENT_FAILED:  'Pago fallido',
  CANCELLED:       'Cancelada',
  COMPLETED:       'Completada',
};

export const RESERVATION_STATUS_COLOR: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: '#d97706',
  CONFIRMED:       '#16a34a',
  PAYMENT_FAILED:  '#dc2626',
  CANCELLED:       '#737373',
  COMPLETED:       '#2563eb',
};

export const RESERVATION_STATUS_BG: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: '#fef3c7',
  CONFIRMED:       '#dcfce7',
  PAYMENT_FAILED:  '#fee2e2',
  CANCELLED:       '#f5f5f5',
  COMPLETED:       '#dbeafe',
};
