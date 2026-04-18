import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT on every request — SecureStore on native, Zustand store on web
apiClient.interceptors.request.use(async (config) => {
  let token: string | null = null;
  try {
    token = await SecureStore.getItemAsync('access_token');
  } catch {
    // SecureStore unavailable on web — fall back to in-memory store
    token = useAuthStore.getState().token;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth state and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      try {
        await SecureStore.deleteItemAsync('access_token');
      } catch {
        // ignore
      }
      useAuthStore.getState().clearAuth();
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
