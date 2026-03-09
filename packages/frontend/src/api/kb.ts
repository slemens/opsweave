import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ────────────────────────────────────────────────

export interface KbArticle {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  tags: string[];
  visibility: 'internal' | 'public';
  status: 'draft' | 'published' | 'archived';
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  linked_ticket_ids?: string[];
}

export interface KbListResponse {
  data: KbArticle[];
  meta: { total: number; page: number; limit: number };
}

export interface KbFilterParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  visibility?: string;
  category?: string;
  linked_ticket_id?: string;
}

// ─── Query Keys ───────────────────────────────────────────

export const kbKeys = {
  all: ['kb'] as const,
  list: (params?: KbFilterParams) => [...kbKeys.all, 'list', params] as const,
  detail: (id: string) => [...kbKeys.all, 'detail', id] as const,
};

// ─── Queries ──────────────────────────────────────────────

export function useKbArticles(params?: KbFilterParams) {
  return useQuery({
    queryKey: kbKeys.list(params),
    queryFn: () =>
      apiClient.get<KbListResponse>('/kb/articles', {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  });
}

export function useKbArticle(id: string | undefined) {
  return useQuery({
    queryKey: kbKeys.detail(id ?? ''),
    queryFn: () => apiClient.get<KbArticle>(`/kb/articles/${id!}`),
    enabled: !!id,
  });
}

// ─── Mutations ────────────────────────────────────────────

export function useCreateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<KbArticle>) =>
      apiClient.post<KbArticle>('/kb/articles', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: kbKeys.all }),
  });
}

export function useUpdateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KbArticle> }) =>
      apiClient.put<KbArticle>(`/kb/articles/${id}`, data),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: kbKeys.all });
      qc.invalidateQueries({ queryKey: kbKeys.detail(id) });
    },
  });
}

export function useDeleteKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/kb/articles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: kbKeys.all }),
  });
}

export function useLinkArticleToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, ticketId }: { articleId: string; ticketId: string }) =>
      apiClient.post(`/kb/articles/${articleId}/link/${ticketId}`),
    onSuccess: (_d, { articleId }) => {
      qc.invalidateQueries({ queryKey: kbKeys.all });
      qc.invalidateQueries({ queryKey: kbKeys.detail(articleId) });
    },
  });
}

export function useUnlinkArticleFromTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, ticketId }: { articleId: string; ticketId: string }) =>
      apiClient.delete(`/kb/articles/${articleId}/link/${ticketId}`),
    onSuccess: (_d, { articleId }) => {
      qc.invalidateQueries({ queryKey: kbKeys.all });
      qc.invalidateQueries({ queryKey: kbKeys.detail(articleId) });
    },
  });
}
