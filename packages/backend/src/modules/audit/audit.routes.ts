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

/**
 * GET /api/v1/audit/verify-integrity
 * Verify the hash chain integrity of the audit log (admin only).
 */
auditRouter.get(
  '/verify-integrity',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const result = await auditService.verifyIntegrity(tenantId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/audit/export
 * Export audit logs as JSON or CSV (admin only).
 */
auditRouter.get(
  '/export',
  requireRole('admin'),
  validateQuery(auditQuerySchema.extend({
    format: z.enum(['json', 'csv']).default('json'),
  })),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const { format, ...params } = req.query as unknown as auditService.AuditLogParams & { format: 'json' | 'csv' };
      // Fetch all matching logs (up to 10000)
      const result = await auditService.listAuditLogs(tenantId, { ...params, page: 1, limit: 10000 });

      if (format === 'csv') {
        const header = 'id,created_at,actor_email,event_type,resource_type,resource_id,details,integrity_hash\n';
        const rows = result.logs.map((l) =>
          [l.id, l.created_at, l.actor_email, l.event_type, l.resource_type, l.resource_id ?? '', JSON.stringify(l.details).replace(/"/g, '""'), l.integrity_hash ?? ''].map((v) => `"${v}"`).join(','),
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(header + rows);
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.json"`);
      res.json(result.logs);
    } catch (err) {
      next(err);
    }
  },
);

export { auditRouter };
