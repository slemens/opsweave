// =============================================================================
// OpsWeave — Customer API Hooks (TanStack Query)
// =============================================================================

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginationMeta } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerSummary {
  id: string;
  name: string;
  industry: string | null;
  contact_email: string | null;
  is_active: number;
}

export interface CustomersResponse {
  data: CustomerSummary[];
  meta: PaginationMeta;
}

export interface CustomerOverview {
  customer: CustomerSummary & { industry: string | null; created_at: string };
  stats: {
    total_assets: number;
    total_tickets: number;
    open_tickets: number;
    sla_breached_tickets: number;
    portal_users: number;
  };
  assets: Array<{
    id: string;
    display_name: string;
    asset_type: string;
    status: string;
    sla_tier: string;
  }>;
  recent_tickets: Array<{
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    sla_breached: number;
    created_at: string;
  }>;
  sla_assignments: Array<{
    id: string;
    scope: 'customer' | 'customer_service' | 'asset';
    scope_label: string | null;
    definition: {
      id: string;
      name: string;
      response_time_minutes: number;
      resolution_time_minutes: number;
      business_hours: string;
    };
  }>;
  vertical_catalogs: Array<{
    id: string;
    name: string;
    base_catalog_name: string | null;
    industry: string | null;
    status: string;
    override_count: number;
  }>;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const customerKeys = {
  all: ['customers'] as const,
  list: () => [...customerKeys.all, 'list'] as const,
  overview: (id: string) => [...customerKeys.all, 'overview', id] as const,
};

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: async () => {
      return apiClient.get<CustomersResponse>('/customers', { params: { limit: 100 } });
    },
  });
}

export function useCustomerOverview(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.overview(id ?? ''),
    queryFn: async () => apiClient.get<CustomerOverview>(`/customers/${id!}/overview`),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; industry?: string | null; contact_email?: string | null; is_active?: number }) => {
      return apiClient.post<CustomerSummary>('/customers', data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; industry?: string | null; contact_email?: string | null; is_active?: number }) => {
      return apiClient.put<CustomerSummary>(`/customers/${id}`, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<CustomerSummary>(`/customers/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
