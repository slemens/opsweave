import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as scopeService from './service-scope.service.js';
import type {
  CreateServiceScopeItemInput,
  UpdateServiceScopeItemInput,
  ReorderServiceScopeItemsInput,
} from '@opsweave/shared';

/**
 * GET /api/v1/services/descriptions/:id/scope-items
 */
export async function listScopeItems(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const items = await scopeService.listByService(id, tenantId);
  sendSuccess(res, items);
}

/**
 * POST /api/v1/services/descriptions/:id/scope-items
 */
export async function createScopeItem(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as CreateServiceScopeItemInput;

  const item = await scopeService.create(id, tenantId, data);
  sendCreated(res, item);
}

/**
 * PUT /api/v1/services/descriptions/:id/scope-items/:sid
 */
export async function updateScopeItem(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { sid } = req.params as { id: string; sid: string };
  const data = req.body as UpdateServiceScopeItemInput;

  const item = await scopeService.update(sid, tenantId, data);
  sendSuccess(res, item);
}

/**
 * DELETE /api/v1/services/descriptions/:id/scope-items/:sid
 */
export async function deleteScopeItem(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { sid } = req.params as { id: string; sid: string };

  await scopeService.remove(sid, tenantId);
  sendNoContent(res);
}

/**
 * POST /api/v1/services/descriptions/:id/scope-items/reorder
 */
export async function reorderScopeItems(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as ReorderServiceScopeItemsInput;

  const items = await scopeService.reorder(id, tenantId, data.item_ids);
  sendSuccess(res, items);
}
