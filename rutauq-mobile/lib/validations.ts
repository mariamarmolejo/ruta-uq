import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName:  z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email:     z.string().email('Ingresa un correo válido'),
  password:  z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'El teléfono debe tener 10 dígitos')
    .optional()
    .or(z.literal('')),
  role: z.enum(['CLIENT', 'DRIVER'] as const),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName:  z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'El teléfono debe tener 10 dígitos')
    .optional()
    .or(z.literal('')),
});

export const tripSchema = z.object({
  origin:        z.string().min(3, 'El origen debe tener al menos 3 caracteres'),
  destination:   z.string().min(3, 'El destino debe tener al menos 3 caracteres'),
  departureTime: z.string().min(1, 'Selecciona la fecha de salida'),
  availableSeats: z.coerce
    .number()
    .int()
    .min(1, 'Mínimo 1 puesto')
    .max(8, 'Máximo 8 puestos'),
  pricePerSeat: z.coerce
    .number()
    .positive('El precio debe ser mayor a 0'),
  vehicleId:   z.string().min(1, 'Selecciona un vehículo'),
  description: z.string().optional(),
});

export const vehicleSchema = z.object({
  brand: z.string().min(2, 'La marca debe tener al menos 2 caracteres'),
  model: z.string().min(1, 'El modelo es requerido'),
  year:  z.coerce
    .number()
    .int()
    .min(1990, 'El año mínimo es 1990')
    .max(new Date().getFullYear() + 1, 'Año inválido'),
  color: z.string().min(2, 'El color es requerido'),
  plate: z
    .string()
    .regex(/^[A-Z]{3}-[0-9]{3}$/, 'Formato: ABC-123 (3 letras, guion, 3 números)'),
  seats: z.coerce.number().int().min(1, 'Mínimo 1 puesto').max(8, 'Máximo 8 puestos'),
});

export const reservationSchema = z.object({
  seatsReserved: z.coerce
    .number()
    .int()
    .min(1, 'Mínimo 1 puesto')
    .max(4, 'Máximo 4 puestos'),
});

export type LoginForm          = z.infer<typeof loginSchema>;
export type RegisterForm       = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm  = z.infer<typeof resetPasswordSchema>;
export type ProfileForm        = z.infer<typeof profileSchema>;
export type TripForm           = z.infer<typeof tripSchema>;
export type VehicleForm        = z.infer<typeof vehicleSchema>;
export type ReservationForm    = z.infer<typeof reservationSchema>;
