"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import type { LoginRequest, RegisterRequest } from "@/types";

export function useAuth() {
  const router = useRouter();
  const { setAuth, clearAuth, user, isAuthenticated } = useAuthStore();

  async function login(data: LoginRequest) {
    const response = await authService.login(data);
    setAuth(response);
    const destination =
      response.role === "DRIVER" ? "/driver/trips" : "/trips";
    router.push(destination);
    return response;
  }

  async function register(data: RegisterRequest) {
    const response = await authService.register(data);
    // Do not auto-login — user must verify email first
    router.push(`/check-email?email=${encodeURIComponent(response.email)}`);
    return response;
  }

  function logout() {
    clearAuth();
    router.push("/login");
  }

  return { login, register, logout, user, isAuthenticated };
}
