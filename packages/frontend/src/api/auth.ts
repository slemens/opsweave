import { apiClient } from './client';
import type { AuthUser } from '@/stores/auth-store';

interface LoginResponse {
  user: AuthUser;
  token: string;
}

interface MeResponse {
  user: AuthUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', { email, password });
  },

  async logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout');
  },

  async getMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>('/auth/me');
  },

  async switchTenant(tenantId: string): Promise<{ token: string }> {
    return apiClient.post<{ token: string }>('/auth/switch-tenant', { tenant_id: tenantId });
  },
};
