import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * Default target: http://localhost:3000 (local dev server).
 * Set BASE_URL=https://www.rutauq.online to run against the deployed app.
 *
 * Seed accounts (must exist in the target DB):
 *   DRIVER  — e2e.driver@rutauq.test  / E2eTest123!
 *   CLIENT  — e2e.client@rutauq.test  / E2eTest123!
 *
 * To create seed accounts locally, run:
 *   cd rutaUQ-backend && mvn test -pl . -Dtest=E2eSeedSetup
 * Or use the seed API script: rutauq-frontend/e2e/seed.ts
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                        // sequential — tests share DB state
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL:       process.env.BASE_URL ?? "http://localhost:3000",
    trace:         "on-first-retry",
    screenshot:    "only-on-failure",
    video:         "retain-on-failure",
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use:  { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use:  { ...devices["Pixel 5"] },       // NFR-06: mobile viewport
    },
    {
      name: "tablet",
      use:  { ...devices["iPad (gen 7)"] },  // NFR-06: tablet viewport
    },
  ],
});
