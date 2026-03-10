import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  actor_id: string;
  actor_email: string;
  event_type: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogParams {
  page?: number;
  limit?: number;
  event_type?: string;
  resource_type?: string;
  actor_id?: string;
  q?: string;
  from?: string;
  to?: string;
}

const auditKeys = {
  all: ['audit'] as const,
  list: (params: AuditLogParams) => [...auditKeys.all, 'list', params] as const,
  eventTypes: () => [...auditKeys.all, 'event-types'] as const,
  resourceTypes: () => [...auditKeys.all, 'resource-types'] as const,
};

export function useAuditLogs(params: AuditLogParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.event_type) queryParams.set('event_type', params.event_type);
  if (params.resource_type) queryParams.set('resource_type', params.resource_type);
  if (params.actor_id) queryParams.set('actor_id', params.actor_id);
  if (params.q) queryParams.set('q', params.q);
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);

  const qs = queryParams.toString();
  const url = `/audit${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => apiClient.get<AuditLogResponse>(url),
  });
}

export function useAuditEventTypes() {
  return useQuery({
    queryKey: auditKeys.eventTypes(),
    queryFn: () => apiClient.get<string[]>('/audit/event-types'),
  });
}

export function useAuditResourceTypes() {
  return useQuery({
    queryKey: auditKeys.resourceTypes(),
    queryFn: () => apiClient.get<string[]>('/audit/resource-types'),
  });
}
