import { formatCurrency, formatDate, getErrorMessage, TRIP_STATUS_LABEL, RESERVATION_STATUS_LABEL } from '@/lib/utils';
import { AxiosError } from 'axios';

describe('formatCurrency', () => {
  it('formats COP amounts correctly', () => {
    const result = formatCurrency(15000);
    expect(result).toContain('15');
    expect(result).toContain('$');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('$');
  });
});

describe('formatDate', () => {
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns em dash for invalid string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('formats a valid ISO date', () => {
    const result = formatDate('2024-03-18T07:30:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
  });
});

describe('getErrorMessage', () => {
  it('extracts message from AxiosError response', () => {
    const err = new AxiosError('request failed');
    err.response = {
      data:    { message: 'Correo ya registrado' },
      status:  409,
      statusText: 'Conflict',
      headers: {},
      config:  {} as never,
    };
    expect(getErrorMessage(err)).toBe('Correo ya registrado');
  });

  it('returns 401 message for unauthorized without body', () => {
    const err = new AxiosError('unauthorized');
    err.response = {
      data:    {},
      status:  401,
      statusText: 'Unauthorized',
      headers: {},
      config:  {} as never,
    };
    expect(getErrorMessage(err)).toContain('Credenciales');
  });

  it('returns network error message when no response', () => {
    const err = new AxiosError('Network Error');
    expect(getErrorMessage(err)).toContain('Sin conexión');
  });

  it('returns Error.message for generic errors', () => {
    const err = new Error('Something broke');
    expect(getErrorMessage(err)).toBe('Something broke');
  });

  it('returns fallback for unknown errors', () => {
    expect(getErrorMessage('not an error')).toBe('Error desconocido. Intenta de nuevo.');
  });
});

describe('TRIP_STATUS_LABEL', () => {
  it('has Spanish labels for all statuses', () => {
    expect(TRIP_STATUS_LABEL.SCHEDULED).toBe('Programado');
    expect(TRIP_STATUS_LABEL.IN_PROGRESS).toBe('En curso');
    expect(TRIP_STATUS_LABEL.COMPLETED).toBe('Completado');
    expect(TRIP_STATUS_LABEL.CANCELLED).toBe('Cancelado');
  });
});

describe('RESERVATION_STATUS_LABEL', () => {
  it('has Spanish labels for all statuses', () => {
    expect(RESERVATION_STATUS_LABEL.PENDING_PAYMENT).toBe('Pago pendiente');
    expect(RESERVATION_STATUS_LABEL.CONFIRMED).toBe('Confirmada');
    expect(RESERVATION_STATUS_LABEL.PAYMENT_FAILED).toBe('Pago fallido');
    expect(RESERVATION_STATUS_LABEL.CANCELLED).toBe('Cancelada');
    expect(RESERVATION_STATUS_LABEL.COMPLETED).toBe('Completada');
  });
});
