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
  AssetStatus,
  SlaTier,
  Environment,
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
  asset_type?: string;
  asset_types?: string; // comma-separated types for category filtering
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
  name: string;
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
  centerAssetId?: string;
}

export interface FullAssetGraph {
  nodes: Array<{ id: string; display_name: string; asset_type: string; status: string; name: string }>;
  edges: Array<{ id: string; source_asset_id: string; target_asset_id: string; relation_type: string }>;
}

export interface CreateAssetPayload {
  asset_type: string;
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
  asset_type?: string;
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
  relation_type: string;
  properties?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// REQ-2.1: Asset Tenant Assignment Types
// ---------------------------------------------------------------------------

export interface AssetTenantAssignment {
  id: string;
  asset_id: string;
  tenant_id: string;
  assignment_type: 'dedicated' | 'shared' | 'inherited';
  inherited_from_asset_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  tenant_name?: string;
  inherited_from_asset_name?: string | null;
}

export interface CreateTenantAssignmentPayload {
  tenant_id: string;
  assignment_type: 'dedicated' | 'shared' | 'inherited';
  inherited_from_asset_id?: string | null;
  notes?: string | null;
}

export interface UpdateTenantAssignmentPayload {
  assignment_type?: 'dedicated' | 'shared' | 'inherited';
  inherited_from_asset_id?: string | null;
  notes?: string | null;
}

// Asset field-level change history
export interface AssetHistoryEntry {
  id: string;
  asset_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  changed_by_name: string | null;
}

// REQ-3.3b: History Types
export interface RelationHistoryEntry {
  id: string;
  relation_id: string;
  action: 'created' | 'modified' | 'deleted';
  changed_by: string | null;
  changed_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by_name: string | null;
}

export interface CapacityHistoryEntry {
  id: string;
  asset_id: string;
  capacity_type_id: string;
  old_total: number | null;
  old_allocated: number | null;
  new_total: number | null;
  new_allocated: number | null;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
  changed_by_name: string | null;
  capacity_type_name: string | null;
}

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (params: AssetListParams) => [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  relations: (id: string) => [...assetKeys.all, 'relations', id] as const,
  graph: (id: string) => [...assetKeys.all, 'graph', id] as const,
  graphFull: () => [...assetKeys.all, 'graph', 'full'] as const,
  stats: () => [...assetKeys.all, 'stats'] as const,
  tickets: (id: string) => [...assetKeys.all, 'tickets', id] as const,
  tenantAssignments: (id: string) => [...assetKeys.all, 'tenant-assignments', id] as const,
  relationHistory: (id: string) => [...assetKeys.all, 'relation-history', id] as const,
  capacityHistory: (id: string) => [...assetKeys.all, 'capacity-history', id] as const,
  history: (id: string) => [...assetKeys.detail(id), 'history'] as const,
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

export function useAssetRelations(assetId: string, options?: { as_of?: string }) {
  return useQuery({
    queryKey: [...assetKeys.relations(assetId), options?.as_of ?? 'all'] as const,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (options?.as_of) {
        params.as_of = options.as_of;
      }
      return apiClient.get<AssetRelationWithDetails[]>(`/assets/${assetId}/relations`, {
        params,
      });
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
      const result = await apiClient.get<AssetGraph>(`/assets/${assetId}/graph`);
      // Ensure centerAssetId is populated; fall back to the requested assetId
      if (!result.centerAssetId) {
        return { ...result, centerAssetId: assetId };
      }
      return result;
    },
    enabled: !!assetId,
  });
}

export function useFullAssetGraph() {
  return useQuery({
    queryKey: assetKeys.graphFull(),
    queryFn: () => apiClient.get<FullAssetGraph>('/assets/graph'),
  });
}

// REQ-3.3b: History Query Hooks

export function useAssetRelationHistory(assetId: string) {
  return useQuery({
    queryKey: assetKeys.relationHistory(assetId),
    queryFn: async () => {
      return apiClient.get<RelationHistoryEntry[]>(`/assets/${assetId}/relation-history`);
    },
    enabled: !!assetId,
  });
}

export function useAssetCapacityHistory(assetId: string) {
  return useQuery({
    queryKey: assetKeys.capacityHistory(assetId),
    queryFn: async () => {
      return apiClient.get<CapacityHistoryEntry[]>(`/assets/${assetId}/capacity-history`);
    },
    enabled: !!assetId,
  });
}

export function useAssetHistory(assetId: string) {
  return useQuery({
    queryKey: assetKeys.history(assetId),
    queryFn: () => apiClient.get<AssetHistoryEntry[]>(`/assets/${assetId}/history`),
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
      void queryClient.invalidateQueries({ queryKey: assetKeys.history(variables.id) });
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

// REQ-3.2a: Update relation properties
export function useUpdateAssetRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, relationId, ...payload }: {
      assetId: string;
      relationId: string;
      properties?: Record<string, unknown>;
      valid_from?: string | null;
      valid_until?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      return apiClient.put<AssetRelation>(`/assets/${assetId}/relations/${relationId}`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.relations(variables.assetId) });
    },
  });
}

// ---------------------------------------------------------------------------
// REQ-2.1: Asset Tenant Assignment Hooks
// ---------------------------------------------------------------------------

export function useAssetTenantAssignments(assetId: string) {
  return useQuery({
    queryKey: assetKeys.tenantAssignments(assetId),
    queryFn: async () => {
      return apiClient.get<AssetTenantAssignment[]>(`/assets/${assetId}/tenant-assignments`);
    },
    enabled: !!assetId,
  });
}

export function useAssignAssetToTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, ...payload }: CreateTenantAssignmentPayload & { assetId: string }) => {
      return apiClient.post<AssetTenantAssignment>(`/assets/${assetId}/tenant-assignments`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.tenantAssignments(variables.assetId) });
    },
  });
}

export function useUpdateAssetTenantAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, assignmentId, ...payload }: UpdateTenantAssignmentPayload & { assetId: string; assignmentId: string }) => {
      return apiClient.put<AssetTenantAssignment>(`/assets/${assetId}/tenant-assignments/${assignmentId}`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.tenantAssignments(variables.assetId) });
    },
  });
}

export function useRemoveAssetTenantAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, assignmentId }: { assetId: string; assignmentId: string }) => {
      return apiClient.delete(`/assets/${assetId}/tenant-assignments/${assignmentId}`);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.tenantAssignments(variables.assetId) });
    },
  });
}
