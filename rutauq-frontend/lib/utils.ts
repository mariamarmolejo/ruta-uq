import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AxiosError } from "axios";
import type { TripStatus, ReservationStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Cached Intl formatter instances — avoids recreating on every call
const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(amount: number, currency = "COP"): string {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }
  return currencyFormatters.get(currency)!.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

export function formatDateShort(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  return shortDateFormatter.format(d);
}

/** Extracts a human-readable message from an Axios error or unknown error. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // Backend ApiResponse envelope: { success: false, message: "...", errorCode: "..." }
    const message = error.response?.data?.message;
    if (message) return message;
    if (error.response?.status === 401) return "Invalid credentials.";
    if (error.response?.status === 403) return "You don't have permission to do this.";
    if (error.response?.status === 409) return "A conflict occurred. This resource may already exist.";
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

// ---- Shared status config (single source of truth for all pages/components) ----

export const TRIP_STATUS_VARIANT: Record<TripStatus, "primary" | "success" | "default" | "danger"> = {
  SCHEDULED: "primary",
  IN_PROGRESS: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
};

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const RESERVATION_STATUS_VARIANT: Record<
  ReservationStatus,
  "warning" | "success" | "danger" | "default" | "primary"
> = {
  PENDING_PAYMENT: "warning",
  CONFIRMED: "success",
  PAYMENT_FAILED: "danger",
  CANCELLED: "default",
  COMPLETED: "primary",
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  PAYMENT_FAILED: "Payment failed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};
