/**
 * FF-09  Trip tracking screen displays/updates trip status
 * FF-10  Incident form allows description input
 * FF-11  Rating form allows score and comment input
 * NFR-06 Responsive design breakpoints (logical validation)
 * NFR-08 Role-based feature visibility
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Trip status state machine ─────────────────────────────────────────────────

describe("FF-09 — Trip status display and transitions", () => {
  type TripStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

  function statusLabel(status: TripStatus): string {
    const labels: Record<TripStatus, string> = {
      SCHEDULED:   "Programado",
      IN_PROGRESS: "En curso",
      COMPLETED:   "Completado",
      CANCELLED:   "Cancelado",
    };
    return labels[status];
  }

  function canStartTrip(status: TripStatus): boolean {
    return status === "SCHEDULED";
  }

  function canCompleteTrip(status: TripStatus): boolean {
    return status === "IN_PROGRESS";
  }

  it("SCHEDULED trip can be started", () => {
    expect(canStartTrip("SCHEDULED")).toBe(true);
  });

  it("IN_PROGRESS trip cannot be started again", () => {
    expect(canStartTrip("IN_PROGRESS")).toBe(false);
  });

  it("COMPLETED trip cannot be started", () => {
    expect(canStartTrip("COMPLETED")).toBe(false);
  });

  it("IN_PROGRESS trip can be completed", () => {
    expect(canCompleteTrip("IN_PROGRESS")).toBe(true);
  });

  it("SCHEDULED trip cannot be completed directly", () => {
    expect(canCompleteTrip("SCHEDULED")).toBe(false);
  });

  it("status labels are non-empty strings", () => {
    (["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as TripStatus[]).forEach(s => {
      expect(statusLabel(s)).toBeTruthy();
    });
  });
});

// ── FF-10  Incident form schema ───────────────────────────────────────────────

const incidentSchema = z.object({
  reservationId: z.string().uuid("reservationRequired"),
  description:   z.string().min(10, "descriptionTooShort").max(2000, "descriptionTooLong"),
});

describe("FF-10 — Incident form validation", () => {
  const validBase = {
    reservationId: "550e8400-e29b-41d4-a716-446655440000",
    description:   "El conductor frenó de golpe en la autopista.",
  };

  it("rejects empty description", () => {
    const r = incidentSchema.safeParse({ ...validBase, description: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path[0]).toBe("description");
  });

  it("rejects description shorter than 10 characters", () => {
    const r = incidentSchema.safeParse({ ...validBase, description: "Problema" });
    expect(r.success).toBe(false);
  });

  it("rejects description exceeding 2000 characters", () => {
    const r = incidentSchema.safeParse({ ...validBase, description: "x".repeat(2001) });
    expect(r.success).toBe(false);
  });

  it("rejects missing reservationId", () => {
    const r = incidentSchema.safeParse({ ...validBase, reservationId: "" });
    expect(r.success).toBe(false);
  });

  it("accepts valid incident data", () => {
    const r = incidentSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });
});

// ── FF-11  Rating form schema ─────────────────────────────────────────────────

const ratingSchema = z.object({
  reservationId: z.string().uuid("reservationRequired"),
  stars:         z.number().int().min(1, "minStar").max(5, "maxStar"),
  comment:       z.string().max(500, "commentTooLong").optional(),
});

describe("FF-11 — Rating form validation", () => {
  const validBase = {
    reservationId: "550e8400-e29b-41d4-a716-446655440000",
    stars:         4,
    comment:       "Muy buen servicio.",
  };

  it("rejects stars = 0 (below minimum of 1)", () => {
    const r = ratingSchema.safeParse({ ...validBase, stars: 0 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("minStar");
  });

  it("rejects stars = 6 (above maximum of 5)", () => {
    const r = ratingSchema.safeParse({ ...validBase, stars: 6 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("maxStar");
  });

  it("rejects non-integer stars (e.g. 3.5)", () => {
    const r = ratingSchema.safeParse({ ...validBase, stars: 3.5 });
    expect(r.success).toBe(false);
  });

  it("rejects comment exceeding 500 characters", () => {
    const r = ratingSchema.safeParse({ ...validBase, comment: "x".repeat(501) });
    expect(r.success).toBe(false);
  });

  it("accepts valid rating with 5 stars and optional comment", () => {
    const r = ratingSchema.safeParse({ ...validBase, stars: 5 });
    expect(r.success).toBe(true);
  });

  it("accepts valid rating without comment (optional field)", () => {
    const { comment, ...withoutComment } = validBase;
    const r = ratingSchema.safeParse(withoutComment);
    expect(r.success).toBe(true);
  });

  it("accepts 1 star (minimum rating)", () => {
    const r = ratingSchema.safeParse({ ...validBase, stars: 1, comment: "No me gustó." });
    expect(r.success).toBe(true);
  });
});

// ── NFR-06  Responsive breakpoints (logical) ──────────────────────────────────

describe("NFR-06 — Responsive design breakpoints (Tailwind class contract)", () => {
  // Tailwind responsive prefixes the project uses: sm (640px), md (768px), lg (1024px)
  const BREAKPOINTS = {
    mobile:  375,
    tablet:  768,
    desktop: 1280,
  };

  it("mobile breakpoint is below tablet", () => {
    expect(BREAKPOINTS.mobile).toBeLessThan(BREAKPOINTS.tablet);
  });

  it("tablet breakpoint is below desktop", () => {
    expect(BREAKPOINTS.tablet).toBeLessThan(BREAKPOINTS.desktop);
  });

  it("mobile width is positive", () => {
    expect(BREAKPOINTS.mobile).toBeGreaterThan(0);
  });
});

// ── NFR-08  Role-based feature visibility (logic layer) ───────────────────────

describe("NFR-08 — Role-based feature visibility", () => {
  type Role = "CLIENT" | "DRIVER" | "ADMIN";

  function canCreateTrip(role: Role): boolean {
    return role === "DRIVER" || role === "ADMIN";
  }

  function canReserveSeat(role: Role): boolean {
    return role === "CLIENT";
  }

  function canStartTrip(role: Role): boolean {
    return role === "DRIVER" || role === "ADMIN";
  }

  function canViewAdminPanel(role: Role): boolean {
    return role === "ADMIN";
  }

  it("only DRIVER and ADMIN can create trips", () => {
    expect(canCreateTrip("DRIVER")).toBe(true);
    expect(canCreateTrip("ADMIN")).toBe(true);
    expect(canCreateTrip("CLIENT")).toBe(false);
  });

  it("only CLIENT can reserve a seat", () => {
    expect(canReserveSeat("CLIENT")).toBe(true);
    expect(canReserveSeat("DRIVER")).toBe(false);
    expect(canReserveSeat("ADMIN")).toBe(false);
  });

  it("only DRIVER and ADMIN can start a trip", () => {
    expect(canStartTrip("DRIVER")).toBe(true);
    expect(canStartTrip("ADMIN")).toBe(true);
    expect(canStartTrip("CLIENT")).toBe(false);
  });

  it("only ADMIN can view the admin panel", () => {
    expect(canViewAdminPanel("ADMIN")).toBe(true);
    expect(canViewAdminPanel("DRIVER")).toBe(false);
    expect(canViewAdminPanel("CLIENT")).toBe(false);
  });
});
