// =============================================================================
// OpsWeave — User API Hooks (TanStack Query)
// AUDIT-FIX: M-09 — Extracted from tickets.ts for domain separation
// =============================================================================

import {
  useQuery,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginationMeta } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: async () => {
      return apiClient.get<UsersResponse>('/users', { params: { limit: 100 } });
    },
  });
}
