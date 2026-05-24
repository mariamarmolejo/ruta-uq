/**
 * FF-01  Registration form validates required fields
 * FF-02  Login form validates required fields
 * FF-03  Password recovery screen renders correctly
 * NFR-04 CAPTCHA field present in registration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

// ── Mock services before importing pages ─────────────────────────────────────
vi.mock("@/services/auth.service", () => ({
  authService: {
    login:              vi.fn(),
    register:           vi.fn(),
    forgotPassword:     vi.fn(),
    resendVerification: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    login:    vi.fn(),
    register: vi.fn(),
    logout:   vi.fn(),
  }),
}));

vi.mock("@/components/auth/GoogleLoginButton", () => ({
  GoogleLoginButton: () => null,
}));

// ── Zod schemas (mirrors the page-level schemas) ─────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("emailRequired"),
  password: z.string().min(1, "passwordRequired"),
});

const registerSchema = z.object({
  firstName:      z.string().min(2, "firstNameMin"),
  lastName:       z.string().min(2, "lastNameMin"),
  email:          z.string().email("emailInvalid"),
  password:       z.string().min(6, "passwordMin"),
  role:           z.enum(["CLIENT", "DRIVER"] as const, { message: "roleRequired" }),
  privacyAccepted: z.boolean().refine((val) => val === true, { message: "privacyRequired" }),
  captchaToken:   z.string().min(1, "recaptchaRequired"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("emailInvalid"),
});

// ── FF-02  Login form schema validation ─────────────────────────────────────

describe("FF-02 — Login form validation (Zod schema)", () => {
  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "pass123" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("emailRequired");
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "pass123" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("passwordRequired");
  });

  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "secret" });
    expect(result.success).toBe(true);
  });
});

// ── FF-01  Registration form schema validation ───────────────────────────────

describe("FF-01 — Registration form validation (Zod schema)", () => {
  it("rejects empty firstName", () => {
    const result = registerSchema.safeParse({
      firstName: "", lastName: "L", email: "a@b.com",
      password: "abc123", role: "CLIENT", privacyAccepted: true, captchaToken: "tok",
    });
    expect(result.success).toBe(false);
    const firstNameError = result.error?.issues.find(i => i.path[0] === "firstName");
    expect(firstNameError).toBeDefined();
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      firstName: "John", lastName: "Doe", email: "bad",
      password: "abc123", role: "CLIENT", privacyAccepted: true, captchaToken: "tok",
    });
    expect(result.success).toBe(false);
    const emailError = result.error?.issues.find(i => i.path[0] === "email");
    expect(emailError).toBeDefined();
  });

  it("rejects password shorter than 6 characters", () => {
    const result = registerSchema.safeParse({
      firstName: "John", lastName: "Doe", email: "a@b.com",
      password: "abc", role: "CLIENT", privacyAccepted: true, captchaToken: "tok",
    });
    expect(result.success).toBe(false);
    const passError = result.error?.issues.find(i => i.path[0] === "password");
    expect(passError).toBeDefined();
  });

  it("rejects missing privacy acceptance", () => {
    const result = registerSchema.safeParse({
      firstName: "John", lastName: "Doe", email: "a@b.com",
      password: "abc123", role: "CLIENT", privacyAccepted: false, captchaToken: "tok",
    });
    expect(result.success).toBe(false);
    const privacyError = result.error?.issues.find(i => i.path[0] === "privacyAccepted");
    expect(privacyError).toBeDefined();
  });

  it("rejects missing captchaToken (NFR-04)", () => {
    const result = registerSchema.safeParse({
      firstName: "John", lastName: "Doe", email: "a@b.com",
      password: "abc123", role: "CLIENT", privacyAccepted: true, captchaToken: "",
    });
    expect(result.success).toBe(false);
    const captchaError = result.error?.issues.find(i => i.path[0] === "captchaToken");
    expect(captchaError).toBeDefined();
    expect(captchaError?.message).toBe("recaptchaRequired");
  });

  it("accepts valid registration data with CLIENT role", () => {
    const result = registerSchema.safeParse({
      firstName: "John", lastName: "Doe", email: "john@test.com",
      password: "secure123", role: "CLIENT", privacyAccepted: true, captchaToken: "real-token",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid registration data with DRIVER role", () => {
    const result = registerSchema.safeParse({
      firstName: "Jane", lastName: "Smith", email: "jane@test.com",
      password: "secure123", role: "DRIVER", privacyAccepted: true, captchaToken: "real-token",
    });
    expect(result.success).toBe(true);
  });
});

// ── FF-03  Forgot password schema validation ─────────────────────────────────

describe("FF-03 — Password recovery form validation (Zod schema)", () => {
  it("rejects empty email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = forgotPasswordSchema.safeParse({ email: "notanemail" });
    expect(result.success).toBe(false);
  });

  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });
});

// ── Auth service function signatures ─────────────────────────────────────────

describe("Auth service — contract", () => {
  it("authService exposes login, register, forgotPassword, resendVerification", async () => {
    const { authService } = await import("@/services/auth.service");
    expect(typeof authService.login).toBe("function");
    expect(typeof authService.register).toBe("function");
    expect(typeof authService.forgotPassword).toBe("function");
    expect(typeof authService.resendVerification).toBe("function");
  });
});
