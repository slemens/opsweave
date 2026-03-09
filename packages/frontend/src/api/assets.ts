// =============================================================================
// OpsWeave — Asset API Hooks (TanStack Query)
// =============================================================================

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  Asset,
  AssetRelation,
  AssetType,
  AssetStatus,
  SlaTier,
  Environment,
  RelationType,
} from '@opsweave/shared';
import type { PaginationMeta } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Request / Response Types
// ---------------------------------------------------------------------------

export interface AssetListParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
  asset_type?: AssetType;
  status?: AssetStatus;
  sla_tier?: SlaTier;
  environment?: Environment;
  owner_group_id?: string;
  customer_id?: string;
}

export interface AssetWithRelations extends Asset {
  owner_group?: { id: string; name: string } | null;
  customer?: { id: string; name: string } | null;
}

export interface AssetListResponse {
  data: AssetWithRelations[];
  meta: PaginationMeta;
}

export interface AssetRelationWithDetails extends AssetRelation {
  direction: 'outgoing' | 'incoming';
  related_asset: {
    id: string;
    display_name: string;
    asset_type: string;
  };
}

export interface AssetTicketSummary {
  id: string;
  ticket_number: string;
  ticket_type: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  assignee?: { display_name: string } | null;
}

export interface AssetStats {
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_sla: Record<string, number>;
  total: number;
}

export interface AssetGraphNode {
  id: string;
  display_name: string;
  asset_type: string;
  status: string;
}

export interface AssetGraphEdge {
  id: string;
  source_asset_id: string;
  target_asset_id: string;
  relation_type: string;
}

export interface AssetGraph {
  nodes: AssetGraphNode[];
  edges: AssetGraphEdge[];
}

export interface CreateAssetPayload {
  asset_type: AssetType;
  name: string;
  display_name: string;
  status?: AssetStatus;
  ip_address?: string | null;
  location?: string | null;
  sla_tier?: SlaTier;
  environment?: Environment | null;
  owner_group_id?: string | null;
  customer_id?: string | null;
  attributes?: Record<string, unknown>;
}

export interface UpdateAssetPayload {
  asset_type?: AssetType;
  name?: string;
  display_name?: string;
  status?: AssetStatus;
  ip_address?: string | null;
  location?: string | null;
  sla_tier?: SlaTier;
  environment?: Environment | null;
  owner_group_id?: string | null;
  customer_id?: string | null;
  attributes?: Record<string, unknown>;
}

export interface CreateAssetRelationPayload {
  source_asset_id: string;
  target_asset_id: string;
  relation_type: RelationType;
  properties?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (params: AssetListParams) => [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  relations: (id: string) => [...assetKeys.all, 'relations', id] as const,
  graph: (id: string) => [...assetKeys.all, 'graph', id] as const,
  stats: () => [...assetKeys.all, 'stats'] as const,
  tickets: (id: string) => [...assetKeys.all, 'tickets', id] as const,
};

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

export function useAssets(params: AssetListParams = {}) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: async () => {
      const cleanParams: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '' && value !== 'all') {
          cleanParams[key] = value;
        }
      }
      return apiClient.get<AssetListResponse>('/assets', {
        params: cleanParams,
      });
    },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: async () => {
      return apiClient.get<AssetWithRelations>(`/assets/${id}`);
    },
    enabled: !!id,
  });
}

export function useAssetRelations(assetId: string) {
  return useQuery({
    queryKey: assetKeys.relations(assetId),
    queryFn: async () => {
      return apiClient.get<AssetRelationWithDetails[]>(`/assets/${assetId}/relations`);
    },
    enabled: !!assetId,
  });
}

export function useAssetStats() {
  return useQuery({
    queryKey: assetKeys.stats(),
    queryFn: async () => {
      return apiClient.get<AssetStats>('/assets/stats');
    },
  });
}

export function useAssetTickets(assetId: string) {
  return useQuery({
    queryKey: assetKeys.tickets(assetId),
    queryFn: async () => {
      return apiClient.get<AssetTicketSummary[]>(`/assets/${assetId}/tickets`);
    },
    enabled: !!assetId,
  });
}

export function useAssetGraph(assetId: string) {
  return useQuery({
    queryKey: assetKeys.graph(assetId),
    queryFn: async () => {
      return apiClient.get<AssetGraph>(`/assets/${assetId}/graph`);
    },
    enabled: !!assetId,
  });
}

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAssetPayload) => {
      return apiClient.post<AssetWithRelations>('/assets', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateAssetPayload & { id: string }) => {
      return apiClient.put<AssetWithRelations>(`/assets/${id}`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useCreateAssetRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, ...payload }: CreateAssetRelationPayload & { assetId: string }) => {
      return apiClient.post<AssetRelation>(`/assets/${assetId}/relations`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.relations(variables.assetId) });
    },
  });
}

export function useDeleteAssetRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, relationId }: { assetId: string; relationId: string }) => {
      return apiClient.delete(`/assets/${assetId}/relations/${relationId}`);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.relations(variables.assetId) });
    },
  });
}
