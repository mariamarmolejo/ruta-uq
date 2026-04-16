import apiClient from '@/lib/axios';
import type { ApiResponse, CreateTripRequest, ReservationResponse, TripResponse } from '@/types';

export interface TripSearchParams {
  origin?:      string;
  destination?: string;
  date?:        string;
  minSeats?:    number;
}

export const tripsService = {
  async search(params?: TripSearchParams): Promise<TripResponse[]> {
    const res = await apiClient.get<ApiResponse<TripResponse[]>>('/trips', { params });
    return res.data.data;
  },

  async getById(id: string): Promise<TripResponse> {
    const res = await apiClient.get<ApiResponse<TripResponse>>(`/trips/${id}`);
    return res.data.data;
  },

  async getMyTrips(): Promise<TripResponse[]> {
    const res = await apiClient.get<ApiResponse<TripResponse[]>>('/trips/my');
    return res.data.data;
  },

  async create(data: CreateTripRequest): Promise<TripResponse> {
    const res = await apiClient.post<ApiResponse<TripResponse>>('/trips', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<CreateTripRequest>): Promise<TripResponse> {
    const res = await apiClient.put<ApiResponse<TripResponse>>(`/trips/${id}`, data);
    return res.data.data;
  },

  async cancel(id: string): Promise<void> {
    await apiClient.delete(`/trips/${id}`);
  },

  async start(id: string): Promise<TripResponse> {
    const res = await apiClient.patch<ApiResponse<TripResponse>>(`/trips/${id}/start`);
    return res.data.data;
  },

  async complete(id: string): Promise<TripResponse> {
    const res = await apiClient.patch<ApiResponse<TripResponse>>(`/trips/${id}/complete`);
    return res.data.data;
  },

  async getReservations(tripId: string): Promise<ReservationResponse[]> {
    const res = await apiClient.get<ApiResponse<ReservationResponse[]>>(
      `/trips/${tripId}/reservations`
    );
    return res.data.data;
  },
};
