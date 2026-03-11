import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as assetTypesService from './asset-types.service.js';
import type { CreateAssetTypeInput, UpdateAssetTypeInput } from '@opsweave/shared';

/**
 * GET /api/v1/asset-types
 */
export async function listAssetTypes(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const activeOnly = req.query.active === 'true';
  const types = await assetTypesService.listAssetTypes(tenantId, activeOnly);
  sendSuccess(res, types);
}

/**
 * GET /api/v1/asset-types/:id
 */
export async function getAssetType(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const type = await assetTypesService.getAssetType(tenantId, id);
  sendSuccess(res, type);
}

/**
 * POST /api/v1/asset-types
 */
export async function createAssetType(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateAssetTypeInput;
  const type = await assetTypesService.createAssetType(tenantId, data);
  sendCreated(res, type);
}

/**
 * PUT /api/v1/asset-types/:id
 */
export async function updateAssetType(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateAssetTypeInput;
  const type = await assetTypesService.updateAssetType(tenantId, id, data);
  sendSuccess(res, type);
}

/**
 * DELETE /api/v1/asset-types/:id
 */
export async function deleteAssetType(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await assetTypesService.deleteAssetType(tenantId, id);
  sendNoContent(res);
}
