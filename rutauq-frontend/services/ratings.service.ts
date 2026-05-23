import apiClient from "@/lib/axios";
import type { ApiResponse, CreateRatingRequest, RatingResponse } from "@/types";

export const ratingsService = {
  async rate(data: CreateRatingRequest): Promise<RatingResponse> {
    const res = await apiClient.post<ApiResponse<RatingResponse>>("/ratings", data);
    return res.data.data;
  },

  async getByReservation(reservationId: string): Promise<RatingResponse | null> {
    try {
      const res = await apiClient.get<ApiResponse<RatingResponse>>(
        `/ratings/reservation/${reservationId}`
      );
      return res.data.data;
    } catch {
      return null;
    }
  },
};
