import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { authService } from '@/services/auth.service';

// Mock Expo Router
jest.mock('expo-router', () => ({
  router:   { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  Link:     ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({}),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync:    jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

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

// Mock authService
jest.mock('@/services/auth.service', () => ({
  authService: {
    login: jest.fn(),
  },
}));

// Mock the auth store
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => {
    const state = {
      isAuthenticated: false,
      setAuth: jest.fn().mockResolvedValue(undefined),
    };
    return selector(state);
  },
}));

import LoginScreen from '@/app/(auth)/login';

const mockLogin = authService.login as jest.Mock;

describe('Login flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form fields', () => {
    render(<LoginScreen />);
    expect(screen.getByAccessibilityLabel('Correo electrónico')).toBeTruthy();
    expect(screen.getByAccessibilityLabel('Contraseña')).toBeTruthy();
    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
  });

  it('shows validation error for invalid email', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByAccessibilityLabel('Correo electrónico'), 'not-email');
    fireEvent.press(screen.getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(screen.getByText('Ingresa un correo válido')).toBeTruthy();
    });
  });

  it('calls authService.login with correct credentials', async () => {
    mockLogin.mockResolvedValue({
      token:     'jwt-token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      email:     'user@uniquindio.edu.co',
      firstName: 'Test',
      lastName:  'User',
      role:      'CLIENT',
    });

    render(<LoginScreen />);

    fireEvent.changeText(
      screen.getByAccessibilityLabel('Correo electrónico'),
      'user@uniquindio.edu.co'
    );
    fireEvent.changeText(screen.getByAccessibilityLabel('Contraseña'), 'Password1');
    fireEvent.press(screen.getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email:    'user@uniquindio.edu.co',
        password: 'Password1',
      });
    });
  });

  it('shows error toast on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales inválidas'));
    const Toast = require('react-native-toast-message').default;

    render(<LoginScreen />);

    fireEvent.changeText(
      screen.getByAccessibilityLabel('Correo electrónico'),
      'user@uniquindio.edu.co'
    );
    fireEvent.changeText(screen.getByAccessibilityLabel('Contraseña'), 'Password1');
    fireEvent.press(screen.getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});
