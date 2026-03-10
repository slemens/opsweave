import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from './client';
import type { AuthUser, TenantInfo } from '@/stores/auth-store';

interface LoginResponse {
  user: AuthUser;
  token: string;
  tenants: TenantInfo[];
}

interface MeResponse {
  user: AuthUser;
  tenants: TenantInfo[];
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

// AUDIT-FIX: H-07 — Password change mutation hook
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiClient.patch<{ message: string }>('/auth/change-password', data),
  });
}

// AUDIT-FIX: H-08 — Portal user CRUD hooks

export interface PortalUser {
  id: string;
  customer_id: string;
  email: string;
  display_name: string;
  is_active: number;
  last_login: string | null;
  created_at: string;
}

const portalUserKeys = {
  all: ['portal-users'] as const,
  byCustomer: (customerId: string) => [...portalUserKeys.all, customerId] as const,
};

export function usePortalUsers(customerId: string | undefined) {
  return useQuery({
    queryKey: portalUserKeys.byCustomer(customerId ?? ''),
    queryFn: () => apiClient.get<PortalUser[]>(`/customers/${customerId}/portal-users`),
    enabled: !!customerId,
  });
}

export function useCreatePortalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, ...data }: { customerId: string; email: string; display_name: string; password: string }) =>
      apiClient.post<PortalUser>(`/customers/${customerId}/portal-users`, data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: portalUserKeys.byCustomer(vars.customerId) });
    },
  });
}

export function useUpdatePortalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, userId, ...data }: { customerId: string; userId: string; display_name?: string; is_active?: number }) =>
      apiClient.put<PortalUser>(`/customers/${customerId}/portal-users/${userId}`, data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: portalUserKeys.byCustomer(vars.customerId) });
    },
  });
}

export function useDeletePortalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, userId }: { customerId: string; userId: string }) =>
      apiClient.delete(`/customers/${customerId}/portal-users/${userId}`),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: portalUserKeys.byCustomer(vars.customerId) });
    },
  });
}
