import apiClient from '@/lib/axios';
import type {
  ApiResponse,
  DriverProfileResponse,
  CreateDriverProfileRequest,
  UpdateUserProfileRequest,
  UserProfile,
} from '@/types';

export const usersService = {
  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<ApiResponse<UserProfile>>('/users/me');
    return res.data.data;
  },

  async updateMe(data: UpdateUserProfileRequest): Promise<UserProfile> {
    const res = await apiClient.put<ApiResponse<UserProfile>>('/users/me', data);
    return res.data.data;
  },

  async getDriverProfile(): Promise<DriverProfileResponse> {
    const res = await apiClient.get<ApiResponse<DriverProfileResponse>>('/drivers/me');
    return res.data.data;
  },

  async createDriverProfile(data: CreateDriverProfileRequest): Promise<DriverProfileResponse> {
    const res = await apiClient.post<ApiResponse<DriverProfileResponse>>('/drivers/me', data);
    return res.data.data;
  },

  async updateDriverProfile(data: Partial<CreateDriverProfileRequest>): Promise<DriverProfileResponse> {
    const res = await apiClient.put<ApiResponse<DriverProfileResponse>>('/drivers/me', data);
    return res.data.data;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const res = await apiClient.get<ApiResponse<UserProfile[]>>('/admin/users');
    return res.data.data;
  },

  async getAllTripsAdmin() {
    const res = await apiClient.get('/admin/trips');
    return res.data.data;
  },
};
