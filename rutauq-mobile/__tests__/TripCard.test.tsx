import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TripCard } from '@/components/trips/TripCard';
import type { TripResponse } from '@/types';

const mockTrip: TripResponse = {
  id:             'trip-123',
  origin:         'Armenia, Quindío',
  destination:    'Pereira, Risaralda',
  departureTime:  '2024-03-18T07:30:00Z',
  availableSeats: 3,
  pricePerSeat:   15000,
  status:         'SCHEDULED',
  description:    'Viaje directo sin paradas',
  createdAt:      '2024-03-01T10:00:00Z',
  updatedAt:      '2024-03-01T10:00:00Z',
  driver: {
    id:        'driver-1',
    firstName: 'Carlos',
    lastName:  'García',
    email:     'carlos@uniquindio.edu.co',
  },
  vehicle: {
    id:    'vehicle-1',
    brand: 'Chevrolet',
    model: 'Spark',
    year:  2020,
    color: 'Blanco',
    plate: 'ABC-123',
    seats: 4,
  },
};

describe('TripCard', () => {
  it('renders origin and destination', () => {
    render(<TripCard trip={mockTrip} />);
    expect(screen.getByText('Armenia, Quindío')).toBeTruthy();
    expect(screen.getByText('Pereira, Risaralda')).toBeTruthy();
  });

  it('renders driver name', () => {
    render(<TripCard trip={mockTrip} />);
    expect(screen.getByText(/Carlos García/)).toBeTruthy();
  });

  it('renders available seats', () => {
    render(<TripCard trip={mockTrip} />);
    expect(screen.getByText(/3 puestos/)).toBeTruthy();
  });

  it('renders price per seat', () => {
    render(<TripCard trip={mockTrip} />);
    // Price text is split, so check for part
    expect(screen.getByText(/\/puesto/)).toBeTruthy();
  });

  it('renders status badge', () => {
    render(<TripCard trip={mockTrip} />);
    expect(screen.getByText('Programado')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<TripCard trip={mockTrip} onPress={onPress} />);
    fireEvent.press(screen.getByAccessibilityHint('Toca para ver los detalles del viaje'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders CANCELLED status badge', () => {
    const cancelledTrip: TripResponse = { ...mockTrip, status: 'CANCELLED' };
    render(<TripCard trip={cancelledTrip} />);
    expect(screen.getByText('Cancelado')).toBeTruthy();
  });
});
