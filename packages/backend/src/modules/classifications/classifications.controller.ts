import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId, requireUserId } from '../../lib/context.js';
import * as classificationsService from './classifications.service.js';
import type {
  CreateClassificationModelInput,
  UpdateClassificationModelInput,
  CreateClassificationValueInput,
  ClassifyAssetInput,
} from '@opsweave/shared';

// =============================================================================
// Classification Models
// =============================================================================

/**
 * GET /api/v1/classifications
 */
export async function listClassificationModels(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const models = await classificationsService.listClassificationModels(tenantId);
  sendSuccess(res, models);
}

/**
 * GET /api/v1/classifications/:id
 */
export async function getClassificationModel(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const model = await classificationsService.getClassificationModel(tenantId, id);
  sendSuccess(res, model);
}

/**
 * POST /api/v1/classifications
 */
export async function createClassificationModel(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateClassificationModelInput;
  const model = await classificationsService.createClassificationModel(tenantId, data);
  sendCreated(res, model);
}

/**
 * PUT /api/v1/classifications/:id
 */
export async function updateClassificationModel(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateClassificationModelInput;
  const model = await classificationsService.updateClassificationModel(tenantId, id, data);
  sendSuccess(res, model);
}

/**
 * DELETE /api/v1/classifications/:id
 */
export async function deleteClassificationModel(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await classificationsService.deleteClassificationModel(tenantId, id);
  sendNoContent(res);
}

// =============================================================================
// Classification Values
// =============================================================================

/**
 * POST /api/v1/classifications/:id/values
 */
export async function createClassificationValue(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as CreateClassificationValueInput;
  const value = await classificationsService.createClassificationValue(tenantId, id, data);
  sendCreated(res, value);
}

/**
 * PUT /api/v1/classifications/:id/values/:vid
 */
export async function updateClassificationValue(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { vid } = req.params as { id: string; vid: string };
  const data = req.body as Partial<CreateClassificationValueInput>;
  const value = await classificationsService.updateClassificationValue(tenantId, vid, data);
  sendSuccess(res, value);
}

/**
 * DELETE /api/v1/classifications/:id/values/:vid
 */
export async function deleteClassificationValue(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { vid } = req.params as { id: string; vid: string };
  await classificationsService.deleteClassificationValue(tenantId, vid);
  sendNoContent(res);
}

// =============================================================================
// Asset Classifications
// =============================================================================

/**
 * GET /api/v1/assets/:id/classifications
 */
export async function getAssetClassifications(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const classifications = await classificationsService.getAssetClassifications(tenantId, id);
  sendSuccess(res, classifications);
}

/**
 * POST /api/v1/assets/:id/classifications
 */
export async function classifyAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { id } = req.params as { id: string };
  const data = req.body as ClassifyAssetInput;
  const classifications = await classificationsService.classifyAsset(tenantId, id, data, userId);
  sendCreated(res, classifications);
}

/**
 * DELETE /api/v1/assets/:id/classifications/:vid
 */
export async function removeAssetClassification(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, vid } = req.params as { id: string; vid: string };
  await classificationsService.removeAssetClassification(tenantId, id, vid);
  sendNoContent(res);
}
