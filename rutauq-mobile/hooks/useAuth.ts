import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  const token          = useAuthStore((s) => s.token);
  const user           = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth        = useAuthStore((s) => s.setAuth);
  const clearAuth      = useAuthStore((s) => s.clearAuth);
  const updateUser     = useAuthStore((s) => s.updateUser);

  return { token, user, isAuthenticated, setAuth, clearAuth, updateUser };
}
