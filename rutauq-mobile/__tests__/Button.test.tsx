import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Iniciar sesión</Button>);
    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Tap me</Button>);
    fireEvent.press(screen.getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button disabled onPress={onPress}>Disabled</Button>);
    fireEvent.press(screen.getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    render(<Button loading onPress={onPress}>Loading</Button>);
    fireEvent.press(screen.getByText('Loading'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders primary variant by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeTruthy();
  });

  it('renders danger variant', () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByText('Eliminar')).toBeTruthy();
  });

  it('renders outline variant', () => {
    render(<Button variant="outline">Cancelar</Button>);
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Volver</Button>);
    expect(screen.getByText('Volver')).toBeTruthy();
  });

  it('has correct accessibility role', () => {
    render(<Button>Accessible</Button>);
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
