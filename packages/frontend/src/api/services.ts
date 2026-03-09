import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// =============================================================================
// Types
// =============================================================================

export interface ServiceDescription {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  description: string;
  scope_included: string | null;
  scope_excluded: string | null;
  compliance_tags: string[];
  version: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface HorizontalCatalog {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  item_count?: number;
  items?: CatalogItem[];
}

export interface CatalogItem {
  catalog_id: string;
  service_desc_id: string;
  code: string;
  title: string;
  status: string;
  version: number;
  compliance_tags: string[];
}

// =============================================================================
// Query Keys
// =============================================================================

const serviceKeys = {
  all: ['services'] as const,
  descriptions: () => [...serviceKeys.all, 'descriptions'] as const,
  description: (id: string) => [...serviceKeys.descriptions(), id] as const,
  descList: (params: Record<string, unknown>) =>
    [...serviceKeys.descriptions(), 'list', params] as const,
  catalogs: () => [...serviceKeys.all, 'catalogs', 'horizontal'] as const,
  catalog: (id: string) => [...serviceKeys.catalogs(), id] as const,
};

// =============================================================================
// List response shapes
// =============================================================================

interface DescListResponse {
  data: ServiceDescription[];
  meta: { total: number; page: number; limit: number };
}

interface CatalogListResponse {
  data: HorizontalCatalog[];
  meta: { total: number; page: number; limit: number };
}

// =============================================================================
// Query Hooks
// =============================================================================

export function useServiceDescriptions(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: serviceKeys.descList(params),
    queryFn: async () => {
      const cleanParams: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '' && v !== 'all') {
          cleanParams[k] = v as string | number | boolean;
        }
      }
      return apiClient.get<DescListResponse>('/services/descriptions', { params: cleanParams });
    },
  });
}

export function useServiceDescription(id: string | undefined) {
  return useQuery({
    queryKey: serviceKeys.description(id ?? ''),
    queryFn: async () => apiClient.get<ServiceDescription>(`/services/descriptions/${id!}`),
    enabled: !!id,
  });
}

export function useHorizontalCatalogs(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: serviceKeys.catalogs(),
    queryFn: async () => {
      const cleanParams: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '' && v !== 'all') {
          cleanParams[k] = v as string | number | boolean;
        }
      }
      return apiClient.get<CatalogListResponse>('/services/catalogs/horizontal', {
        params: cleanParams,
      });
    },
  });
}

export function useHorizontalCatalog(id: string | undefined) {
  return useQuery({
    queryKey: serviceKeys.catalog(id ?? ''),
    queryFn: async () =>
      apiClient.get<HorizontalCatalog>(`/services/catalogs/horizontal/${id!}`),
    enabled: !!id,
  });
}

// =============================================================================
// Mutation Hooks — Service Descriptions
// =============================================================================

export function useCreateServiceDescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiClient.post<ServiceDescription>('/services/descriptions', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.descriptions() });
    },
  });
}

export function useUpdateServiceDescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put<ServiceDescription>(`/services/descriptions/${id}`, data),
    onSuccess: (_result, vars) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.descriptions() });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.description(vars.id) });
    },
  });
}

export function useDeleteServiceDescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete<void>(`/services/descriptions/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.descriptions() });
    },
  });
}

// =============================================================================
// Mutation Hooks — Horizontal Catalogs
// =============================================================================

export function useCreateHorizontalCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiClient.post<HorizontalCatalog>('/services/catalogs/horizontal', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.catalogs() });
    },
  });
}

export function useUpdateHorizontalCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put<HorizontalCatalog>(`/services/catalogs/horizontal/${id}`, data),
    onSuccess: (_result, vars) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.catalogs() });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.catalog(vars.id) });
    },
  });
}

export function useDeleteHorizontalCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      apiClient.delete<void>(`/services/catalogs/horizontal/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.catalogs() });
    },
  });
}

// =============================================================================
// Mutation Hooks — Catalog Items
// =============================================================================

export function useAddCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      catalogId,
      serviceDescId,
    }: {
      catalogId: string;
      serviceDescId: string;
    }) =>
      apiClient.post<HorizontalCatalog>(
        `/services/catalogs/horizontal/${catalogId}/items`,
        { service_desc_id: serviceDescId },
      ),
    onSuccess: (_result, vars) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.catalog(vars.catalogId) });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.catalogs() });
    },
  });
}

export function useRemoveCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      catalogId,
      serviceDescId,
    }: {
      catalogId: string;
      serviceDescId: string;
    }) =>
      apiClient.delete<void>(
        `/services/catalogs/horizontal/${catalogId}/items/${serviceDescId}`,
      ),
    onSuccess: (_result, vars) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.catalog(vars.catalogId) });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.catalogs() });
    },
  });
}
