// =============================================================================
// OpsWeave — Asset Type & Relation Type API Hooks (Evo-1A / Evo-3A)
// =============================================================================

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AssetTypeDefinition, RelationTypeDefinition } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const assetTypeKeys = {
  all: ['asset-types'] as const,
  list: (active?: boolean) => [...assetTypeKeys.all, { active }] as const,
  detail: (id: string) => [...assetTypeKeys.all, id] as const,
};

export const relationTypeKeys = {
  all: ['relation-types'] as const,
  list: (active?: boolean) => [...relationTypeKeys.all, { active }] as const,
  detail: (id: string) => [...relationTypeKeys.all, id] as const,
};

// ---------------------------------------------------------------------------
// Asset Types
// ---------------------------------------------------------------------------

export function useAssetTypes(activeOnly = true) {
  return useQuery({
    queryKey: assetTypeKeys.list(activeOnly),
    queryFn: () =>
      apiClient.get<AssetTypeDefinition[]>('/asset-types', {
        params: activeOnly ? { active: 'true' } : {},
      }),
    staleTime: 60_000,
  });
}

export function useAssetType(id: string) {
  return useQuery({
    queryKey: assetTypeKeys.detail(id),
    queryFn: () => apiClient.get<AssetTypeDefinition>(`/asset-types/${id}`),
    enabled: !!id,
  });
}

export function useCreateAssetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AssetTypeDefinition>) =>
      apiClient.post<AssetTypeDefinition>('/asset-types', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: assetTypeKeys.all }); },
  });
}

export function useUpdateAssetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AssetTypeDefinition> & { id: string }) =>
      apiClient.put<AssetTypeDefinition>(`/asset-types/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: assetTypeKeys.all }); },
  });
}

export function useDeleteAssetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/asset-types/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: assetTypeKeys.all }); },
  });
}

// ---------------------------------------------------------------------------
// Relation Types
// ---------------------------------------------------------------------------

export function useRelationTypes(activeOnly = true) {
  return useQuery({
    queryKey: relationTypeKeys.list(activeOnly),
    queryFn: () =>
      apiClient.get<RelationTypeDefinition[]>('/relation-types', {
        params: activeOnly ? { active: 'true' } : {},
      }),
    staleTime: 60_000,
  });
}

export function useRelationType(id: string) {
  return useQuery({
    queryKey: relationTypeKeys.detail(id),
    queryFn: () => apiClient.get<RelationTypeDefinition>(`/relation-types/${id}`),
    enabled: !!id,
  });
}

export function useCreateRelationType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RelationTypeDefinition>) =>
      apiClient.post<RelationTypeDefinition>('/relation-types', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: relationTypeKeys.all }); },
  });
}

export function useUpdateRelationType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<RelationTypeDefinition> & { id: string }) =>
      apiClient.put<RelationTypeDefinition>(`/relation-types/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: relationTypeKeys.all }); },
  });
}

export function useDeleteRelationType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/relation-types/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: relationTypeKeys.all }); },
  });
}
