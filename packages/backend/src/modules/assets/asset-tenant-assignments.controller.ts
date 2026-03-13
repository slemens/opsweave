// =============================================================================
// OpsWeave — Asset Tenant Assignments Controller (REQ-2.1)
// =============================================================================

import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId, requireUserId } from '../../lib/context.js';
import * as assignmentService from './asset-tenant-assignments.service.js';
import type { CreateAssignmentInput, UpdateAssignmentInput } from './asset-tenant-assignments.service.js';

// ─── List Assignments for Asset ───────────────────────────

/**
 * GET /api/v1/assets/:id/tenant-assignments
 */
export async function listAssetTenantAssignments(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const assignments = await assignmentService.listByAsset(id, tenantId);
  sendSuccess(res, assignments);
}

// ─── Create Assignment ────────────────────────────────────

/**
 * POST /api/v1/assets/:id/tenant-assignments
 */
export async function createAssetTenantAssignment(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { id } = req.params as { id: string };
  const data = req.body as CreateAssignmentInput;

  const assignment = await assignmentService.assign(id, tenantId, data, userId);
  sendCreated(res, assignment);
}

// ─── Update Assignment ────────────────────────────────────

/**
 * PUT /api/v1/assets/:id/tenant-assignments/:aid
 */
export async function updateAssetTenantAssignment(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { aid } = req.params as { id: string; aid: string };
  const data = req.body as UpdateAssignmentInput;

  const assignment = await assignmentService.update(aid, tenantId, data);
  sendSuccess(res, assignment);
}

// ─── Remove Assignment ────────────────────────────────────

/**
 * DELETE /api/v1/assets/:id/tenant-assignments/:aid
 */
export async function removeAssetTenantAssignment(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { aid } = req.params as { id: string; aid: string };

  await assignmentService.remove(aid, tenantId);
  sendNoContent(res);
}
