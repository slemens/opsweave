import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ────────────────────────────────────────────────

export interface MonitoringSource {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  config: string;
  webhook_secret: string | null;
  is_active: number;
  created_at: string;
}

export interface MonitoringEvent {
  id: string;
  tenant_id: string;
  source_id: string;
  external_id: string | null;
  hostname: string;
  service_name: string | null;
  state: string;
  output: string | null;
  matched_asset_id: string | null;
  ticket_id: string | null;
  processed: number;
  received_at: string;
  processed_at: string | null;
}

export interface EventListResponse {
  data: MonitoringEvent[];
  meta: { total: number; page: number; limit: number };
}

export interface EventStats {
  ok: number;
  warning: number;
  critical: number;
  unknown: number;
}

export interface EventFilters {
  source_id?: string;
  state?: string;
  hostname?: string;
  from?: string;
  to?: string;
  processed?: string;
  q?: string;
  page?: number;
  limit?: number;
}

// ─── Query Keys ───────────────────────────────────────────

export const monitoringKeys = {
  all: ['monitoring'] as const,
  sources: () => [...monitoringKeys.all, 'sources'] as const,
  sourceDetail: (id: string) => [...monitoringKeys.all, 'source', id] as const,
  events: (filters?: EventFilters) => [...monitoringKeys.all, 'events', filters] as const,
  stats: () => [...monitoringKeys.all, 'stats'] as const,
};

// ─── Sources Queries ──────────────────────────────────────

export function useMonitoringSources() {
  return useQuery({
    queryKey: monitoringKeys.sources(),
    queryFn: () => apiClient.get<MonitoringSource[]>('/monitoring/sources'),
  });
}

export function useMonitoringSource(id: string | undefined) {
  return useQuery({
    queryKey: monitoringKeys.sourceDetail(id ?? ''),
    queryFn: () => apiClient.get<MonitoringSource>(`/monitoring/sources/${id!}`),
    enabled: !!id,
  });
}

// ─── Sources Mutations ────────────────────────────────────

export function useCreateMonitoringSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MonitoringSource>) =>
      apiClient.post<MonitoringSource>('/monitoring/sources', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: monitoringKeys.sources() }),
  });
}

export function useUpdateMonitoringSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MonitoringSource> }) =>
      apiClient.put<MonitoringSource>(`/monitoring/sources/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: monitoringKeys.sources() }),
  });
}

export function useDeleteMonitoringSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/monitoring/sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: monitoringKeys.sources() }),
  });
}

// ─── Events Queries ───────────────────────────────────────

export function useMonitoringEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: monitoringKeys.events(filters),
    queryFn: () =>
      apiClient.get<EventListResponse>('/monitoring/events', {
        params: filters as Record<string, string | number | boolean | undefined>,
      }),
    refetchInterval: 30_000, // Auto-refresh every 30s
  });
}

export function useMonitoringEventStats() {
  return useQuery({
    queryKey: monitoringKeys.stats(),
    queryFn: () => apiClient.get<EventStats>('/monitoring/events/stats'),
    refetchInterval: 30_000,
  });
}

// ─── Events Mutations ─────────────────────────────────────

export function useAcknowledgeEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.put<MonitoringEvent>(`/monitoring/events/${id}/acknowledge`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: monitoringKeys.all });
    },
  });
}
