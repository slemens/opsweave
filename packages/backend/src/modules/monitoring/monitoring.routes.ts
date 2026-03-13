import { Router } from 'express';
import { z } from 'zod';
import { MONITORING_SOURCE_TYPES, MONITORING_STATES } from '@opsweave/shared';
import * as ctrl from './monitoring.controller.js';
import { requireRole } from '../../middleware/auth.js';

// ─── Validation Schemas ───────────────────────────────────

const createSourceSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(MONITORING_SOURCE_TYPES),
  config: z.record(z.unknown()).optional(),
  webhook_secret: z.string().nullable().optional(),
  is_active: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)).optional(),
});

const updateSourceSchema = createSourceSchema.partial();

const webhookPayloadSchema = z.union([
  z.object({
    hostname: z.string().min(1),
    service_name: z.string().nullable().optional(),
    state: z.enum(MONITORING_STATES),
    output: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
  }),
  z.array(
    z.object({
      hostname: z.string().min(1),
      service_name: z.string().nullable().optional(),
      state: z.enum(MONITORING_STATES),
      output: z.string().nullable().optional(),
      external_id: z.string().nullable().optional(),
    }),
  ),
]);

// ─── Middleware ───────────────────────────────────────────

function validate(schema: z.ZodSchema) {
  return (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

// ─── Router ──────────────────────────────────────────────

export const monitoringRouter = Router();

// Sources (admin/manager only for mutations)
monitoringRouter.get('/sources', ctrl.listSources);
monitoringRouter.get('/sources/:id', ctrl.getSource);
monitoringRouter.post('/sources', requireRole('admin', 'manager'), validate(createSourceSchema), ctrl.createSource);
monitoringRouter.put('/sources/:id', requireRole('admin', 'manager'), validate(updateSourceSchema), ctrl.updateSource);
monitoringRouter.delete('/sources/:id', requireRole('admin', 'manager'), ctrl.deleteSource);

// Events
monitoringRouter.get('/events', ctrl.listEvents);
monitoringRouter.get('/events/stats', ctrl.getStats);
monitoringRouter.get('/events/:id', ctrl.getEvent);
monitoringRouter.put('/events/:id/acknowledge', ctrl.acknowledgeEvent);

// Webhook ingestion — NOTE: This route is public (no auth).
// It must be mounted OUTSIDE the protected router in routes/index.ts
// and uses webhook_secret header validation instead.
export const monitoringWebhookRouter = Router();
monitoringWebhookRouter.post(
  '/monitoring/events/webhook/:sourceId',
  validate(webhookPayloadSchema),
  ctrl.webhookIngest,
);
