import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────

export interface KnownErrorWithRelations {
  id: string;
  tenant_id: string;
  title: string;
  symptom: string;
  workaround: string | null;
  root_cause: string | null;
  status: string;
  problem_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  problem: { id: string; ticket_number: string; title: string } | null;
  creator: { id: string; display_name: string };
}

export interface CreateKnownErrorPayload {
  title: string;
  symptom: string;
  workaround?: string | null;
  root_cause?: string | null;
  status?: string;
  problem_id?: string | null;
}

export interface UpdateKnownErrorPayload extends Partial<CreateKnownErrorPayload> {}

export interface KnownErrorSearchResult {
  id: string;
  title: string;
  symptom: string;
  workaround: string | null;
  status: string;
}

// ─── Query Keys ──────────────────────────────────────────

export const knownErrorKeys = {
  all: ['known-errors'] as const,
  lists: () => [...knownErrorKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...knownErrorKeys.lists(), params] as const,
  details: () => [...knownErrorKeys.all, 'detail'] as const,
  detail: (id: string) => [...knownErrorKeys.details(), id] as const,
  search: (q: string) => [...knownErrorKeys.all, 'search', q] as const,
};

// ─── Queries ─────────────────────────────────────────────

export function useKnownErrors(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: knownErrorKeys.list(params),
    queryFn: () =>
      apiClient.get<{ data: KnownErrorWithRelations[]; meta: { total: number; page: number; limit: number } }>(
        '/known-errors',
        { params },
      ),
  });
}

export function useKnownError(id: string) {
  return useQuery({
    queryKey: knownErrorKeys.detail(id),
    queryFn: () => apiClient.get<KnownErrorWithRelations>(`/known-errors/${id}`),
    enabled: !!id,
  });
}

export function useSearchKnownErrors(q: string) {
  return useQuery({
    queryKey: knownErrorKeys.search(q),
    queryFn: () => apiClient.get<KnownErrorSearchResult[]>('/known-errors/search', { params: { q } }),
    enabled: q.length >= 2,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreateKnownError() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKnownErrorPayload) =>
      apiClient.post<KnownErrorWithRelations>('/known-errors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knownErrorKeys.all });
    },
  });
}

export function useUpdateKnownError() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKnownErrorPayload }) =>
      apiClient.put<KnownErrorWithRelations>(`/known-errors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knownErrorKeys.all });
    },
  });
}

export function useDeleteKnownError() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/known-errors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knownErrorKeys.all });
    },
  });
}
