import apiClient from "@/lib/axios";
import type { ApiResponse, UpdateUserProfileRequest, UserProfile } from "@/types";

export const usersService = {
  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<ApiResponse<UserProfile>>("/users/me");
    return res.data.data;
  },

  async updateMe(data: UpdateUserProfileRequest): Promise<UserProfile> {
    const res = await apiClient.put<ApiResponse<UserProfile>>("/users/me", data);
    return res.data.data;
  },
};
