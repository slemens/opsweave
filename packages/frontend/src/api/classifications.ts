// =============================================================================
// OpsWeave — Classification API Hooks (TanStack Query)
// =============================================================================

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassificationValue {
  id: string;
  model_id: string;
  value: string;
  label: string;
  color?: string | null;
  sort_order: number;
}

export interface ClassificationModel {
  id: string;
  name: string;
  description?: string | null;
  is_hierarchical: boolean;
  values: ClassificationValue[];
  created_at: string;
  updated_at: string;
}

export interface AssetClassification {
  id: string;
  asset_id: string;
  value_id: string;
  value: ClassificationValue & {
    model: { id: string; name: string };
  };
  justification?: string | null;
  classified_by?: string | null;
  classified_by_name?: string | null;
  classified_at: string;
}

export interface ClassifyAssetPayload {
  value_id: string;
  justification?: string;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const classificationKeys = {
  all: ['classifications'] as const,
  models: () => [...classificationKeys.all, 'models'] as const,
  model: (id: string) => [...classificationKeys.all, 'model', id] as const,
  assetClassifications: (assetId: string) =>
    [...classificationKeys.all, 'asset', assetId] as const,
};

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

export function useClassificationModels() {
  return useQuery({
    queryKey: classificationKeys.models(),
    queryFn: async () => {
      return apiClient.get<ClassificationModel[]>('/classifications');
    },
  });
}

export function useAssetClassifications(assetId: string) {
  return useQuery({
    queryKey: classificationKeys.assetClassifications(assetId),
    queryFn: async () => {
      return apiClient.get<AssetClassification[]>(
        `/assets/${assetId}/classifications`,
      );
    },
    enabled: !!assetId,
  });
}

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

export function useClassifyAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      ...payload
    }: ClassifyAssetPayload & { assetId: string }) => {
      return apiClient.post<AssetClassification>(
        `/assets/${assetId}/classifications`,
        payload,
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: classificationKeys.assetClassifications(variables.assetId),
      });
    },
  });
}

export function useRemoveAssetClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      valueId,
    }: {
      assetId: string;
      valueId: string;
    }) => {
      return apiClient.delete(
        `/assets/${assetId}/classifications/${valueId}`,
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: classificationKeys.assetClassifications(variables.assetId),
      });
    },
  });
}
