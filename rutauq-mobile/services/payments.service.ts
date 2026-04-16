import apiClient from '@/lib/axios';
import type { ApiResponse, CreatePaymentRequest, PaymentResponse, PseBankOption } from '@/types';

export const paymentsService = {
  async create(data: CreatePaymentRequest): Promise<PaymentResponse> {
    const res = await apiClient.post<ApiResponse<PaymentResponse>>('/payments/create', data);
    return res.data.data;
  },

  async getById(id: string): Promise<PaymentResponse> {
    const res = await apiClient.get<ApiResponse<PaymentResponse>>(`/payments/${id}`);
    return res.data.data;
  },

  async getByReservation(reservationId: string): Promise<PaymentResponse> {
    const res = await apiClient.get<ApiResponse<PaymentResponse>>(
      `/payments/reservation/${reservationId}`
    );
    return res.data.data;
  },

  async getPseBanks(): Promise<PseBankOption[]> {
    const res = await apiClient.get<ApiResponse<PseBankOption[]>>('/payments/pse-banks');
    return res.data.data;
  },
};
