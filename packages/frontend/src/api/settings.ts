import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from './client';

// ─── Types ─────────────────────────────────────────────────

export interface SettingEntry {
  key: string;
  value: unknown;
  updated_at: string | null;
  updated_by: string | null;
}

export interface RuntimeConfig {
  nodeEnv: string;
  port: number;
  dbDriver: string;
  queueDriver: string;
  defaultLanguage: string;
  corsOrigin: string;
  serveStatic: boolean;
  oidcEnabled: boolean;
  jwtExpiresIn: string;
}

export interface LicenseInfo {
  edition: 'community' | 'enterprise';
  status: 'active' | 'expired' | 'none';
  subject: string | null;
  expiresAt: string | null;
  issuedAt: string | null;
  limits: {
    maxAssets: number;
    maxUsers: number;
    maxWorkflows: number;
    maxFrameworks: number;
    maxMonitoringSources: number;
  };
  features: {
    oidcAuth: boolean;
    samlAuth: boolean;
    verticalCatalogs: boolean;
    advancedReporting: boolean;
    customerPortal: boolean;
    emailInbound: boolean;
  };
}

export interface LicenseUsage {
  assets: { current: number; max: number };
  users: { current: number; max: number };
  workflows: { current: number; max: number };
  frameworks: { current: number; max: number };
  monitoring: { current: number; max: number };
}

// ─── Query Keys ────────────────────────────────────────────

const settingsKeys = {
  all: ['settings'] as const,
  list: () => [...settingsKeys.all, 'list'] as const,
  detail: (key: string) => [...settingsKeys.all, 'detail', key] as const,
  runtime: () => [...settingsKeys.all, 'runtime'] as const,
};

const licenseKeys = {
  all: ['license'] as const,
  info: () => [...licenseKeys.all, 'info'] as const,
  usage: () => [...licenseKeys.all, 'usage'] as const,
};

// ─── Settings Hooks ────────────────────────────────────────

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.list(),
    queryFn: () => apiClient.get<SettingEntry[]>('/settings'),
  });
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: settingsKeys.detail(key),
    queryFn: () => apiClient.get<SettingEntry>(`/settings/${encodeURIComponent(key)}`),
    enabled: !!key,
  });
}

export function useRuntimeConfig() {
  return useQuery({
    queryKey: settingsKeys.runtime(),
    queryFn: () => apiClient.get<RuntimeConfig>('/settings/runtime'),
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      apiClient.put<SettingEntry>(`/settings/${encodeURIComponent(key)}`, { value }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useDeleteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      apiClient.delete(`/settings/${encodeURIComponent(key)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

// ─── License Hooks ─────────────────────────────────────────

export function useLicenseInfo() {
  return useQuery({
    queryKey: licenseKeys.info(),
    queryFn: () => apiClient.get<LicenseInfo>('/license'),
  });
}

export function useLicenseUsage() {
  return useQuery({
    queryKey: licenseKeys.usage(),
    queryFn: () => apiClient.get<LicenseUsage>('/license/usage'),
  });
}

export function useActivateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (licenseKey: string) =>
      apiClient.post<LicenseInfo>('/license/activate', { license_key: licenseKey }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: licenseKeys.all });
    },
  });
}

export function useDeactivateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete('/license'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: licenseKeys.all });
    },
  });
}
