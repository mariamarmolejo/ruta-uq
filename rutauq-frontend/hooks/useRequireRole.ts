"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import type { Role } from "@/types";

/**
 * Redirects to /trips if the current user does not have one of the allowed roles.
 * Returns true while the check is still loading (i.e., store not yet hydrated).
 */
export function useRequireRole(allowed: Role[]): boolean {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!allowed.includes(user.role)) {
      router.replace("/trips");
    }
  }, [user, isAuthenticated, router, allowed]);

  // Loading state: store not yet hydrated
  return !isAuthenticated || !user;
}
