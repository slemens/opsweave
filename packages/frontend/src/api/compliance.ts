import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// =============================================================================
// Types
// =============================================================================

export interface RegulatoryFramework {
  id: string;
  tenant_id: string;
  name: string;
  version: string | null;
  description: string | null;
  effective_date: string | null;
  created_at: string;
  requirement_count?: number;
  requirements?: RegulatoryRequirement[];
}

export interface RegulatoryRequirement {
  id: string;
  framework_id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
  mappings?: RequirementMapping[];
}

export interface RequirementMapping {
  requirement_id: string;
  service_desc_id: string;
  tenant_id: string;
  coverage_level: 'full' | 'partial' | 'none' | 'not_applicable';
  evidence_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  service_title?: string;
  service_code?: string;
}

export interface ComplianceMatrix {
  framework: RegulatoryFramework;
  requirements: Array<RegulatoryRequirement & { mappings: RequirementMapping[] }>;
}

export interface AssetFlag {
  asset_id: string;
  framework_id: string;
  tenant_id: string;
  reason: string | null;
  flagged_at: string;
  flagged_by: string;
  asset?: {
    id: string;
    name: string;
    display_name: string;
    asset_type: string;
    status: string;
  };
}

export interface FrameworkListParams {
  page?: number;
  limit?: number;
  q?: string;
}

export interface FrameworkListResponse {
  data: RegulatoryFramework[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface RequirementListParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
}

export interface RequirementListResponse {
  data: RegulatoryRequirement[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface CreateFrameworkPayload {
  name: string;
  version?: string | null;
  description?: string | null;
  effective_date?: string | null;
}

export interface UpdateFrameworkPayload extends Partial<CreateFrameworkPayload> {}

export interface CreateRequirementPayload {
  code: string;
  title: string;
  description?: string | null;
  category?: string | null;
}

export interface UpdateRequirementPayload extends Partial<CreateRequirementPayload> {}

export interface UpsertMappingPayload {
  coverage_level: 'full' | 'partial' | 'none' | 'not_applicable';
  evidence_notes?: string | null;
}

export interface FlagAssetPayload {
  asset_id: string;
  reason?: string | null;
}

export interface CrossMapping {
  id: string;
  tenant_id: string;
  source_requirement_id: string;
  target_requirement_id: string;
  mapping_type: 'equal' | 'partial' | 'related';
  notes: string | null;
  created_at: string;
  created_by: string | null;
  source_requirement?: {
    id: string;
    code: string;
    title: string;
    framework_id: string;
    framework_name?: string;
  };
  target_requirement?: {
    id: string;
    code: string;
    title: string;
    framework_id: string;
    framework_name?: string;
  };
}

export interface CreateCrossMappingPayload {
  source_requirement_id: string;
  target_requirement_id: string;
  mapping_type: 'equal' | 'partial' | 'related';
  notes?: string | null;
}

export interface ComplianceDashboardData {
  coverage: Array<{
    framework_id: string;
    framework_name: string;
    framework_version: string | null;
    total_requirements: number;
    mapped_requirements: number;
    coverage_pct: number;
  }>;
  control_statuses: Record<string, number>;
  open_findings: {
    critical: number;
    major: number;
    minor: number;
    observation: number;
  };
  stale_controls: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    updated_at: string;
  }>;
  recent_audits: Array<{
    id: string;
    name: string;
    status: string;
    auditor: string | null;
    created_at: string;
  }>;
}

// =============================================================================
// Query Keys
// =============================================================================

export const complianceKeys = {
  all: ['compliance'] as const,
  frameworks: (params?: FrameworkListParams) =>
    [...complianceKeys.all, 'frameworks', params] as const,
  framework: (id: string) => [...complianceKeys.all, 'framework', id] as const,
  requirements: (frameworkId: string, params?: RequirementListParams) =>
    [...complianceKeys.all, 'requirements', frameworkId, params] as const,
  requirement: (id: string) => [...complianceKeys.all, 'requirement', id] as const,
  matrix: (frameworkId: string) => [...complianceKeys.all, 'matrix', frameworkId] as const,
  assets: (frameworkId: string) => [...complianceKeys.all, 'assets', frameworkId] as const,
  crossMappings: (params?: Record<string, unknown>) =>
    [...complianceKeys.all, 'cross-mappings', params] as const,
  frameworkCrossMappings: (frameworkId: string) =>
    [...complianceKeys.all, 'framework-cross-mappings', frameworkId] as const,
  dashboard: () => [...complianceKeys.all, 'dashboard'] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

export function useFrameworks(params: FrameworkListParams = {}) {
  return useQuery({
    queryKey: complianceKeys.frameworks(params),
    queryFn: async () => {
      const cleanParams: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') cleanParams[k] = v as string | number;
      }
      return apiClient.get<FrameworkListResponse>('/compliance/frameworks', {
        params: cleanParams,
      });
    },
  });
}

export function useFramework(id: string | undefined) {
  return useQuery({
    queryKey: complianceKeys.framework(id ?? ''),
    queryFn: async () => apiClient.get<RegulatoryFramework>(`/compliance/frameworks/${id!}`),
    enabled: !!id,
  });
}

export function useRequirements(frameworkId: string | undefined, params: RequirementListParams = {}) {
  return useQuery({
    queryKey: complianceKeys.requirements(frameworkId ?? '', params),
    queryFn: async () => {
      const cleanParams: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') cleanParams[k] = v as string | number;
      }
      return apiClient.get<RequirementListResponse>(
        `/compliance/frameworks/${frameworkId!}/requirements`,
        { params: cleanParams },
      );
    },
    enabled: !!frameworkId,
  });
}

export function useMatrix(frameworkId: string | undefined) {
  return useQuery({
    queryKey: complianceKeys.matrix(frameworkId ?? ''),
    queryFn: async () =>
      apiClient.get<ComplianceMatrix>(`/compliance/frameworks/${frameworkId!}/matrix`),
    enabled: !!frameworkId,
  });
}

export function useFrameworkAssets(frameworkId: string | undefined) {
  return useQuery({
    queryKey: complianceKeys.assets(frameworkId ?? ''),
    queryFn: async () =>
      apiClient.get<AssetFlag[]>(`/compliance/frameworks/${frameworkId!}/assets`),
    enabled: !!frameworkId,
  });
}

// =============================================================================
// Mutation Hooks — Frameworks
// =============================================================================

export function useCreateFramework() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFrameworkPayload) =>
      apiClient.post<RegulatoryFramework>('/compliance/frameworks', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: complianceKeys.frameworks() });
    },
  });
}

export function useUpdateFramework() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateFrameworkPayload & { id: string }) =>
      apiClient.put<RegulatoryFramework>(`/compliance/frameworks/${id}`, payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: complianceKeys.frameworks() });
      void queryClient.invalidateQueries({ queryKey: complianceKeys.framework(vars.id) });
    },
  });
}

export function useDeleteFramework() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/compliance/frameworks/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: complianceKeys.frameworks() });
    },
  });
}

// =============================================================================
// Mutation Hooks — Requirements
// =============================================================================

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      frameworkId,
      ...payload
    }: CreateRequirementPayload & { frameworkId: string }) =>
      apiClient.post<RegulatoryRequirement>(
        `/compliance/frameworks/${frameworkId}/requirements`,
        payload,
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: complianceKeys.requirements(vars.frameworkId),
      });
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rid,
      frameworkId: _frameworkId,
      ...payload
    }: UpdateRequirementPayload & { rid: string; frameworkId: string }) =>
      apiClient.put<RegulatoryRequirement>(`/compliance/requirements/${rid}`, payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: complianceKeys.requirements(vars.frameworkId),
      });
      void queryClient.invalidateQueries({ queryKey: complianceKeys.requirement(vars.rid) });
    },
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rid }: { rid: string; frameworkId: string }) =>
      apiClient.delete(`/compliance/requirements/${rid}`),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: complianceKeys.requirements(vars.frameworkId),
      });
    },
  });
}

// =============================================================================
// Mutation Hooks — Mappings
// =============================================================================

export function useUpsertMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rid,
      sid,
      ...payload
    }: UpsertMappingPayload & { rid: string; sid: string; frameworkId: string }) =>
      apiClient.post<RequirementMapping>(
        `/compliance/requirements/${rid}/mappings/${sid}`,
        payload,
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: complianceKeys.matrix(vars.frameworkId),
      });
    },
  });
}

export function useDeleteMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rid, sid }: { rid: string; sid: string; frameworkId: string }) =>
      apiClient.delete(`/compliance/requirements/${rid}/mappings/${sid}`),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: complianceKeys.matrix(vars.frameworkId),
      });
    },
  });
}

// =============================================================================
// Mutation Hooks — Asset Flags
// =============================================================================

export function useFlagAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ frameworkId, ...payload }: FlagAssetPayload & { frameworkId: string }) =>
      apiClient.post<AssetFlag>(`/compliance/frameworks/${frameworkId}/assets`, payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: complianceKeys.assets(vars.frameworkId),
      });
    },
  });
}

export function useUnflagAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ frameworkId, aid }: { frameworkId: string; aid: string }) =>
      apiClient.delete(`/compliance/frameworks/${frameworkId}/assets/${aid}`),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: complianceKeys.assets(vars.frameworkId),
      });
    },
  });
}

// =============================================================================
// Query Hooks — Cross-Mappings
// =============================================================================

export function useCrossMappings(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: complianceKeys.crossMappings(params),
    queryFn: async () => {
      const cleanParams: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') cleanParams[k] = v as string | number;
      }
      return apiClient.get<CrossMapping[]>('/compliance/cross-mappings', {
        params: cleanParams,
      });
    },
  });
}

export function useFrameworkCrossMappings(frameworkId: string | undefined) {
  return useQuery({
    queryKey: complianceKeys.frameworkCrossMappings(frameworkId ?? ''),
    queryFn: async () =>
      apiClient.get<CrossMapping[]>(
        `/compliance/frameworks/${frameworkId!}/cross-mappings`,
      ),
    enabled: !!frameworkId,
  });
}

export interface CrossMappingImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Export cross-mappings as CSV. Returns the raw CSV text.
 */
export async function exportCrossMappingsCsv(): Promise<string> {
  const headers: Record<string, string> = {
    'Accept-Language': 'en',
  };
  const tenantId = (() => {
    try {
      const stored = localStorage.getItem('opsweave_auth');
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: { tenantId?: string } };
        return parsed.state?.tenantId ?? null;
      }
    } catch { /* ignore */ }
    return null;
  })();
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const response = await fetch('/api/v1/compliance/cross-mappings/export', {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }
  return response.text();
}

/**
 * Import cross-mappings from CSV text.
 */
export async function importCrossMappingsCsv(csvText: string): Promise<CrossMappingImportResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'text/csv',
  };
  const tenantId = (() => {
    try {
      const stored = localStorage.getItem('opsweave_auth');
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: { tenantId?: string } };
        return parsed.state?.tenantId ?? null;
      }
    } catch { /* ignore */ }
    return null;
  })();
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  // CSRF token
  const csrfMatch = document.cookie.match(/(?:^|;\s*)opsweave_csrf=([^;]*)/);
  if (csrfMatch) headers['X-CSRF-Token'] = decodeURIComponent(csrfMatch[1]!);

  const response = await fetch('/api/v1/compliance/cross-mappings/import', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: csvText,
  });
  if (!response.ok) {
    throw new Error(`Import failed with status ${response.status}`);
  }
  const json = await response.json() as { data?: CrossMappingImportResult };
  return json.data ?? (json as unknown as CrossMappingImportResult);
}

export function useCreateCrossMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCrossMappingPayload) =>
      apiClient.post<CrossMapping>('/compliance/cross-mappings', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: complianceKeys.crossMappings() });
    },
  });
}

export function useDeleteCrossMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      apiClient.delete(`/compliance/cross-mappings/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: complianceKeys.crossMappings() });
    },
  });
}

// =============================================================================
// Audit Report Export
// =============================================================================

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const stored = localStorage.getItem('opsweave_auth');
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { tenantId?: string } };
      if (parsed.state?.tenantId) {
        headers['X-Tenant-ID'] = parsed.state.tenantId;
      }
    }
  } catch { /* ignore */ }
  return headers;
}

async function triggerDownload(url: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  let filename = fallbackFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match?.[1]) filename = match[1];
  }
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(anchor.href);
}

export async function exportAuditCsv(auditId: string): Promise<void> {
  await triggerDownload(
    `/api/v1/compliance/audits/${auditId}/export/csv`,
    'audit_report.csv',
  );
}

export async function exportAuditJson(auditId: string): Promise<void> {
  await triggerDownload(
    `/api/v1/compliance/audits/${auditId}/export/json`,
    'audit_report.json',
  );
}

// =============================================================================
// Query Hooks — Dashboard
// =============================================================================

export function useComplianceDashboard() {
  return useQuery({
    queryKey: complianceKeys.dashboard(),
    queryFn: async () =>
      apiClient.get<ComplianceDashboardData>('/compliance/dashboard'),
  });
}
