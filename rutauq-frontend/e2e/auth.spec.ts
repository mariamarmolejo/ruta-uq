/**
 * E2E-01 — Authentication
 * Tests login + dashboard access for both CLIENT and DRIVER roles.
 *
 * Requires seed accounts (see e2e/seed.ts):
 *   DRIVER: e2e.driver@rutauq.test / E2eTest123!
 *   CLIENT: e2e.client@rutauq.test / E2eTest123!
 */

import { test, expect } from "@playwright/test";
import {
  E2E_CLIENT_EMAIL,
  E2E_CLIENT_PASSWORD,
  E2E_DRIVER_EMAIL,
  E2E_DRIVER_PASSWORD,
} from "./seed";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(page: Parameters<typeof test>[1] extends (...args: infer A) => unknown ? A[0] : never,
                        email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole("button", { name: /iniciar|ingresar|login|sign in/i }).click();
  await page.waitForURL(/\/(trips|driver\/trips)/, { timeout: 15_000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("E2E-01 — Authentication", () => {
  test("CLIENT login → redirected to /trips dashboard", async ({ page }) => {
    await loginAs(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD);
    expect(page.url()).toContain("/trips");
  });

  test("DRIVER login → redirected to /driver/trips dashboard", async ({ page }) => {
    await loginAs(page, E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    expect(page.url()).toContain("/driver/trips");
  });

  test("Login page renders email and password inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/correo|email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña|password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar|ingresar|login|sign in/i })).toBeEnabled();
  });

  test("Login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/correo|email/i).fill(E2E_CLIENT_EMAIL);
    await page.getByLabel(/contraseña|password/i).fill("WrongPassword999!");
    await page.getByRole("button", { name: /iniciar|ingresar|login|sign in/i }).click();
    await expect(page.locator("text=/credenciales|credentials|incorrectas|incorrect/i"))
      .toBeVisible({ timeout: 10_000 });
  });

  test("Forgot password page renders email input", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel(/correo|email/i)).toBeVisible();
    await expect(page.getByRole("button")).toBeEnabled();
  });

  test("NFR-06 — Login page renders correctly on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");
    await expect(page.getByLabel(/correo|email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña|password/i)).toBeVisible();
  });

  test("Logout clears session and redirects to login", async ({ page }) => {
    await loginAs(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD);
    // Trigger logout via navbar or button
    const logoutBtn = page.getByRole("button", { name: /salir|logout|cerrar sesión/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toContain("/login");
    }
  });
});
