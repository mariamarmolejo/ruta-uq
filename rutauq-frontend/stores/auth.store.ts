"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse, Role } from "@/types";

interface AuthUser {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;

  setAuth: (response: AuthResponse) => void;
  clearAuth: () => void;
  /** Updates only the display fields (name, phone) without touching the token or cookie. */
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (response: AuthResponse) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", response.token);
          // Cookie is read by middleware for SSR route protection
          document.cookie = `access_token=${response.token}; path=/; max-age=${response.expiresIn}; SameSite=Lax`;
        }
        set({
          token: response.token,
          user: {
            email: response.email,
            firstName: response.firstName,
            lastName: response.lastName,
            role: response.role,
          },
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
        }
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "rutauq-auth",
      // Only persist user info — token is also in localStorage via setAuth
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
