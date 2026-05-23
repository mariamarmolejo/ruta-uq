import apiClient from "@/lib/axios";
import type { ApiResponse, CreateIncidentRequest, IncidentResponse } from "@/types";

export const incidentsService = {
  async report(data: CreateIncidentRequest): Promise<IncidentResponse> {
    const res = await apiClient.post<ApiResponse<IncidentResponse>>("/incidents", data);
    return res.data.data;
  },

  async getByReservation(reservationId: string): Promise<IncidentResponse | null> {
    try {
      const res = await apiClient.get<ApiResponse<IncidentResponse>>(
        `/incidents/reservation/${reservationId}`
      );
      return res.data.data;
    } catch {
      return null;
    }
  },
};
