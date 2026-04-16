import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from './useAuth';
import type { Role } from '@/types';

/**
 * Redirects to the main app if the current user does not have one of the
 * allowed roles. Use this in role-restricted screens.
 */
export function useRequireRole(allowedRoles: Role[]) {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    if (user && !allowedRoles.includes(user.role)) {
      // Redirect to the trips tab (safe fallback)
      router.replace('/(app)/trips');
    }
  }, [isAuthenticated, user, allowedRoles]);

  return { user, isAuthenticated };
}
