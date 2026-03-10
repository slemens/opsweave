import { Router } from 'express';
import { z } from 'zod';

import { requireRole } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { requireTenantId } from '../../lib/context.js';
import { sendSuccess, sendPaginated } from '../../lib/response.js';
import * as auditService from './audit.service.js';

const auditRouter = Router();

// ─── Schemas ──────────────────────────────────────────────

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  event_type: z.string().optional(),
  resource_type: z.string().optional(),
  actor_id: z.string().optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// ─── Routes ───────────────────────────────────────────────

/**
 * GET /api/v1/audit
 * List audit log entries (admin only).
 */
auditRouter.get(
  '/',
  requireRole('admin'),
  validateQuery(auditQuerySchema),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const params = req.query as unknown as auditService.AuditLogParams;
      const result = await auditService.listAuditLogs(tenantId, params);
      sendPaginated(res, result.logs, result.total, params.page, params.limit);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/audit/event-types
 * Get distinct event types for filtering.
 */
auditRouter.get(
  '/event-types',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const types = await auditService.getEventTypes(tenantId);
      sendSuccess(res, types);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/audit/resource-types
 * Get distinct resource types for filtering.
 */
auditRouter.get(
  '/resource-types',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const types = await auditService.getResourceTypes(tenantId);
      sendSuccess(res, types);
    } catch (err) {
      next(err);
    }
  },
);

export { auditRouter };
