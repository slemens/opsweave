// =============================================================================
// OpsWeave — Escalation API Hooks (TanStack Query)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ticketKeys } from '@/api/tickets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EscalationRule {
  id: string;
  tenant_id: string;
  name: string;
  ticket_type: string | null;
  priority: string | null;
  sla_threshold_pct: number;
  target_group_id: string;
  escalation_level: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRulePayload {
  name: string;
  ticket_type?: string | null;
  priority?: string | null;
  sla_threshold_pct?: number;
  target_group_id: string;
  escalation_level?: number;
}

export interface UpdateRulePayload {
  name?: string;
  ticket_type?: string | null;
  priority?: string | null;
  sla_threshold_pct?: number;
  target_group_id?: string;
  escalation_level?: number;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const escalationKeys = {
  all: ['escalation'] as const,
  rules: () => [...escalationKeys.all, 'rules'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useEscalationRules() {
  return useQuery({
    queryKey: escalationKeys.rules(),
    queryFn: () => apiClient.get<EscalationRule[]>('/escalation/rules'),
  });
}

export function useCreateEscalationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRulePayload) =>
      apiClient.post<EscalationRule>('/escalation/rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.rules() });
    },
  });
}

export function useUpdateEscalationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateRulePayload & { id: string }) =>
      apiClient.put<EscalationRule>(`/escalation/rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.rules() });
    },
  });
}

export function useDeleteEscalationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/escalation/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.rules() });
    },
  });
}

export function useManualEscalate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...data }: { ticketId: string; target_group_id: string; reason?: string }) =>
      apiClient.post(`/escalation/tickets/${ticketId}/escalate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useDeclareMajorIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...data }: { ticketId: string; incident_commander_id?: string | null; bridge_call_url?: string | null }) =>
      apiClient.post(`/escalation/tickets/${ticketId}/major-incident`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useResolveMajorIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: string) =>
      apiClient.post(`/escalation/tickets/${ticketId}/resolve-major`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}
