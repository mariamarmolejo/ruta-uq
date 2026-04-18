import apiClient from "@/lib/axios";
import type { ApiResponse, RefundResponse } from "@/types";

export const refundsService = {
  async request(reservationId: string): Promise<RefundResponse> {
    const res = await apiClient.post<ApiResponse<RefundResponse>>("/refunds", {
      reservationId,
    });
    return res.data.data;
  },

  async getMy(): Promise<RefundResponse[]> {
    const res = await apiClient.get<ApiResponse<RefundResponse[]>>("/refunds/my");
    return res.data.data;
  },

  async getByReservation(reservationId: string): Promise<RefundResponse | null> {
    const all = await refundsService.getMy();
    return all.find((r) => r.reservationId === reservationId) ?? null;
  },
};
