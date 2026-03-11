import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as capacityService from './capacity.service.js';
import type { CreateCapacityTypeInput, SetAssetCapacityInput } from '@opsweave/shared';

// ── Capacity Types ──────────────────────────────────────────

/**
 * GET /api/v1/capacity/types
 */
export async function listCapacityTypes(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const types = await capacityService.listCapacityTypes(tenantId);
  sendSuccess(res, types);
}

/**
 * POST /api/v1/capacity/types
 */
export async function createCapacityType(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateCapacityTypeInput;
  const type = await capacityService.createCapacityType(tenantId, data);
  sendCreated(res, type);
}

/**
 * PUT /api/v1/capacity/types/:id
 */
export async function updateCapacityType(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as Partial<Pick<CreateCapacityTypeInput, 'name' | 'unit' | 'category'>>;
  const type = await capacityService.updateCapacityType(tenantId, id, data);
  sendSuccess(res, type);
}

/**
 * DELETE /api/v1/capacity/types/:id
 */
export async function deleteCapacityType(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await capacityService.deleteCapacityType(tenantId, id);
  sendNoContent(res);
}

// ── Asset Capacities ────────────────────────────────────────

/**
 * GET /api/v1/capacity/assets/:id
 */
export async function getAssetCapacities(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const capacities = await capacityService.getAssetCapacities(tenantId, id);
  sendSuccess(res, capacities);
}

/**
 * POST /api/v1/capacity/assets/:id
 */
export async function setAssetCapacity(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as SetAssetCapacityInput;
  const capacity = await capacityService.setAssetCapacity(tenantId, id, data);
  sendSuccess(res, capacity);
}

/**
 * DELETE /api/v1/capacity/assets/:id/:cid
 */
export async function deleteAssetCapacity(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { cid } = req.params as { id: string; cid: string };
  await capacityService.deleteAssetCapacity(tenantId, cid);
  sendNoContent(res);
}

/**
 * GET /api/v1/capacity/assets/:id/utilization
 */
export async function getCapacityUtilization(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const utilization = await capacityService.getCapacityUtilization(tenantId, id);
  sendSuccess(res, utilization);
}
