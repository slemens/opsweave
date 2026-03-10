import { Router } from 'express';
import { z } from 'zod';

import * as keService from './known-errors.service.js';
import { paginationSchema, uuidSchema } from '@opsweave/shared';
import { requireTenantId, requireUserId } from '../../lib/context.js';

// ─── Validation Schemas ──────────────────────────────────

const KNOWN_ERROR_STATUSES = ['identified', 'workaround_available', 'resolved'] as const;

const createKnownErrorSchema = z.object({
  title: z.string().min(1).max(255),
  symptom: z.string().min(1).max(50000),
  workaround: z.string().max(50000).nullable().default(null),
  root_cause: z.string().max(50000).nullable().default(null),
  status: z.enum(KNOWN_ERROR_STATUSES).default('identified'),
  problem_id: uuidSchema.nullable().default(null),
});

const updateKnownErrorSchema = createKnownErrorSchema.partial();

const filterSchema = paginationSchema.extend({
  status: z.enum(KNOWN_ERROR_STATUSES).optional(),
});

// ─── Router ──────────────────────────────────────────────

export const knownErrorRouter = Router();

// GET /known-errors — List
knownErrorRouter.get('/', async (req, res, next) => {
  try {
    const params = filterSchema.parse(req.query);
    const tenantId = requireTenantId(req);
    const result = await keService.listKnownErrors(tenantId, params);
    res.json({ data: result.items, meta: { total: result.total, page: params.page, limit: params.limit } });
  } catch (err) { next(err); }
});

// GET /known-errors/search — Search (for incident linking)
knownErrorRouter.get('/search', async (req, res, next) => {
  try {
    const tenantId = requireTenantId(req);
    const q = String(req.query.q ?? '');
    const results = await keService.searchKnownErrors(tenantId, q);
    res.json({ data: results });
  } catch (err) { next(err); }
});

// GET /known-errors/:id — Get single
knownErrorRouter.get('/:id', async (req, res, next) => {
  try {
    const tenantId = requireTenantId(req);
    const { id } = z.object({ id: uuidSchema }).parse(req.params);
    const item = await keService.getKnownError(tenantId, id);
    res.json({ data: item });
  } catch (err) { next(err); }
});

// POST /known-errors — Create
knownErrorRouter.post('/', async (req, res, next) => {
  try {
    const tenantId = requireTenantId(req);
    const userId = requireUserId(req);
    const data = createKnownErrorSchema.parse(req.body);
    const item = await keService.createKnownError(tenantId, data, userId);
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

// PUT /known-errors/:id — Update
knownErrorRouter.put('/:id', async (req, res, next) => {
  try {
    const tenantId = requireTenantId(req);
    const { id } = z.object({ id: uuidSchema }).parse(req.params);
    const data = updateKnownErrorSchema.parse(req.body);
    const item = await keService.updateKnownError(tenantId, id, data);
    res.json({ data: item });
  } catch (err) { next(err); }
});

// DELETE /known-errors/:id — Delete
knownErrorRouter.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = requireTenantId(req);
    const { id } = z.object({ id: uuidSchema }).parse(req.params);
    await keService.deleteKnownError(tenantId, id);
    res.status(204).end();
  } catch (err) { next(err); }
});
