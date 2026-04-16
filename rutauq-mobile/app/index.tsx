import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Splash redirect: send authenticated users to the app, others to login.
 */
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Small delay lets Zustand rehydrate from AsyncStorage
    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(app)/trips');
      } else {
        router.replace('/(auth)/login');
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [isAuthenticated]);

  return null;
}
