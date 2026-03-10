import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_digit: boolean;
  require_special: boolean;
  expiry_days: number;
  history_count: number;
}

const policyKeys = {
  all: ['password-policy'] as const,
};

export function usePasswordPolicy() {
  return useQuery({
    queryKey: policyKeys.all,
    queryFn: () => apiClient.get<PasswordPolicy>('/settings/password-policy'),
  });
}

export function useUpdatePasswordPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PasswordPolicy>) =>
      apiClient.put<PasswordPolicy>('/settings/password-policy', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}
