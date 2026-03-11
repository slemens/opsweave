import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '../../lib/response.js';
import { requireTenantId, requireUserId } from '../../lib/context.js';
import * as controlsService from './controls.service.js';
import type {
  CreateComplianceControlInput,
  UpdateComplianceControlInput,
  MapRequirementControlInput,
  ControlFilterParams,
} from '@opsweave/shared';

/**
 * GET /api/v1/compliance/controls
 */
export async function listControls(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const filters = req.query as unknown as ControlFilterParams;
  const { data, total } = await controlsService.listControls(tenantId, filters);
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  sendPaginated(res, data, total, page, limit);
}

/**
 * GET /api/v1/compliance/controls/:id
 */
export async function getControl(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const control = await controlsService.getControl(tenantId, id);
  sendSuccess(res, control);
}

/**
 * POST /api/v1/compliance/controls
 */
export async function createControl(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const data = req.body as CreateComplianceControlInput;
  const control = await controlsService.createControl(tenantId, data, userId);
  sendCreated(res, control);
}

/**
 * PUT /api/v1/compliance/controls/:id
 */
export async function updateControl(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateComplianceControlInput;
  const control = await controlsService.updateControl(tenantId, id, data);
  sendSuccess(res, control);
}

/**
 * DELETE /api/v1/compliance/controls/:id
 */
export async function deleteControl(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await controlsService.deleteControl(tenantId, id);
  sendNoContent(res);
}

/**
 * POST /api/v1/compliance/controls/mappings
 */
export async function mapRequirementToControl(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as MapRequirementControlInput;
  const mapping = await controlsService.mapRequirementToControl(tenantId, data);
  sendCreated(res, mapping);
}

/**
 * DELETE /api/v1/compliance/controls/mappings/:requirementId/:controlId
 */
export async function removeRequirementControlMapping(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { requirementId, controlId } = req.params as {
    requirementId: string;
    controlId: string;
  };
  await controlsService.removeRequirementControlMapping(
    tenantId,
    requirementId,
    controlId,
  );
  sendNoContent(res);
}

/**
 * GET /api/v1/compliance/controls/:id/mappings
 */
export async function getCrossFrameworkMappings(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const result = await controlsService.getCrossFrameworkMappings(tenantId, id);
  sendSuccess(res, result);
}
