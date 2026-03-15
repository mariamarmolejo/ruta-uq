import apiClient from "@/lib/axios";
import type { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, RegisterResponse } from "@/types";

export const authService = {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const res = await apiClient.post<ApiResponse<RegisterResponse>>(
      "/auth/register",
      data
    );
    return res.data.data;
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      data
    );
    return res.data.data;
  },

  async verifyEmail(token: string): Promise<void> {
    await apiClient.get("/auth/verify-email", { params: { token } });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post("/auth/reset-password", { token, newPassword });
  },

  async resendVerification(email: string): Promise<void> {
    await apiClient.post("/auth/resend-verification", { email });
  },
};
