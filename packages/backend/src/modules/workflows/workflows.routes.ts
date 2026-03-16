import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  workflowFilterSchema,
  createWorkflowTemplateSchema,
  updateWorkflowTemplateSchema,
  createWorkflowStepSchema,
  reorderWorkflowStepsSchema,
  instantiateWorkflowSchema,
  completeWorkflowStepSchema,
} from '@opsweave/shared';

import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addStep,
  removeStep,
  reorderSteps,
  instantiate,
  getInstance,
  completeStep,
  cancelInstance,
  getTicketWorkflow,
  getTemplateInstances,
} from './workflows.controller.js';

const workflowRouter = Router();

// =============================================================================
// Templates
// =============================================================================

workflowRouter.get('/templates', validateQuery(workflowFilterSchema), listTemplates);
workflowRouter.post('/templates', requireRole('admin', 'manager'), validate(createWorkflowTemplateSchema), createTemplate);

// IMPORTANT: static sub-routes before /:id
workflowRouter.post('/instantiate', validate(instantiateWorkflowSchema), instantiate);

workflowRouter.get('/templates/:id', validateParams(idParamSchema), getTemplate);
workflowRouter.put(
  '/templates/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(updateWorkflowTemplateSchema),
  updateTemplate,
);
workflowRouter.delete('/templates/:id', requireRole('admin', 'manager'), validateParams(idParamSchema), deleteTemplate);

// Steps
workflowRouter.post(
  '/templates/:id/steps',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(createWorkflowStepSchema),
  addStep,
);
workflowRouter.delete('/templates/:id/steps/:sid', requireRole('admin', 'manager'), validateParams(idParamSchema), removeStep);
workflowRouter.put(
  '/templates/:id/steps/reorder',
  validateParams(idParamSchema),
  validate(reorderWorkflowStepsSchema),
  reorderSteps,
);
workflowRouter.get('/templates/:id/instances', validateParams(idParamSchema), getTemplateInstances);

// =============================================================================
// Instances
// =============================================================================

workflowRouter.get('/instances/:id', getInstance);
workflowRouter.post('/instances/:id/steps/:sid/complete', validate(completeWorkflowStepSchema), completeStep);
workflowRouter.post('/instances/:id/cancel', cancelInstance);

// =============================================================================
// Ticket-scoped
// =============================================================================

workflowRouter.get('/ticket/:ticketId', getTicketWorkflow);

export { workflowRouter };
