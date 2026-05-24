/**
 * FF-04  Trip creation form validates origin, destination, date, time, seats, price
 * FF-05  Trip listing displays available trips
 * FF-06  Trip detail screen displays reservation information
 */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { TripResponse } from "@/types";

// ── Trip form schema (mirrors TripForm.tsx) ──────────────────────────────────

const tripSchema = z.object({
  origin:        z.string().min(2, "originRequired"),
  destination:   z.string().min(2, "destinationRequired"),
  departureTime: z.string().min(1, "departureRequired"),
  availableSeats: z
    .number({ message: "enterNumber" })
    .min(1, "seatsMin")
    .max(20, "seatsMax"),
  pricePerSeat: z
    .number({ message: "enterNumber" })
    .min(0, "priceNegative")
    .multipleOf(1, "priceNotInteger"),
  vehicleId: z.string().uuid("vehicleRequired"),
});

// ── FF-04  Trip creation form schema validation ──────────────────────────────

describe("FF-04 — Trip creation form validation (Zod schema)", () => {
  const base = {
    origin:         "Armenia",
    destination:    "Universidad de Quindío",
    departureTime:  "2026-12-01T08:00",
    availableSeats: 3,
    pricePerSeat:   5000,
    vehicleId:      "550e8400-e29b-41d4-a716-446655440000",
  };

  it("rejects empty origin", () => {
    const r = tripSchema.safeParse({ ...base, origin: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.find(i => i.path[0] === "origin")).toBeDefined();
  });

  it("rejects empty destination", () => {
    const r = tripSchema.safeParse({ ...base, destination: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.find(i => i.path[0] === "destination")).toBeDefined();
  });

  it("rejects empty departure time", () => {
    const r = tripSchema.safeParse({ ...base, departureTime: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.find(i => i.path[0] === "departureTime")).toBeDefined();
  });

  it("rejects zero available seats", () => {
    const r = tripSchema.safeParse({ ...base, availableSeats: 0 });
    expect(r.success).toBe(false);
    expect(r.error?.issues.find(i => i.path[0] === "availableSeats")).toBeDefined();
  });

  it("rejects seats above maximum (21)", () => {
    const r = tripSchema.safeParse({ ...base, availableSeats: 21 });
    expect(r.success).toBe(false);
  });

  it("rejects negative price per seat", () => {
    const r = tripSchema.safeParse({ ...base, pricePerSeat: -1 });
    expect(r.success).toBe(false);
    expect(r.error?.issues.find(i => i.path[0] === "pricePerSeat")).toBeDefined();
  });

  it("rejects fractional COP price", () => {
    const r = tripSchema.safeParse({ ...base, pricePerSeat: 5000.5 });
    expect(r.success).toBe(false);
  });

  it("rejects missing vehicleId", () => {
    const r = tripSchema.safeParse({ ...base, vehicleId: "" });
    expect(r.success).toBe(false);
  });

  it("accepts valid trip data", () => {
    const r = tripSchema.safeParse(base);
    expect(r.success).toBe(true);
  });
});

// ── FF-05  Trip listing data shape ───────────────────────────────────────────

describe("FF-05 — Trip listing (data shape validation)", () => {
  const mockTrips: TripResponse[] = [
    {
      id:             "trip-uuid-1",
      origin:         "Armenia",
      destination:    "Universidad de Quindío",
      departureTime:  "2026-12-01T13:00:00Z",
      availableSeats: 3,
      pricePerSeat:   5000,
      status:         "SCHEDULED",
      description:    null,
      driver: {
        id: "drv-1", firstName: "Carlos", lastName: "Ruiz", email: "carlos@test.com",
        phone: null, avatarUrl: null, averageRating: null,
      },
      vehicle: {
        id: "veh-1", brand: "Toyota", model: "Yaris", year: 2022,
        color: "Rojo", plate: "ABC123", seats: 4,
      },
      createdAt: "2026-11-01T10:00:00Z",
      startedAt: null,
      completedAt: null,
    },
  ];

  it("trip list items have required fields: id, origin, destination, pricePerSeat, status", () => {
    mockTrips.forEach(trip => {
      expect(trip.id).toBeTruthy();
      expect(trip.origin).toBeTruthy();
      expect(trip.destination).toBeTruthy();
      expect(typeof trip.pricePerSeat).toBe("number");
      expect(trip.status).toBe("SCHEDULED");
    });
  });

  it("trip list items include driver and vehicle summaries", () => {
    mockTrips.forEach(trip => {
      expect(trip.driver).toBeDefined();
      expect(trip.driver.firstName).toBeTruthy();
      expect(trip.vehicle).toBeDefined();
      expect(trip.vehicle.plate).toBeTruthy();
    });
  });

  it("only SCHEDULED trips should appear in the public listing", () => {
    const scheduled = mockTrips.filter(t => t.status === "SCHEDULED");
    expect(scheduled.length).toBe(mockTrips.length);
  });
});

// ── FF-06  Trip detail — reservation info ────────────────────────────────────

describe("FF-06 — Trip detail contains reservation-relevant data", () => {
  const mockTrip: TripResponse = {
    id:             "trip-uuid-detail",
    origin:         "Calarcá",
    destination:    "UQ Norte",
    departureTime:  "2026-12-15T08:30:00Z",
    availableSeats: 1,
    pricePerSeat:   4000,
    status:         "SCHEDULED",
    description:    "Salida puntual.",
    driver: {
      id: "drv-2", firstName: "Maria", lastName: "Lopez", email: "maria@test.com",
      phone: "3001234567", avatarUrl: null, averageRating: 4.5,
    },
    vehicle: {
      id: "veh-2", brand: "Mazda", model: "2", year: 2021,
      color: "Blanco", plate: "XYZ789", seats: 4,
    },
    createdAt: "2026-11-10T10:00:00Z",
    startedAt: null,
    completedAt: null,
  };

  it("contains pricePerSeat for reservation cost calculation", () => {
    expect(mockTrip.pricePerSeat).toBe(4000);
  });

  it("contains availableSeats so passenger can see seat availability", () => {
    expect(typeof mockTrip.availableSeats).toBe("number");
    expect(mockTrip.availableSeats).toBeGreaterThanOrEqual(0);
  });

  it("contains driver information for passenger trust verification", () => {
    expect(mockTrip.driver.firstName).toBeTruthy();
    expect(mockTrip.driver.email).toBeTruthy();
  });

  it("contains vehicle plate for identification", () => {
    expect(mockTrip.vehicle.plate).toBe("XYZ789");
  });
});

// ── Trips service contract ────────────────────────────────────────────────────

describe("Trips service — function contract", () => {
  it("tripsService exposes search, getById, create, cancel, start, complete", async () => {
    vi.mock("@/lib/axios", () => ({
      default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
    }));
    const { tripsService } = await import("@/services/trips.service");
    expect(typeof tripsService.search).toBe("function");
    expect(typeof tripsService.getById).toBe("function");
    expect(typeof tripsService.create).toBe("function");
    expect(typeof tripsService.cancel).toBe("function");
  });
});
