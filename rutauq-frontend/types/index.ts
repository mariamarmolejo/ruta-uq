// ---- Generic API envelope ----

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
  timestamp: string;
}

// ---- Auth ----

export type Role = "CLIENT" | "DRIVER" | "ADMIN";

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
  captchaToken?: string;
}

export interface RegisterResponse {
  email: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ---- Users ----

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  privacyAccepted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  firstName: string;
  lastName: string;
  phone?: string;
}

// ---- Drivers ----

export interface VehicleSummary {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  seats: number;
}

export interface CreateVehicleRequest {
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  seats: number;
}

export interface DriverSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface DriverProfileResponse {
  id: string;
  licenseNumber: string;
  experience: number;
  vehicles: VehicleSummary[];
}

export interface CreateDriverProfileRequest {
  licenseNumber: string;
  experience: number;
}

// ---- Trips ----

export type TripStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface TripResponse {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  status: TripStatus;
  description?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  driver: DriverSummary;
  vehicle: VehicleSummary;
}

export interface CreateTripRequest {
  origin: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  vehicleId: string;
  description?: string;
}

// ---- Reservations ----

export type ReservationStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "COMPLETED";

export interface PassengerSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TripSummary {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  pricePerSeat: number;
  status: TripStatus;
}

export interface ReservationResponse {
  id: string;
  status: ReservationStatus;
  seatsReserved: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  trip: TripSummary;
  passenger: PassengerSummary;
}

export interface CreateReservationRequest {
  tripId: string;
  seatsReserved: number;
}

// ---- Payments ----

export type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";

export interface PaymentResponse {
  id: string;
  reservationId: string;
  mercadoPagoPaymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: string;
  externalReference: string;
  redirectUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  reservationId: string;
  paymentType: string;
  // Card fields
  cardToken?: string;
  paymentMethodId?: string;
  installments?: number;
  payerEmail?: string;
  // PSE fields
  financialInstitution?: string;
  docType?: string;
  docNumber?: string;
  entityType?: string;
  callbackUrl?: string;
}

export interface PseBankOption {
  id: string;
  description: string;
}

// ---- Refunds ----

export type RefundStatus = "PENDING" | "PROCESSED" | "FAILED";

export interface RefundResponse {
  id: string;
  reservationId: string;
  paymentId: string;
  amount: number;
  status: RefundStatus;
  reason: string | null;
  mpRefundId: string | null;
  requestedAt: string;
  processedAt: string | null;
}
