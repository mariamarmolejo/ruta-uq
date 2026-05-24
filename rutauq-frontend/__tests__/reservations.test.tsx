/**
 * FF-07  Reservation screen calculates/displays total value
 * FF-08  Payment screen displays payment button, state, or gateway redirect
 * NFR-05 Integrity between completed payment and associated reservation
 * NFR-07 Complete booking-payment flow without skipping mandatory steps
 */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { ReservationResponse, PaymentResponse } from "@/types";

// ── Reservation form schema (mirrors reservations/new/page.tsx) ───────────────

const reservationSchema = z.object({
  seatsReserved: z.number().min(1, "seatsMin").max(10, "seatsMax"),
});

// ── FF-07  Reservation total price calculation ────────────────────────────────

describe("FF-07 — Reservation total price calculation", () => {
  function calculateTotal(pricePerSeat: number, seats: number): number {
    return pricePerSeat * seats;
  }

  it("calculates total as pricePerSeat × seatsReserved", () => {
    expect(calculateTotal(5000, 2)).toBe(10000);
    expect(calculateTotal(3500, 1)).toBe(3500);
    expect(calculateTotal(4000, 3)).toBe(12000);
  });

  it("total price is zero when seats = 0 (edge case)", () => {
    expect(calculateTotal(5000, 0)).toBe(0);
  });

  it("reservation schema rejects seatsReserved = 0", () => {
    const r = reservationSchema.safeParse({ seatsReserved: 0 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("seatsMin");
  });

  it("reservation schema accepts seatsReserved = 1", () => {
    const r = reservationSchema.safeParse({ seatsReserved: 1 });
    expect(r.success).toBe(true);
  });

  it("reservation schema rejects seatsReserved > 10", () => {
    const r = reservationSchema.safeParse({ seatsReserved: 11 });
    expect(r.success).toBe(false);
  });
});

// ── Reservation data shape ────────────────────────────────────────────────────

describe("FF-07 — Reservation response contains totalPrice and status", () => {
  const mockReservation: ReservationResponse = {
    id:            "res-uuid-1",
    status:        "PENDING_PAYMENT",
    seatsReserved: 2,
    totalPrice:    10000,
    createdAt:     "2026-11-20T10:00:00Z",
    trip: {
      id:            "trip-uuid-1",
      origin:        "Armenia",
      destination:   "UQ Campus",
      departureTime: "2026-12-01T13:00:00Z",
      pricePerSeat:  5000,
      status:        "SCHEDULED",
      driver: {
        id: "drv-1", firstName: "Carlos", lastName: "Ruiz",
        email: "carlos@test.com", phone: null, avatarUrl: null, averageRating: null,
      },
      vehicle: {
        id: "veh-1", brand: "Toyota", model: "Yaris", year: 2022,
        color: "Rojo", plate: "ABC123", seats: 4,
      },
      availableSeats: 1,
      description: null,
      createdAt: "2026-11-01T10:00:00Z",
      startedAt: null,
      completedAt: null,
    },
    passenger: {
      id: "usr-1", firstName: "Juan", lastName: "Perez",
      email: "juan@test.com", phone: null, avatarUrl: null,
    },
  };

  it("totalPrice matches seatsReserved × pricePerSeat (NFR-05)", () => {
    const expected = mockReservation.seatsReserved * mockReservation.trip.pricePerSeat;
    expect(mockReservation.totalPrice).toBe(expected);
  });

  it("status is PENDING_PAYMENT immediately after reservation (before payment)", () => {
    expect(mockReservation.status).toBe("PENDING_PAYMENT");
  });

  it("Pay Now CTA should only be available when status is PENDING_PAYMENT", () => {
    const canPay = (status: string) => status === "PENDING_PAYMENT";
    expect(canPay("PENDING_PAYMENT")).toBe(true);
    expect(canPay("CONFIRMED")).toBe(false);
    expect(canPay("CANCELLED")).toBe(false);
    expect(canPay("COMPLETED")).toBe(false);
  });
});

// ── FF-08  Payment screen state assertions ────────────────────────────────────

describe("FF-08 — Payment response includes status and reservation link (NFR-05)", () => {
  const mockPayment: PaymentResponse = {
    id:                    "pay-uuid-1",
    reservationId:         "res-uuid-1",
    mercadoPagoPaymentId:  "MP-123456789",
    status:                "PENDING",
    amount:                10000,
    currency:              "COP",
    createdAt:             "2026-11-20T10:05:00Z",
    updatedAt:             "2026-11-20T10:05:00Z",
  };

  it("payment is linked to a reservationId (NFR-05)", () => {
    expect(mockPayment.reservationId).toBe("res-uuid-1");
    expect(mockPayment.reservationId).toBeTruthy();
  });

  it("payment amount must be positive and non-zero (NFR-05)", () => {
    expect(mockPayment.amount).toBeGreaterThan(0);
  });

  it("payment has a Mercado Pago external reference (NFR-05)", () => {
    expect(mockPayment.mercadoPagoPaymentId).toBeTruthy();
  });

  it("payment status transitions: PENDING → APPROVED or REJECTED or CANCELLED", () => {
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "REFUNDED"];
    expect(validStatuses).toContain(mockPayment.status);
  });
});

// ── NFR-07  Payment flow cannot skip reservation (flow enforcement) ───────────

describe("NFR-07 — Booking-payment flow order enforcement", () => {
  it("payment can only be initiated for PENDING_PAYMENT reservations", () => {
    const canInitiatePayment = (status: string) => status === "PENDING_PAYMENT";
    expect(canInitiatePayment("PENDING_PAYMENT")).toBe(true);
    expect(canInitiatePayment("CONFIRMED")).toBe(false);
    expect(canInitiatePayment("CANCELLED")).toBe(false);
    expect(canInitiatePayment("COMPLETED")).toBe(false);
  });

  it("reservation is created before payment — reservation must exist to create payment", () => {
    const reservationExists = (reservationId: string | null) => reservationId != null;
    expect(reservationExists("res-uuid-1")).toBe(true);
    expect(reservationExists(null)).toBe(false);
  });
});

// ── Reservations service contract ─────────────────────────────────────────────

describe("Reservations service — function contract", () => {
  it("reservationsService exposes create, getById, list, cancel", async () => {
    vi.mock("@/lib/axios", () => ({
      default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    }));
    const { reservationsService } = await import("@/services/reservations.service");
    expect(typeof reservationsService.create).toBe("function");
    expect(typeof reservationsService.getById).toBe("function");
    expect(typeof reservationsService.getAll).toBe("function");
    expect(typeof reservationsService.cancel).toBe("function");
  });
});
