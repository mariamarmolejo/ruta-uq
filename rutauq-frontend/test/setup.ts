import "@testing-library/jest-dom";
import { vi } from "vitest";

// ── Next.js navigation mock ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter:      () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname:    () => "/",
}));

// ── next-intl mock — returns the translation key so assertions are stable ────
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale:       () => "es",
}));

// ── next/script mock ─────────────────────────────────────────────────────────
vi.mock("next/script", () => ({
  default: ({ onLoad }: { onLoad?: () => void }) => {
    onLoad?.();
    return null;
  },
}));

// ── react-google-recaptcha mock ───────────────────────────────────────────────
vi.mock("react-google-recaptcha", () => ({
  default: vi.fn(({ onChange }: { onChange: (token: string) => void }) => {
    // Expose a test helper to trigger the captcha programmatically
    return null;
  }),
}));

// ── @react-oauth/google mock ──────────────────────────────────────────────────
vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useGoogleLogin: () => vi.fn(),
}));

// ── Zustand persistence — avoid localStorage side-effects in tests ────────────
vi.mock("zustand/middleware", async (importOriginal) => {
  const original = await importOriginal<typeof import("zustand/middleware")>();
  return {
    ...original,
    persist: (fn: unknown) => fn,
  };
});

// ── Silence console.error from expected React warnings ───────────────────────
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ") || args[0].includes("ReactDOM.render"))
    )
      return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
