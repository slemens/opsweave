import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ────────────────────────────────────────────────

export interface EmailConfig {
  id: string;
  tenant_id: string;
  name: string;
  provider: 'imap' | 'webhook_mailgun' | 'webhook_sendgrid' | 'smtp_gateway';
  config: Record<string, unknown>;
  target_group_id: string | null;
  default_ticket_type: 'incident' | 'change' | 'problem';
  is_active: number;
  created_at: string;
}

export interface EmailMessage {
  id: string;
  tenant_id: string;
  config_id: string;
  message_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  ticket_id: string | null;
  is_reply: number;
  thread_reference: string | null;
  processed: number;
  received_at: string;
  processed_at: string | null;
}

export interface EmailConfigListResponse {
  data: EmailConfig[];
  meta: { total: number; page: number; limit: number };
}

export interface EmailMessageListResponse {
  data: EmailMessage[];
  meta: { total: number; page: number; limit: number };
}

// ─── Query Keys ───────────────────────────────────────────

export const emailKeys = {
  all: ['email'] as const,
  configs: () => [...emailKeys.all, 'configs'] as const,
  config: (id: string) => [...emailKeys.all, 'config', id] as const,
  messages: (params?: Record<string, unknown>) => [...emailKeys.all, 'messages', params] as const,
};

// ─── Queries ──────────────────────────────────────────────

export function useEmailConfigs() {
  return useQuery({
    queryKey: emailKeys.configs(),
    queryFn: () => apiClient.get<EmailConfigListResponse>('/email/configs'),
  });
}

export function useEmailConfig(id: string | undefined) {
  return useQuery({
    queryKey: emailKeys.config(id ?? ''),
    queryFn: () => apiClient.get<EmailConfig>(`/email/configs/${id!}`),
    enabled: !!id,
  });
}

export function useEmailMessages(params?: { config_id?: string; processed?: string }) {
  return useQuery({
    queryKey: emailKeys.messages(params),
    queryFn: () =>
      apiClient.get<EmailMessageListResponse>('/email/messages', {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  });
}

// ─── Mutations ────────────────────────────────────────────

export function useCreateEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EmailConfig>) =>
      apiClient.post<EmailConfig>('/email/configs', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: emailKeys.configs() }),
  });
}

export function useUpdateEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmailConfig> }) =>
      apiClient.put<EmailConfig>(`/email/configs/${id}`, data),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: emailKeys.configs() });
      qc.invalidateQueries({ queryKey: emailKeys.config(id) });
    },
  });
}

export function useDeleteEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/email/configs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: emailKeys.configs() }),
  });
}
