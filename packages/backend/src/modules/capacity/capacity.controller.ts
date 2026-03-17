import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId, requireUserId } from '../../lib/context.js';
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
  const userId = requireUserId(req);
  const { id } = req.params as { id: string };
  const data = req.body as SetAssetCapacityInput;
  const capacity = await capacityService.setAssetCapacity(tenantId, id, data, userId);
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

/**
 * GET /api/v1/capacity/assets/:id/consumers/:capacityTypeId
 */
export async function getCapacityConsumers(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, capacityTypeId } = req.params as { id: string; capacityTypeId: string };
  const consumers = await capacityService.getCapacityConsumers(tenantId, id, capacityTypeId);
  sendSuccess(res, consumers);
}

// ── Capacity Planning (REQ-3.4a / REQ-3.4b) ─────────────────

/**
 * GET /api/v1/capacity/utilization
 */
export async function getUtilizationOverview(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const overview = await capacityService.getUtilizationOverview(tenantId);
  sendSuccess(res, overview);
}

/**
 * GET /api/v1/capacity/compatible
 */
export async function findCompatibleHosts(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const query = req.query as Record<string, string>;

  // Parse requirements from query params: each key is a capacityTypeId, value is the required amount
  // Format: ?requirements=[{"capacityTypeId":"uuid","value":4},...]
  const requirementsRaw = query.requirements;
  let requirements: capacityService.CapacityRequirement[] = [];

  if (requirementsRaw) {
    try {
      const parsed = JSON.parse(requirementsRaw) as Array<{ capacityTypeId: string; value: number }>;
      requirements = parsed.map((r) => ({
        capacityTypeId: r.capacityTypeId,
        value: Number(r.value),
      }));
    } catch {
      // Invalid JSON, return empty
    }
  }

  const hosts = await capacityService.findCompatibleHosts(tenantId, requirements);
  sendSuccess(res, hosts);
}

/**
 * GET /api/v1/capacity/migration-check
 */
export async function checkMigrationFeasibility(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { workload, target } = req.query as { workload?: string; target?: string };

  if (!workload || !target) {
    sendSuccess(res, { feasible: false, details: [], error: 'Missing workload or target parameter' });
    return;
  }

  const result = await capacityService.checkMigrationFeasibility(tenantId, workload, target);
  sendSuccess(res, result);
}

/**
 * GET /api/v1/capacity/overprovisioned
 */
export async function getOverprovisionedAssets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const threshold = req.query.threshold ? Number(req.query.threshold) : 30;
  const assets = await capacityService.getOverprovisionedAssets(tenantId, threshold);
  sendSuccess(res, assets);
}
