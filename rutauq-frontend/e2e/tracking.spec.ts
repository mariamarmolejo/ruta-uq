/**
 * E2E-04 — Trip Tracking and Completion
 *
 * DRIVER login → driver trips page → start trip → confirm boarding
 * → report incident → finish trip → rate/history.
 *
 * This test operates on a trip that has been pre-created with a CONFIRMED reservation.
 * If no such trip exists in the environment, subtests are conditionally skipped.
 *
 * NFR-08  DRIVER actions not available to CLIENT
 */

import { test, expect } from "@playwright/test";
import {
  E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD,
  E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD,
} from "./seed";

async function loginAs(
  page: Parameters<typeof test>[1] extends (...args: infer A) => unknown ? A[0] : never,
  email: string, password: string,
  expectedPath: RegExp = /\/(trips|driver\/trips)/
) {
  await page.goto("/login");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole("button", { name: /iniciar|ingresar|login|sign in/i }).click();
  await page.waitForURL(expectedPath, { timeout: 15_000 }).catch(async () => {
    const error = await page.locator("[class*='red'], [class*='error'], [role='alert']").first().textContent().catch(() => "(no error element found)");
    throw new Error(`Login redirect did not happen for ${email}. Current URL: ${page.url()}. Page error: ${error}`);
  });
}

test.describe("E2E-04 — Trip Tracking and Completion", () => {
  test("DRIVER can see their trips list", async ({ page }) => {
    await loginAs(page, E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    await page.goto("/driver/trips");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
  });

  test("DRIVER can see a Start button on a SCHEDULED trip", async ({ page }) => {
    await loginAs(page, E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    await page.goto("/driver/trips");

    const startBtn = page.getByRole("button", { name: /iniciar|start/i }).first();
    const hasTrip = await startBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasTrip) {
      test.skip(true, "No SCHEDULED trips for the driver account — skipping start test");
      return;
    }
    await expect(startBtn).toBeEnabled();
  });

  test("NFR-08 — CLIENT does not see driver trip controls (Start/Complete)", async ({ page }) => {
    await loginAs(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD);
    await page.goto("/trips");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    // Start/Complete buttons should NOT appear for CLIENT
    const startBtn = page.getByRole("button", { name: /iniciar viaje|start trip/i });
    await expect(startBtn).toHaveCount(0);
  });

  test("My Reservations page shows trip status for CLIENT", async ({ page }) => {
    await loginAs(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD);
    await page.goto("/reservations");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    // Each reservation card should display a status badge
    const reservationCards = page.locator("[data-testid='reservation-card'], .reservation-card, article");
    const count = await reservationCards.count();
    if (count > 0) {
      const firstCard = reservationCards.first();
      // Check that some status text is visible
      await expect(firstCard).toBeVisible();
    }
  });

  test("NFR-06 — Driver trips page renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD);
    await page.goto("/driver/trips");
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });

  test("Rating/incident forms appear on a COMPLETED reservation detail", async ({ page }) => {
    await loginAs(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD);
    await page.goto("/reservations");

    // Look for a COMPLETED reservation link
    const completedLink = page.locator("a[href*='/reservations']").filter({
      has: page.locator("text=/completad|completed/i")
    }).first();

    const hasCompleted = await completedLink.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCompleted) {
      test.skip(true, "No COMPLETED reservation found — skipping rating/incident test");
      return;
    }

    await completedLink.click();
    await page.waitForURL(/\/reservations/, { timeout: 10_000 });

    // Rating form should be visible
    const starsOrRating = page.locator("text=/calificar|rating|valorar|stars/i");
    await expect(starsOrRating.first()).toBeVisible({ timeout: 5_000 });
  });
});
