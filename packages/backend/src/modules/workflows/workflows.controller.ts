import type { Request, Response } from 'express';
import * as workflowsService from './workflows.service.js';
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId, requireUserId } from '../../lib/context.js';
import type {
  WorkflowFilterParams,
  CreateWorkflowTemplateInput,
  UpdateWorkflowTemplateInput,
  CreateWorkflowStepInput,
  ReorderWorkflowStepsInput,
  InstantiateWorkflowInput,
  CompleteWorkflowStepInput,
} from '@opsweave/shared';

// =============================================================================
// Templates
// =============================================================================

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const params = ((req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query) as WorkflowFilterParams;
  const { templates, total } = await workflowsService.listWorkflowTemplates(tenantId, params);
  sendPaginated(res, templates, total, params.page, params.limit);
}

export async function getTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const template = await workflowsService.getWorkflowTemplate(tenantId, id);
  sendSuccess(res, template);
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const data = req.body as CreateWorkflowTemplateInput;
  const template = await workflowsService.createWorkflowTemplate(tenantId, data, userId);
  sendCreated(res, template);
}

export async function updateTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateWorkflowTemplateInput;
  const template = await workflowsService.updateWorkflowTemplate(tenantId, id, data, userId);
  sendSuccess(res, template);
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await workflowsService.deleteWorkflowTemplate(tenantId, id);
  sendNoContent(res);
}

// =============================================================================
// Steps
// =============================================================================

export async function addStep(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { id: templateId } = req.params as { id: string };
  const data = req.body as CreateWorkflowStepInput;
  const template = await workflowsService.addWorkflowStep(tenantId, templateId, data, userId);
  sendSuccess(res, template);
}

export async function removeStep(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: templateId, sid: stepId } = req.params as { id: string; sid: string };
  const template = await workflowsService.removeWorkflowStep(tenantId, templateId, stepId);
  sendSuccess(res, template);
}

export async function reorderSteps(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: templateId } = req.params as { id: string };
  const data = req.body as ReorderWorkflowStepsInput;
  const template = await workflowsService.reorderWorkflowSteps(tenantId, templateId, data);
  sendSuccess(res, template);
}

// =============================================================================
// Runtime
// =============================================================================

export async function instantiate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const data = req.body as InstantiateWorkflowInput;
  const instance = await workflowsService.instantiateWorkflow(tenantId, data, userId);
  sendCreated(res, instance);
}

export async function getInstance(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: instanceId } = req.params as { id: string };
  const instance = await workflowsService.getWorkflowInstance(tenantId, instanceId);
  sendSuccess(res, instance);
}

export async function completeStep(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { id: instanceId, sid: stepInstanceId } = req.params as { id: string; sid: string };
  const data = req.body as CompleteWorkflowStepInput;
  const instance = await workflowsService.completeWorkflowStep(
    tenantId,
    instanceId,
    stepInstanceId,
    data,
    userId,
  );
  sendSuccess(res, instance);
}

export async function cancelInstance(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: instanceId } = req.params as { id: string };
  const instance = await workflowsService.cancelWorkflowInstance(tenantId, instanceId);
  sendSuccess(res, instance);
}

export async function getTicketWorkflow(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { ticketId } = req.params as { ticketId: string };
  const instance = await workflowsService.getActiveInstanceForTicket(tenantId, ticketId);
  sendSuccess(res, instance);
}

export async function getTemplateInstances(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: templateId } = req.params as { id: string };
  const instances = await workflowsService.getTemplateInstances(tenantId, templateId);
  sendSuccess(res, instances);
}
