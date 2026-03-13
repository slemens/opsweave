import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

interface SystemInfo {
  version: string;
  edition: 'community' | 'enterprise';
  dbDriver: string;
  queueDriver: string;
  defaultLanguage: string;
  limits: {
    maxAssets: number;
    maxUsers: number;
    maxWorkflows: number;
    maxFrameworks: number;
    maxMonitoringSources: number;
  };
}

export const systemKeys = {
  info: ['system', 'info'] as const,
};

export function useSystemInfo() {
  return useQuery({
    queryKey: systemKeys.info,
    queryFn: () => apiClient.get<SystemInfo>('/system/info'),
    staleTime: 5 * 60 * 1000, // 5 minutes — version doesn't change often
  });
}
