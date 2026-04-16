import { useAuthStore } from '@/stores/auth.store';
import type { AuthResponse } from '@/types';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync:    jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync:    jest.fn().mockResolvedValue(null),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockAuthResponse: AuthResponse = {
  token:     'test-jwt-token',
  tokenType: 'Bearer',
  expiresIn: 86400,
  email:     'test@uniquindio.edu.co',
  firstName: 'Juan',
  lastName:  'Pérez',
  role:      'CLIENT',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token:           null,
      user:            null,
      isAuthenticated: false,
    });
  });

  it('setAuth stores user data and marks as authenticated', async () => {
    await useAuthStore.getState().setAuth(mockAuthResponse);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('test-jwt-token');
    expect(state.user).toEqual({
      email:     'test@uniquindio.edu.co',
      firstName: 'Juan',
      lastName:  'Pérez',
      role:      'CLIENT',
    });
  });

  it('clearAuth removes all auth state', async () => {
    await useAuthStore.getState().setAuth(mockAuthResponse);
    await useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('updateUser patches only the specified fields', async () => {
    await useAuthStore.getState().setAuth(mockAuthResponse);
    useAuthStore.getState().updateUser({ firstName: 'Carlos' });

    const { user } = useAuthStore.getState();
    expect(user?.firstName).toBe('Carlos');
    expect(user?.lastName).toBe('Pérez');
    expect(user?.email).toBe('test@uniquindio.edu.co');
  });

  it('updateUser is a no-op when user is null', () => {
    useAuthStore.getState().updateUser({ firstName: 'Carlos' });
    expect(useAuthStore.getState().user).toBeNull();
  });
});
