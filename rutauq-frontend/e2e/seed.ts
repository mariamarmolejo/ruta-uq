/**
 * E2E seed helper.
 *
 * Creates or verifies the test accounts needed by E2E tests.
 * Run once before the first E2E run:
 *
 *   BASE_URL=https://www.rutauq.online npx tsx e2e/seed.ts
 *
 * The script:
 *  1. Registers the driver account (E2E_DRIVER_EMAIL).
 *  2. Registers the client account (E2E_CLIENT_EMAIL).
 *  3. If the API returns 409 (already exists) it continues — idempotent.
 *
 * IMPORTANT: After running this script you must MANUALLY verify the accounts
 * by clicking the verification link sent to the email addresses, OR by using
 * the backend repository to set emailVerified=true directly in the database:
 *
 *   UPDATE users SET email_verified = true
 *   WHERE email IN ('e2e.driver@rutauq.test', 'e2e.client@rutauq.test');
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const API_URL  = process.env.NEXT_PUBLIC_API_URL ?? `${BASE_URL.replace(":3000", ":8080")}/api/v1`;

export const E2E_DRIVER_EMAIL    = process.env.E2E_DRIVER_EMAIL    ?? "e2e.driver@rutauq.test";
export const E2E_CLIENT_EMAIL    = process.env.E2E_CLIENT_EMAIL    ?? "e2e.client@rutauq.test";
export const E2E_DRIVER_PASSWORD = process.env.E2E_DRIVER_PASSWORD ?? "E2eTest123!";
export const E2E_CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD ?? "E2eTest123!";

async function registerAccount(
  email: string, password: string, role: "DRIVER" | "CLIENT",
  firstName: string, lastName: string
) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, firstName, lastName }),
  });
  if (res.status === 409) {
    console.log(`  ⚠  ${email} already exists — skipping registration`);
    return;
  }
  if (!res.ok) {
    const body = await res.text();
    console.error(`  ✗  Failed to register ${email}: ${body}`);
  } else {
    console.log(`  ✓  Registered ${email} (${role}) — verify email before running E2E tests`);
  }
}

async function main() {
  console.log(`\nE2E seed — target API: ${API_URL}\n`);
  await registerAccount(E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD, "DRIVER", "E2E", "Driver");
  await registerAccount(E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD, "CLIENT", "E2E", "Client");
  console.log("\nDone. Remember to verify accounts in the DB before running E2E tests.\n");
}

main().catch(console.error);
