// =============================================================================
// OpsWeave — Capacity API Hooks (TanStack Query)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CapacityType {
  id: string;
  name: string;
  unit: string;
  description?: string | null;
  created_at: string;
}

export interface AssetCapacity {
  id: string;
  asset_id: string;
  capacity_type_id: string;
  capacity_type: CapacityType;
  direction: 'provides' | 'requires';
  total: number;
  allocated: number;
  reserved: number;
  available: number;
}

export interface AssetCapacityUtilization {
  asset_id: string;
  capacities: Array<{
    capacity_type: CapacityType;
    direction: 'provides' | 'requires';
    total: number;
    allocated: number;
    reserved: number;
    available: number;
    utilization_pct: number;
  }>;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const capacityKeys = {
  all: ['capacity'] as const,
  types: () => [...capacityKeys.all, 'types'] as const,
  assetCapacities: (assetId: string) =>
    [...capacityKeys.all, 'asset', assetId] as const,
  assetUtilization: (assetId: string) =>
    [...capacityKeys.all, 'utilization', assetId] as const,
};

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

export function useCapacityTypes() {
  return useQuery({
    queryKey: capacityKeys.types(),
    queryFn: async () => {
      return apiClient.get<CapacityType[]>('/capacity/types');
    },
  });
}

export function useAssetCapacities(assetId: string) {
  return useQuery({
    queryKey: capacityKeys.assetCapacities(assetId),
    queryFn: async () => {
      return apiClient.get<AssetCapacity[]>(`/capacity/assets/${assetId}`);
    },
    enabled: !!assetId,
  });
}

export function useAssetCapacityUtilization(assetId: string) {
  return useQuery({
    queryKey: capacityKeys.assetUtilization(assetId),
    queryFn: async () => {
      return apiClient.get<AssetCapacityUtilization>(
        `/capacity/assets/${assetId}/utilization`,
      );
    },
    enabled: !!assetId,
  });
}
