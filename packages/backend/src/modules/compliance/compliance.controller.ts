import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
// AUDIT-FIX: M-04 — Safe context accessors instead of non-null assertions
import { requireTenantId, requireUserId } from '../../lib/context.js';
import * as complianceService from './compliance.service.js';
import type {
  ComplianceFilterParams,
  CreateRegulatoryFrameworkInput,
  UpdateRegulatoryFrameworkInput,
  CreateRequirementInput,
  UpdateRequirementInput,
  UpsertMappingInput,
  FlagAssetInput,
} from '@opsweave/shared';

// =============================================================================
// Frameworks
// =============================================================================

/**
 * GET /api/v1/compliance/frameworks
 */
export async function listFrameworks(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const params = (
    (req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query
  ) as unknown as ComplianceFilterParams;

  const { frameworks, total } = await complianceService.listFrameworks(tenantId, params);
  sendPaginated(res, frameworks, total, params.page ?? 1, params.limit ?? 25);
}

/**
 * GET /api/v1/compliance/frameworks/:id
 */
export async function getFramework(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const framework = await complianceService.getFramework(tenantId, id);
  sendSuccess(res, framework);
}

/**
 * POST /api/v1/compliance/frameworks
 */
export async function createFramework(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const data = req.body as CreateRegulatoryFrameworkInput;

  const framework = await complianceService.createFramework(tenantId, data, userId);
  sendCreated(res, framework);
}

/**
 * PUT /api/v1/compliance/frameworks/:id
 */
export async function updateFramework(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateRegulatoryFrameworkInput;

  const framework = await complianceService.updateFramework(tenantId, id, data);
  sendSuccess(res, framework);
}

/**
 * DELETE /api/v1/compliance/frameworks/:id
 */
export async function deleteFramework(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  await complianceService.deleteFramework(tenantId, id);
  sendNoContent(res);
}

// =============================================================================
// Requirements
// =============================================================================

/**
 * GET /api/v1/compliance/frameworks/:id/requirements
 */
export async function listRequirements(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: frameworkId } = req.params as { id: string };
  const params = (
    (req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query
  ) as unknown as ComplianceFilterParams & { category?: string };

  const { requirements, total } = await complianceService.listRequirements(
    tenantId,
    frameworkId,
    params,
  );
  sendPaginated(res, requirements, total, params.page ?? 1, params.limit ?? 25);
}

/**
 * GET /api/v1/compliance/requirements/:rid
 */
export async function getRequirement(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { rid } = req.params as { rid: string };

  const requirement = await complianceService.getRequirement(tenantId, rid);
  sendSuccess(res, requirement);
}

/**
 * POST /api/v1/compliance/frameworks/:id/requirements
 */
export async function createRequirement(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: frameworkId } = req.params as { id: string };
  const data = req.body as CreateRequirementInput;

  const requirement = await complianceService.createRequirement(tenantId, frameworkId, data);
  sendCreated(res, requirement);
}

/**
 * PUT /api/v1/compliance/requirements/:rid
 */
export async function updateRequirement(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { rid } = req.params as { rid: string };
  const data = req.body as UpdateRequirementInput;

  const requirement = await complianceService.updateRequirement(tenantId, rid, data);
  sendSuccess(res, requirement);
}

/**
 * DELETE /api/v1/compliance/requirements/:rid
 */
export async function deleteRequirement(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { rid } = req.params as { rid: string };

  await complianceService.deleteRequirement(tenantId, rid);
  sendNoContent(res);
}

// =============================================================================
// Mappings
// =============================================================================

/**
 * POST /api/v1/compliance/requirements/:rid/mappings/:sid
 */
export async function upsertMapping(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { rid, sid } = req.params as { rid: string; sid: string };
  const data = req.body as UpsertMappingInput;

  const mapping = await complianceService.upsertMapping(tenantId, rid, sid, data, userId);
  sendSuccess(res, mapping);
}

/**
 * DELETE /api/v1/compliance/requirements/:rid/mappings/:sid
 */
export async function deleteMapping(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { rid, sid } = req.params as { rid: string; sid: string };

  await complianceService.deleteMapping(tenantId, rid, sid);
  sendNoContent(res);
}

/**
 * GET /api/v1/compliance/frameworks/:id/matrix
 */
export async function getMatrix(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: frameworkId } = req.params as { id: string };

  const matrix = await complianceService.getMatrixForFramework(tenantId, frameworkId);
  sendSuccess(res, matrix);
}

// =============================================================================
// Asset Flags
// =============================================================================

/**
 * GET /api/v1/compliance/frameworks/:id/assets
 */
export async function getFrameworkAssets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: frameworkId } = req.params as { id: string };

  const flaggedAssets = await complianceService.getFrameworkAssets(tenantId, frameworkId);
  sendSuccess(res, flaggedAssets);
}

/**
 * POST /api/v1/compliance/frameworks/:id/assets
 */
export async function flagAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { id: frameworkId } = req.params as { id: string };
  const data = req.body as FlagAssetInput;

  const flag = await complianceService.flagAsset(tenantId, frameworkId, data, userId);
  sendCreated(res, flag);
}

/**
 * DELETE /api/v1/compliance/frameworks/:id/assets/:aid
 */
export async function unflagAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id: frameworkId, aid } = req.params as { id: string; aid: string };

  await complianceService.unflagAsset(tenantId, frameworkId, aid);
  sendNoContent(res);
}
