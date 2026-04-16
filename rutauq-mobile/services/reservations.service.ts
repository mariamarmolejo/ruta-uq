import apiClient from '@/lib/axios';
import type { ApiResponse, CreateReservationRequest, ReservationResponse } from '@/types';

export const reservationsService = {
  async create(data: CreateReservationRequest): Promise<ReservationResponse> {
    const res = await apiClient.post<ApiResponse<ReservationResponse>>('/reservations', data);
    return res.data.data;
  },

  async getAll(): Promise<ReservationResponse[]> {
    const res = await apiClient.get<ApiResponse<ReservationResponse[]>>('/reservations');
    return res.data.data;
  },

  async getById(id: string): Promise<ReservationResponse> {
    const res = await apiClient.get<ApiResponse<ReservationResponse>>(`/reservations/${id}`);
    return res.data.data;
  },

  async cancel(id: string): Promise<void> {
    await apiClient.delete(`/reservations/${id}`);
  },
};
