// =============================================================================
// OpsWeave — Capacity API Hooks (TanStack Query)
// =============================================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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

export interface CapacityUtilizationEntry {
  id: string;
  capacity_type_id: string;
  capacity_type: CapacityType;
  direction: 'provides' | 'requires';
  total: number;
  allocated: number;
  reserved: number;
  available: number;
  utilization_pct: number;
}

/** @deprecated Use CapacityUtilizationEntry[] — API returns flat array */
export interface AssetCapacityUtilization {
  asset_id: string;
  capacities: CapacityUtilizationEntry[];
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

export function useSetAssetCapacity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, ...data }: {
      assetId: string;
      capacity_type_id: string;
      direction: 'provides' | 'requires';
      total: number;
      allocated?: number;
      reserved?: number;
    }) => apiClient.post(`/capacity/assets/${assetId}`, data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: capacityKeys.assetUtilization(vars.assetId) });
      void queryClient.invalidateQueries({ queryKey: capacityKeys.assetCapacities(vars.assetId) });
    },
  });
}

export function useDeleteAssetCapacity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, capacityId }: { assetId: string; capacityId: string }) =>
      apiClient.delete(`/capacity/assets/${assetId}/${capacityId}`),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: capacityKeys.assetUtilization(vars.assetId) });
      void queryClient.invalidateQueries({ queryKey: capacityKeys.assetCapacities(vars.assetId) });
    },
  });
}

export function useAssetCapacityUtilization(assetId: string) {
  return useQuery({
    queryKey: capacityKeys.assetUtilization(assetId),
    queryFn: async () => {
      return apiClient.get<CapacityUtilizationEntry[]>(
        `/capacity/assets/${assetId}/utilization`,
      );
    },
    enabled: !!assetId,
  });
}

// ---------------------------------------------------------------------------
// Capacity Planning Types (REQ-3.4a / REQ-3.4b)
// ---------------------------------------------------------------------------

export interface CapacityUtilizationItem {
  capacityTypeId: string;
  type: string;
  unit: string;
  total: number;
  allocated: number;
  reserved: number;
  available: number;
  utilizationPct: number;
}

export interface UtilizationOverviewEntry {
  assetId: string;
  assetName: string;
  assetType: string;
  capacities: CapacityUtilizationItem[];
}

export interface CapacityRequirement {
  capacityTypeId: string;
  value: number;
}

export interface CompatibleHostEntry {
  assetId: string;
  assetName: string;
  assetType: string;
  capacities: Array<{
    capacityTypeId: string;
    type: string;
    unit: string;
    total: number;
    allocated: number;
    reserved: number;
    available: number;
    required: number;
    remainingAfter: number;
  }>;
  fitScore: number;
}

export interface MigrationFeasibilityDetail {
  capacityTypeId: string;
  type: string;
  unit: string;
  required: number;
  available: number;
  sufficient: boolean;
}

export interface MigrationFeasibilityResult {
  feasible: boolean;
  workloadAssetId: string;
  workloadAssetName: string;
  targetAssetId: string;
  targetAssetName: string;
  details: MigrationFeasibilityDetail[];
}

export interface OverprovisionedEntry {
  assetId: string;
  assetName: string;
  assetType: string;
  underutilizedCapacities: Array<{
    capacityTypeId: string;
    type: string;
    unit: string;
    total: number;
    allocated: number;
    reserved: number;
    utilizationPct: number;
  }>;
}

// ---------------------------------------------------------------------------
// Capacity Planning Query Keys
// ---------------------------------------------------------------------------

export const capacityPlanningKeys = {
  utilization: () => [...capacityKeys.all, 'planning', 'utilization'] as const,
  compatible: (requirements: CapacityRequirement[]) =>
    [...capacityKeys.all, 'planning', 'compatible', requirements] as const,
  migrationCheck: (workloadId: string, targetId: string) =>
    [...capacityKeys.all, 'planning', 'migration', workloadId, targetId] as const,
  overprovisioned: (threshold: number) =>
    [...capacityKeys.all, 'planning', 'overprovisioned', threshold] as const,
};

// ---------------------------------------------------------------------------
// Capacity Planning Hooks
// ---------------------------------------------------------------------------

export function useCapacityUtilization() {
  return useQuery({
    queryKey: capacityPlanningKeys.utilization(),
    queryFn: async () => {
      return apiClient.get<UtilizationOverviewEntry[]>('/capacity/utilization');
    },
  });
}

export function useCompatibleHosts(requirements: CapacityRequirement[]) {
  return useQuery({
    queryKey: capacityPlanningKeys.compatible(requirements),
    queryFn: async () => {
      const params = requirements.length > 0
        ? { requirements: JSON.stringify(requirements) }
        : {};
      return apiClient.get<CompatibleHostEntry[]>('/capacity/compatible', { params });
    },
    enabled: requirements.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useMigrationCheck(workloadId: string, targetId: string) {
  return useQuery({
    queryKey: capacityPlanningKeys.migrationCheck(workloadId, targetId),
    queryFn: async () => {
      return apiClient.get<MigrationFeasibilityResult>('/capacity/migration-check', {
        params: { workload: workloadId, target: targetId },
      });
    },
    enabled: !!workloadId && !!targetId,
  });
}

export function useOverprovisionedAssets(threshold: number = 30) {
  return useQuery({
    queryKey: capacityPlanningKeys.overprovisioned(threshold),
    queryFn: async () => {
      return apiClient.get<OverprovisionedEntry[]>('/capacity/overprovisioned', {
        params: { threshold },
      });
    },
  });
}
