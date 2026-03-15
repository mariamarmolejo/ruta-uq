import apiClient from "@/lib/axios";
import type { ApiResponse, CreateVehicleRequest, VehicleSummary } from "@/types";

export const vehiclesService = {
  async getAll(): Promise<VehicleSummary[]> {
    const res = await apiClient.get<ApiResponse<VehicleSummary[]>>("/vehicles");
    return res.data.data;
  },

  async create(data: CreateVehicleRequest): Promise<VehicleSummary> {
    const res = await apiClient.post<ApiResponse<VehicleSummary>>(
      "/vehicles",
      data
    );
    return res.data.data;
  },

  async update(
    id: string,
    data: Partial<CreateVehicleRequest>
  ): Promise<VehicleSummary> {
    const res = await apiClient.put<ApiResponse<VehicleSummary>>(
      `/vehicles/${id}`,
      data
    );
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/vehicles/${id}`);
  },
};
