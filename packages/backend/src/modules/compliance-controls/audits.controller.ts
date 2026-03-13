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

// =============================================================================
// Audit Export
// =============================================================================

/**
 * Escape a value for CSV (RFC 4180).
 */
function csvEscape(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/v1/compliance/audits/:id/export/csv
 */
export async function exportAuditCsv(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const exportData = await auditsService.getAuditExportData(tenantId, id);

  const safeFilename = exportData.audit.name.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Build CSV
  const lines: string[] = [];

  // Metadata comment lines
  lines.push(`# Audit: ${exportData.audit.name}`);
  if (exportData.audit.framework) {
    lines.push(`# Framework: ${exportData.audit.framework}`);
  }
  lines.push(`# Status: ${exportData.audit.status}`);
  if (exportData.audit.auditor) {
    lines.push(`# Auditor: ${exportData.audit.auditor}`);
  }
  const period = [exportData.audit.start_date, exportData.audit.end_date]
    .filter(Boolean)
    .join(' - ');
  if (period) {
    lines.push(`# Period: ${period}`);
  }
  lines.push('');

  // Header
  lines.push('finding_title,severity,status,control_code,requirement_code,description,remediation_plan,due_date,resolved_at');

  // Data rows
  for (const f of exportData.findings) {
    lines.push(
      [
        csvEscape(f.title),
        csvEscape(f.severity),
        csvEscape(f.status),
        csvEscape(f.control_code),
        csvEscape(f.requirement_code),
        csvEscape(f.description),
        csvEscape(f.remediation_plan),
        csvEscape(f.due_date),
        csvEscape(f.resolved_at),
      ].join(','),
    );
  }

  const csv = lines.join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}_audit_report.csv"`);
  res.send(csv);
}

/**
 * GET /api/v1/compliance/audits/:id/export/json
 */
export async function exportAuditJson(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const exportData = await auditsService.getAuditExportData(tenantId, id);

  const safeFilename = exportData.audit.name.replace(/[^a-zA-Z0-9_-]/g, '_');

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}_audit_report.json"`);
  res.json(exportData);
}
