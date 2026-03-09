import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  WorkflowTemplate,
  WorkflowStep,
  WorkflowInstance,
  WorkflowStepInstance,
} from '@opsweave/shared';

// =============================================================================
// Types
// =============================================================================

export interface WorkflowStepWithConfig extends WorkflowStep {
  config: Record<string, unknown>;
}

export interface WorkflowTemplateWithSteps extends WorkflowTemplate {
  step_count: number;
  steps: WorkflowStepWithConfig[];
}

export interface WorkflowStepInstanceWithStep extends WorkflowStepInstance {
  form_data: Record<string, unknown>;
  step: WorkflowStepWithConfig;
}

export interface WorkflowInstanceFull extends WorkflowInstance {
  template_name: string | null;
  step_instances: WorkflowStepInstanceWithStep[];
}

export interface WorkflowListParams {
  page?: number;
  limit?: number;
  is_active?: 'true' | 'false';
  trigger_type?: string;
}

export interface WorkflowListResponse {
  data: WorkflowTemplateWithSteps[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface CreateWorkflowTemplatePayload {
  name: string;
  description?: string | null;
  trigger_type: string;
  trigger_subtype?: string | null;
  is_active?: boolean;
}

export interface UpdateWorkflowTemplatePayload extends Partial<CreateWorkflowTemplatePayload> {}

export interface CreateWorkflowStepPayload {
  name: string;
  step_type: string;
  config?: Record<string, unknown>;
  timeout_hours?: number | null;
}

export interface ReorderStepsPayload {
  step_ids: string[];
}

export interface InstantiateWorkflowPayload {
  template_id: string;
  ticket_id: string;
}

export interface CompleteStepPayload {
  form_data?: Record<string, unknown>;
  next_step_id?: string | null;
}

// =============================================================================
// Query Keys
// =============================================================================

export const workflowKeys = {
  all: ['workflows'] as const,
  templates: () => [...workflowKeys.all, 'templates'] as const,
  templateList: (params?: WorkflowListParams) =>
    [...workflowKeys.templates(), 'list', params] as const,
  template: (id: string) => [...workflowKeys.templates(), id] as const,
  instances: () => [...workflowKeys.all, 'instances'] as const,
  instance: (id: string) => [...workflowKeys.instances(), id] as const,
  ticketWorkflow: (ticketId: string) => [...workflowKeys.all, 'ticket', ticketId] as const,
  templateInstances: (templateId: string) =>
    [...workflowKeys.all, 'templateInstances', templateId] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

export function useWorkflowTemplates(params: WorkflowListParams = {}) {
  return useQuery({
    queryKey: workflowKeys.templateList(params),
    queryFn: async () => {
      const cleanParams: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '' && v !== 'all') cleanParams[k] = v as string | number;
      }
      return apiClient.get<WorkflowListResponse>('/workflows/templates', { params: cleanParams });
    },
  });
}

export function useWorkflowTemplate(id: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.template(id ?? ''),
    queryFn: async () =>
      apiClient.get<WorkflowTemplateWithSteps>(`/workflows/templates/${id!}`),
    enabled: !!id,
  });
}

export function useWorkflowInstance(id: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.instance(id ?? ''),
    queryFn: async () => apiClient.get<WorkflowInstanceFull>(`/workflows/instances/${id!}`),
    enabled: !!id,
  });
}

export function useTicketWorkflow(ticketId: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.ticketWorkflow(ticketId ?? ''),
    queryFn: async () =>
      apiClient.get<WorkflowInstanceFull | null>(`/workflows/ticket/${ticketId!}`),
    enabled: !!ticketId,
  });
}

export function useTemplateInstances(templateId: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.templateInstances(templateId ?? ''),
    queryFn: async () =>
      apiClient.get<WorkflowInstance[]>(`/workflows/templates/${templateId!}/instances`),
    enabled: !!templateId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateWorkflowTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWorkflowTemplatePayload) =>
      apiClient.post<WorkflowTemplateWithSteps>('/workflows/templates', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.templates() });
    },
  });
}

export function useUpdateWorkflowTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateWorkflowTemplatePayload & { id: string }) =>
      apiClient.put<WorkflowTemplateWithSteps>(`/workflows/templates/${id}`, payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.template(vars.id) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.templates() });
    },
  });
}

export function useDeleteWorkflowTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/workflows/templates/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.templates() });
    },
  });
}

export function useAddWorkflowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      ...payload
    }: CreateWorkflowStepPayload & { templateId: string }) =>
      apiClient.post<WorkflowTemplateWithSteps>(
        `/workflows/templates/${templateId}/steps`,
        payload,
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.template(vars.templateId) });
    },
  });
}

export function useRemoveWorkflowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, stepId }: { templateId: string; stepId: string }) =>
      apiClient.delete<WorkflowTemplateWithSteps>(
        `/workflows/templates/${templateId}/steps/${stepId}`,
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.template(vars.templateId) });
    },
  });
}

export function useReorderWorkflowSteps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      ...payload
    }: ReorderStepsPayload & { templateId: string }) =>
      apiClient.put<WorkflowTemplateWithSteps>(
        `/workflows/templates/${templateId}/steps/reorder`,
        payload,
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.template(vars.templateId) });
    },
  });
}

export function useInstantiateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InstantiateWorkflowPayload) =>
      apiClient.post<WorkflowInstanceFull>('/workflows/instantiate', payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: workflowKeys.ticketWorkflow(vars.ticket_id),
      });
    },
  });
}

export function useCompleteWorkflowStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceId,
      stepInstanceId,
      ...payload
    }: CompleteStepPayload & { instanceId: string; stepInstanceId: string }) =>
      apiClient.post<WorkflowInstanceFull>(
        `/workflows/instances/${instanceId}/steps/${stepInstanceId}/complete`,
        payload,
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.instance(vars.instanceId) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

export function useCancelWorkflowInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) =>
      apiClient.post<WorkflowInstanceFull>(`/workflows/instances/${instanceId}/cancel`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}
