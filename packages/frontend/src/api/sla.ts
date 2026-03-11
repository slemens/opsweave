import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ─────────────────────────────────────────────────

export interface SlaDefinition {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours: '24/7' | 'business' | 'extended';
  business_hours_start: string | null;
  business_hours_end: string | null;
  business_days: string;
  priority_overrides: string;
  rpo_minutes: number | null;
  rto_minutes: number | null;
  service_window: string;
  escalation_matrix: string;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SlaAssignment {
  id: string;
  tenant_id: string;
  sla_definition_id: string;
  service_id: string | null;
  customer_id: string | null;
  asset_id: string | null;
  priority: number;
  created_at: string;
  service_name?: string | null;
  customer_name?: string | null;
  asset_name?: string | null;
}

export interface CreateSlaDefinitionPayload {
  name: string;
  description?: string | null;
  response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours?: '24/7' | 'business' | 'extended';
  business_hours_start?: string | null;
  business_hours_end?: string | null;
  business_days?: string;
  priority_overrides?: Record<string, unknown>;
  rpo_minutes?: number | null;
  rto_minutes?: number | null;
  service_window?: Record<string, unknown>;
  escalation_matrix?: unknown[];
  is_default?: boolean;
}

export interface UpdateSlaDefinitionPayload extends Partial<CreateSlaDefinitionPayload> {
  is_active?: boolean;
}

export interface CreateSlaAssignmentPayload {
  sla_definition_id: string;
  service_id?: string | null;
  customer_id?: string | null;
  asset_id?: string | null;
}

// ─── Query Keys ────────────────────────────────────────────

export interface SlaPerformanceReport {
  summary: {
    total_tickets: number;
    total_with_sla: number;
    total_breached: number;
    breach_rate: number;
    avg_resolution_hours: number | null;
  };
  by_priority: Array<{
    priority: string;
    total: number;
    breached: number;
    breach_rate: number;
    avg_resolution_hours: number | null;
  }>;
  by_type: Array<{
    ticket_type: string;
    total: number;
    breached: number;
    breach_rate: number;
  }>;
  breach_trend: Array<{
    date: string;
    total: number;
    breached: number;
  }>;
}

const slaKeys = {
  all: ['sla'] as const,
  definitions: () => [...slaKeys.all, 'definitions'] as const,
  definition: (id: string) => [...slaKeys.all, 'definition', id] as const,
  assignments: () => [...slaKeys.all, 'assignments'] as const,
  performanceReport: (days: number) => [...slaKeys.all, 'performance', days] as const,
};

// ─── Definition Hooks ──────────────────────────────────────

export function useSlaDefinitions() {
  return useQuery({
    queryKey: slaKeys.definitions(),
    queryFn: () => apiClient.get<SlaDefinition[]>('/sla/definitions'),
  });
}

export function useSlaDefinition(id: string) {
  return useQuery({
    queryKey: slaKeys.definition(id),
    queryFn: () => apiClient.get<SlaDefinition>(`/sla/definitions/${id}`),
    enabled: !!id,
  });
}

export function useCreateSlaDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSlaDefinitionPayload) =>
      apiClient.post<SlaDefinition>('/sla/definitions', payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: slaKeys.all }),
  });
}

export function useUpdateSlaDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateSlaDefinitionPayload & { id: string }) =>
      apiClient.put<SlaDefinition>(`/sla/definitions/${id}`, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: slaKeys.all }),
  });
}

export function useDeleteSlaDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/sla/definitions/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: slaKeys.all }),
  });
}

// ─── Assignment Hooks ──────────────────────────────────────

export function useSlaAssignments() {
  return useQuery({
    queryKey: slaKeys.assignments(),
    queryFn: () => apiClient.get<SlaAssignment[]>('/sla/assignments'),
  });
}

export function useCreateSlaAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSlaAssignmentPayload) =>
      apiClient.post<SlaAssignment>('/sla/assignments', payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: slaKeys.all }),
  });
}

export function useDeleteSlaAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/sla/assignments/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: slaKeys.all }),
  });
}

// ─── Performance Report Hook ─────────────────────────────────

export function useSlaPerformanceReport(days = 30) {
  return useQuery({
    queryKey: slaKeys.performanceReport(days),
    queryFn: () => apiClient.get<SlaPerformanceReport>(`/sla/reports/performance?days=${days}`),
  });
}
