// =============================================================================
// OpsWeave — Ticket API Hooks (TanStack Query)
// =============================================================================

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  Ticket,
  TicketComment,
  TicketHistory,
  TicketType,
  TicketStatus,
  TicketPriority,
  AssigneeGroup,
} from '@opsweave/shared';
import type { PaginationMeta } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Request / Response Types
// ---------------------------------------------------------------------------

export interface TicketListParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
  status?: TicketStatus;
  ticket_type?: TicketType;
  priority?: TicketPriority;
  assignee_group_id?: string;
  assignee_id?: string;
  asset_id?: string;
}

export interface TicketListResponse {
  data: TicketWithRelations[];
  meta: PaginationMeta;
}

export interface TicketWithRelations extends Ticket {
  assignee?: { id: string; display_name: string; email: string } | null;
  assignee_group?: { id: string; name: string } | null;
  reporter?: { id: string; display_name: string; email: string } | null;
  asset?: { id: string; name: string; display_name: string } | null;
  customer?: { id: string; name: string } | null;
}

// Single ticket responses are auto-unwrapped by the API client
// (the { data: T } envelope is stripped), so hooks receive TicketWithRelations directly.

export interface TicketCommentWithAuthor extends TicketComment {
  author?: { id: string; display_name: string; email: string } | null;
}

export interface HistoryWithUser extends TicketHistory {
  changed_by_user?: { id: string; display_name: string } | null;
}

export interface TicketStats {
  by_status: {
    open: number;
    in_progress: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  by_type: Record<string, number>;
  sla_breached: number;
  total: number;
}

export interface BoardColumn {
  status: TicketStatus;
  tickets: TicketWithRelations[];
  count: number;
}

export interface BoardDataResponse {
  columns: BoardColumn[];
}

export interface CreateTicketPayload {
  ticket_type: TicketType;
  title: string;
  description: string;
  priority: TicketPriority;
  assignee_group_id?: string | null;
  assignee_id?: string | null;
  asset_id?: string | null;
  customer_id?: string | null;
  source?: string;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignee_id?: string | null;
  assignee_group_id?: string | null;
  asset_id?: string | null;
  sla_tier?: string | null;
}

export interface UpdateTicketStatusPayload {
  status: TicketStatus;
}

export interface AddCommentPayload {
  content: string;
  is_internal: boolean;
}

export interface GroupsResponse {
  data: AssigneeGroup[];
  meta: PaginationMeta;
}

export interface UserSummary {
  id: string;
  email: string;
  display_name: string;
}

export interface UsersResponse {
  data: UserSummary[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (params: TicketListParams) => [...ticketKeys.lists(), params] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  comments: (ticketId: string) => [...ticketKeys.all, 'comments', ticketId] as const,
  history: (ticketId: string) => [...ticketKeys.all, 'history', ticketId] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
  board: () => [...ticketKeys.all, 'board'] as const,
};

export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
};

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

export function useTickets(params: TicketListParams = {}) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: async () => {
      const cleanParams: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '' && value !== 'all') {
          cleanParams[key] = value;
        }
      }
      return apiClient.get<TicketListResponse>('/tickets', {
        params: cleanParams,
      });
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: async () => {
      return apiClient.get<TicketWithRelations>(`/tickets/${id}`);
    },
    enabled: !!id,
  });
}

export function useTicketComments(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.comments(ticketId),
    queryFn: async () => {
      return apiClient.get<TicketCommentWithAuthor[]>(`/tickets/${ticketId}/comments`);
    },
    enabled: !!ticketId,
  });
}

export function useTicketHistory(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.history(ticketId),
    queryFn: async () => {
      return apiClient.get<HistoryWithUser[]>(`/tickets/${ticketId}/history`);
    },
    enabled: !!ticketId,
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: ticketKeys.stats(),
    queryFn: async () => {
      return apiClient.get<TicketStats>('/tickets/stats');
    },
  });
}

export function useBoardData() {
  return useQuery({
    queryKey: ticketKeys.board(),
    queryFn: async () => {
      return apiClient.get<BoardDataResponse>('/tickets/board');
    },
  });
}

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: async () => {
      return apiClient.get<GroupsResponse>('/groups');
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: async () => {
      return apiClient.get<UsersResponse>('/users', { params: { limit: 100 } });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTicketPayload) => {
      return apiClient.post<TicketWithRelations>('/tickets', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateTicketPayload & { id: string }) => {
      return apiClient.put<TicketWithRelations>(`/tickets/${id}`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.board() });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      return apiClient.patch<TicketWithRelations>(`/tickets/${id}/status`, { status });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.board() });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
  });
}

export function useUpdateTicketPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: TicketPriority }) => {
      return apiClient.patch<TicketWithRelations>(`/tickets/${id}/priority`, { priority });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.board() });
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      assignee_id,
      assignee_group_id,
    }: {
      id: string;
      assignee_id?: string | null;
      assignee_group_id?: string | null;
    }) => {
      return apiClient.patch<TicketWithRelations>(`/tickets/${id}/assign`, {
        assignee_id,
        assignee_group_id,
      });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.board() });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      ...payload
    }: AddCommentPayload & { ticketId: string }) => {
      return apiClient.post<{ data: TicketCommentWithAuthor }>(
        `/tickets/${ticketId}/comments`,
        payload,
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ticketKeys.comments(variables.ticketId),
      });
    },
  });
}
