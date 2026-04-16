import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse, Role } from '@/types';

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

  setAuth: (response: AuthResponse) => Promise<void>;
  clearAuth: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: async (response: AuthResponse) => {
        // Store raw token in SecureStore (encrypted)
        try {
          await SecureStore.setItemAsync('access_token', response.token);
        } catch {
          // SecureStore unavailable on web/simulator — gracefully ignore
        }
        set({
          token: response.token,
          user: {
            email:     response.email,
            firstName: response.firstName,
            lastName:  response.lastName,
            role:      response.role,
          },
          isAuthenticated: true,
        });
      },

      clearAuth: async () => {
        try {
          await SecureStore.deleteItemAsync('access_token');
        } catch {
          // ignore
        }
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'rutauq-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive user info; token is in SecureStore
      partialize: (state) => ({
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
        // We keep token here too so the store hydrates correctly, but the
        // source-of-truth for axios is always SecureStore.
        token:           state.token,
      }),
    }
  )
);
