import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from './sla.controller.js';
import { requireRole } from '../../middleware/auth.js';

// ─── Validation Schemas ───────────────────────────────────

const createDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  response_time_minutes: z.number().int().min(1),
  resolution_time_minutes: z.number().int().min(1),
  business_hours: z.enum(['24/7', 'business', 'extended']).optional(),
  business_hours_start: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  business_hours_end: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  business_days: z.string().optional(),
  priority_overrides: z.record(z.unknown()).optional(),
  rpo_minutes: z.number().int().min(0).nullable().optional(),
  rto_minutes: z.number().int().min(0).nullable().optional(),
  service_window: z.record(z.unknown()).optional(),
  escalation_matrix: z.array(z.unknown()).optional(),
  is_default: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)).optional(),
});

const updateDefinitionSchema = createDefinitionSchema.partial().extend({
  is_active: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)).optional(),
});

const createAssignmentSchema = z.object({
  sla_definition_id: z.string().uuid(),
  service_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  asset_id: z.string().uuid().nullable().optional(),
});

// ─── Middleware ───────────────────────────────────────────

function validate(schema: z.ZodSchema) {
  return (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

// ─── Router ──────────────────────────────────────────────

export const slaRouter = Router();

// Definitions
slaRouter.get('/definitions', ctrl.listDefinitions);
slaRouter.get('/definitions/:id', ctrl.getDefinition);
slaRouter.post('/definitions', requireRole('admin'), validate(createDefinitionSchema), ctrl.createDefinition);
slaRouter.put('/definitions/:id', requireRole('admin'), validate(updateDefinitionSchema), ctrl.updateDefinition);
slaRouter.delete('/definitions/:id', requireRole('admin'), ctrl.deleteDefinition);

// Assignments
slaRouter.get('/assignments', ctrl.listAssignments);
slaRouter.post('/assignments', requireRole('admin'), validate(createAssignmentSchema), ctrl.createAssignment);
slaRouter.delete('/assignments/:id', requireRole('admin'), ctrl.deleteAssignment);

// Reports
slaRouter.get('/reports/performance', ctrl.performanceReport);

// Resolution preview
slaRouter.get('/resolve', ctrl.resolveEffective);
