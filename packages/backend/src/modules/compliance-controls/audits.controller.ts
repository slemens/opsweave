import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as auditsService from './audits.service.js';
import type {
  CreateComplianceAuditInput,
  UpdateComplianceAuditInput,
  AuditFilterParams,
  CreateAuditFindingInput,
  UpdateAuditFindingInput,
} from '@opsweave/shared';

// =============================================================================
// Audits
// =============================================================================

/**
 * GET /api/v1/compliance/audits
 */
export async function listAudits(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const filters = req.query as unknown as AuditFilterParams;
  const { data, total } = await auditsService.listAudits(tenantId, filters);
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  sendPaginated(res, data, total, page, limit);
}

/**
 * GET /api/v1/compliance/audits/:id
 */
export async function getAudit(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const audit = await auditsService.getAudit(tenantId, id);
  sendSuccess(res, audit);
}

/**
 * POST /api/v1/compliance/audits
 */
export async function createAudit(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateComplianceAuditInput;
  const audit = await auditsService.createAudit(tenantId, data);
  sendCreated(res, audit);
}

/**
 * PUT /api/v1/compliance/audits/:id
 */
export async function updateAudit(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateComplianceAuditInput;
  const audit = await auditsService.updateAudit(tenantId, id, data);
  sendSuccess(res, audit);
}

/**
 * DELETE /api/v1/compliance/audits/:id
 */
export async function deleteAudit(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await auditsService.deleteAudit(tenantId, id);
  sendNoContent(res);
}

// =============================================================================
// Findings
// =============================================================================

/**
 * GET /api/v1/compliance/audits/:id/findings
 */
export async function listFindings(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const findings = await auditsService.listFindings(tenantId, id);
  sendSuccess(res, findings);
}

/**
 * POST /api/v1/compliance/audits/:id/findings
 */
export async function createFinding(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as CreateAuditFindingInput;
  const finding = await auditsService.createFinding(tenantId, id, data);
  sendCreated(res, finding);
}

/**
 * PUT /api/v1/compliance/findings/:id
 */
export async function updateFinding(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateAuditFindingInput;
  const finding = await auditsService.updateFinding(tenantId, id, data);
  sendSuccess(res, finding);
}

/**
 * DELETE /api/v1/compliance/findings/:id
 */
export async function deleteFinding(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await auditsService.deleteFinding(tenantId, id);
  sendNoContent(res);
}
