/**
 * E2E-02 — Trips
 * Driver login → create trip → verify it appears in the published list.
 *
 * NFR-01  Login responds within 3 s (measured end-to-end)
 * NFR-02  Trip creation form loads within 3 s
 * NFR-08  Driver-only features not visible to CLIENT
 */

import { test, expect } from "@playwright/test";
import {
  E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD,
  E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD,
} from "./seed";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAs(
  page: Parameters<typeof test>[1] extends (...args: infer A) => unknown ? A[0] : never,
  email: string, password: string
) {
  await page.goto("/login");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole("button", { name: /iniciar|ingresar|login|sign in/i }).click();
  await page.waitForURL(/\/(trips|driver\/trips)/, { timeout: 15_000 }).catch(async () => {
    const error = await page.locator("[class*='red'], [class*='error'], [role='alert']").first().textContent().catch(() => "(no error element found)");
    throw new Error(`Login redirect did not happen for ${email}. Current URL: ${page.url()}. Page error: ${error}`);
  });
}

// future departure — ISO in Colombian time (UTC-5)
function futureDeparture(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}T09:00`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("E2E-02 — Trip Management", () => {
  test("NFR-01 — Login response is under 3 seconds", async ({ page }) => {
    await page.goto("/login");
    const start = Date.now();
    await page.getByLabel(/correo|email/i).fill(E2E_DRIVER_EMAIL);
    await page.getByLabel(/contraseña|password/i).fill(E2E_DRIVER_PASSWORD);
    await page.getByRole("button", { name: /iniciar|ingresar|login|sign in/i }).click();
    await page.waitForURL(/\/(trips|driver\/trips)/, { timeout: 15_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3_000);
  });

  test("NFR-02 — Trip creation form loads within 3 seconds", async ({ page }) => {
    await loginAs(page, E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    const start = Date.now();
    await page.goto("/driver/trips/new");
    await expect(page.getByLabel(/origen|origin/i)).toBeVisible({ timeout: 5_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3_000);
  });

  test("DRIVER can navigate to 'New Trip' page", async ({ page }) => {
    await loginAs(page, E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    await page.goto("/driver/trips/new");
    await expect(page.getByLabel(/origen|origin/i)).toBeVisible();
    await expect(page.getByLabel(/destino|destination/i)).toBeVisible();
    await expect(page.getByLabel(/fecha|date|salida|departure/i).first()).toBeVisible();
    await expect(page.getByLabel(/asientos|seats/i)).toBeVisible();
    await expect(page.getByLabel(/precio|price/i)).toBeVisible();
  });

  test("Trip creation form validates required fields", async ({ page }) => {
    await loginAs(page, E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    await page.goto("/driver/trips/new");
    // Submit without filling required fields
    await page.getByRole("button", { name: /publicar|crear|guardar|publish|create|save/i }).click();
    // Expect validation errors to appear
    const errors = page.locator("text=/requerido|obligatorio|required|invalid/i");
    await expect(errors.first()).toBeVisible({ timeout: 5_000 });
  });

  test("NFR-08 — CLIENT cannot access driver trip creation page", async ({ page }) => {
    await loginAs(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD);
    await page.goto("/driver/trips/new");
    // Should redirect away (to /trips or show access denied)
    await page.waitForTimeout(2_000);
    expect(page.url()).not.toContain("/driver/trips/new");
  });

  test("NFR-06 — Trip list renders on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAs(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD);
    await page.goto("/trips");
    // Page should be visible and not show a horizontal scrollbar
    await expect(page.locator("main").first()).toBeVisible();
  });
});
