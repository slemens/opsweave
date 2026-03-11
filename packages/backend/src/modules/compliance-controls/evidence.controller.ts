import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId, requireUserId } from '../../lib/context.js';
import * as evidenceService from './evidence.service.js';
import type { CreateComplianceEvidenceInput } from '@opsweave/shared';

/**
 * GET /api/v1/compliance/evidence
 * List ALL evidence across all controls.
 */
export async function listAllEvidence(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const evidence = await evidenceService.listAllEvidence(tenantId);
  sendSuccess(res, evidence);
}

/**
 * GET /api/v1/compliance/controls/:id/evidence
 */
export async function listEvidence(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const evidence = await evidenceService.listEvidence(tenantId, id);
  sendSuccess(res, evidence);
}

/**
 * POST /api/v1/compliance/controls/:id/evidence
 */
export async function createEvidence(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { id } = req.params as { id: string };
  const data = req.body as CreateComplianceEvidenceInput;
  const evidence = await evidenceService.createEvidence(tenantId, id, data, userId);
  sendCreated(res, evidence);
}

/**
 * DELETE /api/v1/compliance/evidence/:id
 */
export async function deleteEvidence(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await evidenceService.deleteEvidence(tenantId, id);
  sendNoContent(res);
}
