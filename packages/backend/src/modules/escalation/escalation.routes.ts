import { Router } from 'express';
import { z } from 'zod';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateParams } from '../../middleware/validate.js';
import { idParamSchema, TICKET_TYPES, TICKET_PRIORITIES } from '@opsweave/shared';
import { requireTenantId, requireUserId } from '../../lib/context.js';
import { sendSuccess, sendCreated } from '../../lib/response.js';
import * as escalationService from './escalation.service.js';

const escalationRouter = Router();

// ─── Schemas ──────────────────────────────────────────────

const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  ticket_type: z.enum(TICKET_TYPES).nullable().optional(),
  priority: z.enum(TICKET_PRIORITIES).nullable().optional(),
  sla_threshold_pct: z.number().int().min(1).max(100).default(80),
  target_group_id: z.string().uuid(),
  escalation_level: z.number().int().min(1).max(10).default(1),
});

const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  ticket_type: z.enum(TICKET_TYPES).nullable().optional(),
  priority: z.enum(TICKET_PRIORITIES).nullable().optional(),
  sla_threshold_pct: z.number().int().min(1).max(100).optional(),
  target_group_id: z.string().uuid().optional(),
  escalation_level: z.number().int().min(1).max(10).optional(),
  is_active: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)).optional(),
});

const escalateSchema = z.object({
  target_group_id: z.string().uuid(),
  reason: z.string().max(2000).optional(),
});

const declareMajorSchema = z.object({
  incident_commander_id: z.string().uuid().nullable().optional(),
  bridge_call_url: z.string().url().max(2000).nullable().optional(),
});

// ─── Escalation Rules CRUD ───────────────────────────────

escalationRouter.get('/rules', async (req, res, next) => {
  try {
    const tenantId = requireTenantId(req);
    const rules = await escalationService.listRules(tenantId);
    sendSuccess(res, rules);
  } catch (err) {
    next(err);
  }
});

escalationRouter.post(
  '/rules',
  requireRole('admin', 'manager'),
  validate(createRuleSchema),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const rule = await escalationService.createRule(tenantId, req.body);
      sendCreated(res, rule);
    } catch (err) {
      next(err);
    }
  },
);

escalationRouter.put(
  '/rules/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(updateRuleSchema),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const rule = await escalationService.updateRule(tenantId, req.params['id'] as string, req.body);
      sendSuccess(res, rule);
    } catch (err) {
      next(err);
    }
  },
);

escalationRouter.delete(
  '/rules/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      await escalationService.deleteRule(tenantId, req.params['id'] as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─── Manual Escalation ───────────────────────────────────

escalationRouter.post(
  '/tickets/:id/escalate',
  validateParams(idParamSchema),
  validate(escalateSchema),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const userId = requireUserId(req);
      await escalationService.manualEscalate(tenantId, req.params['id'] as string, userId, req.body);
      sendSuccess(res, { message: 'Ticket escalated' });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Major Incident ──────────────────────────────────────

escalationRouter.post(
  '/tickets/:id/major-incident',
  validateParams(idParamSchema),
  validate(declareMajorSchema),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const userId = requireUserId(req);
      await escalationService.declareMajorIncident(tenantId, req.params['id'] as string, userId, req.body);
      sendSuccess(res, { message: 'Major incident declared' });
    } catch (err) {
      next(err);
    }
  },
);

escalationRouter.post(
  '/tickets/:id/resolve-major',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const userId = requireUserId(req);
      await escalationService.resolveMajorIncident(tenantId, req.params['id'] as string, userId);
      sendSuccess(res, { message: 'Major incident resolved' });
    } catch (err) {
      next(err);
    }
  },
);

export { escalationRouter };
