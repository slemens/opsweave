import { eq, and, count, like, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  complianceAudits,
  auditFindings,
  complianceControls,
  regulatoryFrameworks,
  regulatoryRequirements,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type {
  CreateComplianceAuditInput,
  UpdateComplianceAuditInput,
  AuditFilterParams,
  CreateAuditFindingInput,
  UpdateAuditFindingInput,
} from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

// =============================================================================
// Audits
// =============================================================================

export async function listAudits(
  tenantId: string,
  filters?: AuditFilterParams,
): Promise<{ data: unknown[]; total: number }> {
  const d = db();
  const conditions = [eq(complianceAudits.tenant_id, tenantId)];

  if (filters?.status) {
    conditions.push(eq(complianceAudits.status, filters.status));
  }
  if (filters?.audit_type) {
    conditions.push(eq(complianceAudits.audit_type, filters.audit_type));
  }
  if (filters?.framework_id) {
    conditions.push(eq(complianceAudits.framework_id, filters.framework_id));
  }
  if (filters?.q) {
    const search = `%${filters.q}%`;
    conditions.push(
      or(
        like(complianceAudits.name, search),
        like(complianceAudits.auditor, search),
        like(complianceAudits.scope, search),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [totalResult] = await d
    .select({ count: count() })
    .from(complianceAudits)
    .where(whereClause);

  const total = totalResult?.count ?? 0;
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  const rows = await d
    .select()
    .from(complianceAudits)
    .where(whereClause)
    .orderBy(complianceAudits.created_at)
    .limit(limit)
    .offset(offset);

  return { data: rows, total };
}

export async function getAudit(
  tenantId: string,
  auditId: string,
): Promise<unknown> {
  const d = db();

  const [row] = await d
    .select()
    .from(complianceAudits)
    .where(
      and(
        eq(complianceAudits.tenant_id, tenantId),
        eq(complianceAudits.id, auditId),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError('Compliance audit not found');

  // Include finding count
  const [findingCount] = await d
    .select({ count: count() })
    .from(auditFindings)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.audit_id, auditId),
      ),
    );

  return { ...row, finding_count: findingCount?.count ?? 0 };
}

export async function createAudit(
  tenantId: string,
  data: CreateComplianceAuditInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  // Verify framework exists if provided
  if (data.framework_id) {
    const [fw] = await d
      .select()
      .from(regulatoryFrameworks)
      .where(
        and(
          eq(regulatoryFrameworks.tenant_id, tenantId),
          eq(regulatoryFrameworks.id, data.framework_id),
        ),
      )
      .limit(1);

    if (!fw) throw new NotFoundError('Regulatory framework not found');
  }

  await d.insert(complianceAudits).values({
    id,
    tenant_id: tenantId,
    name: data.name,
    framework_id: data.framework_id ?? null,
    audit_type: data.audit_type ?? 'internal',
    status: data.status ?? 'planned',
    auditor: data.auditor ?? null,
    start_date: data.start_date ?? null,
    end_date: data.end_date ?? null,
    scope: data.scope ?? null,
    notes: data.notes ?? null,
    created_at: now,
    updated_at: now,
  });

  return getAudit(tenantId, id);
}

export async function updateAudit(
  tenantId: string,
  auditId: string,
  data: UpdateComplianceAuditInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(complianceAudits)
    .where(
      and(
        eq(complianceAudits.tenant_id, tenantId),
        eq(complianceAudits.id, auditId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Compliance audit not found');

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.framework_id !== undefined) updateData.framework_id = data.framework_id;
  if (data.audit_type !== undefined) updateData.audit_type = data.audit_type;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.auditor !== undefined) updateData.auditor = data.auditor;
  if (data.start_date !== undefined) updateData.start_date = data.start_date;
  if (data.end_date !== undefined) updateData.end_date = data.end_date;
  if (data.scope !== undefined) updateData.scope = data.scope;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await d
    .update(complianceAudits)
    .set(updateData)
    .where(
      and(
        eq(complianceAudits.tenant_id, tenantId),
        eq(complianceAudits.id, auditId),
      ),
    );

  return getAudit(tenantId, auditId);
}

export async function deleteAudit(
  tenantId: string,
  auditId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(complianceAudits)
    .where(
      and(
        eq(complianceAudits.tenant_id, tenantId),
        eq(complianceAudits.id, auditId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Compliance audit not found');

  // Check for existing findings
  const [findingCount] = await d
    .select({ count: count() })
    .from(auditFindings)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.audit_id, auditId),
      ),
    );

  if ((findingCount?.count ?? 0) > 0) {
    throw new ConflictError(
      'Cannot delete audit — findings exist. Remove all findings first.',
    );
  }

  await d
    .delete(complianceAudits)
    .where(
      and(
        eq(complianceAudits.tenant_id, tenantId),
        eq(complianceAudits.id, auditId),
      ),
    );
}

// =============================================================================
// Audit Findings
// =============================================================================

export async function listFindings(
  tenantId: string,
  auditId: string,
): Promise<unknown[]> {
  const d = db();

  // Verify audit exists
  const [audit] = await d
    .select()
    .from(complianceAudits)
    .where(
      and(
        eq(complianceAudits.tenant_id, tenantId),
        eq(complianceAudits.id, auditId),
      ),
    )
    .limit(1);

  if (!audit) throw new NotFoundError('Compliance audit not found');

  const rows = await d
    .select()
    .from(auditFindings)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.audit_id, auditId),
      ),
    )
    .orderBy(auditFindings.created_at);

  return rows;
}

export async function createFinding(
  tenantId: string,
  auditId: string,
  data: CreateAuditFindingInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  // Verify audit exists
  const [audit] = await d
    .select()
    .from(complianceAudits)
    .where(
      and(
        eq(complianceAudits.tenant_id, tenantId),
        eq(complianceAudits.id, auditId),
      ),
    )
    .limit(1);

  if (!audit) throw new NotFoundError('Compliance audit not found');

  await d.insert(auditFindings).values({
    id,
    audit_id: auditId,
    tenant_id: tenantId,
    control_id: data.control_id ?? null,
    requirement_id: data.requirement_id ?? null,
    severity: data.severity ?? 'minor',
    title: data.title,
    description: data.description ?? null,
    status: data.status ?? 'open',
    remediation_plan: data.remediation_plan ?? null,
    due_date: data.due_date ?? null,
    resolved_at: null,
    resolved_by: null,
    created_at: now,
    updated_at: now,
  });

  const [row] = await d
    .select()
    .from(auditFindings)
    .where(eq(auditFindings.id, id))
    .limit(1);

  return row;
}

export async function updateFinding(
  tenantId: string,
  findingId: string,
  data: UpdateAuditFindingInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(auditFindings)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.id, findingId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Audit finding not found');

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.control_id !== undefined) updateData.control_id = data.control_id;
  if (data.requirement_id !== undefined) updateData.requirement_id = data.requirement_id;
  if (data.severity !== undefined) updateData.severity = data.severity;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) {
    updateData.status = data.status;
    // Auto-set resolved_at when status changes to resolved
    if (data.status === 'resolved' && existing.status !== 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }
  }
  if (data.remediation_plan !== undefined) updateData.remediation_plan = data.remediation_plan;
  if (data.due_date !== undefined) updateData.due_date = data.due_date;

  await d
    .update(auditFindings)
    .set(updateData)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.id, findingId),
      ),
    );

  const [row] = await d
    .select()
    .from(auditFindings)
    .where(eq(auditFindings.id, findingId))
    .limit(1);

  return row;
}

export async function deleteFinding(
  tenantId: string,
  findingId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(auditFindings)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.id, findingId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Audit finding not found');

  await d
    .delete(auditFindings)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.id, findingId),
      ),
    );
}

// =============================================================================
// Audit Export
// =============================================================================

interface ExportFinding {
  title: string;
  severity: string;
  status: string;
  control_code: string | null;
  requirement_code: string | null;
  description: string | null;
  remediation_plan: string | null;
  due_date: string | null;
  resolved_at: string | null;
}

interface AuditExportData {
  audit: {
    name: string;
    framework: string | null;
    status: string;
    auditor: string | null;
    start_date: string | null;
    end_date: string | null;
    scope: string | null;
  };
  findings: ExportFinding[];
  summary: {
    total_findings: number;
    by_severity: Record<string, number>;
    by_status: Record<string, number>;
  };
}

export async function getAuditExportData(
  tenantId: string,
  auditId: string,
): Promise<AuditExportData> {
  const d = db();

  // Fetch audit
  const [audit] = await d
    .select()
    .from(complianceAudits)
    .where(
      and(
        eq(complianceAudits.tenant_id, tenantId),
        eq(complianceAudits.id, auditId),
      ),
    )
    .limit(1);

  if (!audit) throw new NotFoundError('Compliance audit not found');

  // Fetch framework name if linked
  let frameworkName: string | null = null;
  if (audit.framework_id) {
    const [fw] = await d
      .select({ name: regulatoryFrameworks.name })
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.id, audit.framework_id))
      .limit(1);
    frameworkName = fw?.name ?? null;
  }

  // Fetch findings with joined control/requirement codes
  const rawFindings = await d
    .select()
    .from(auditFindings)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.audit_id, auditId),
      ),
    )
    .orderBy(auditFindings.created_at);

  // Collect unique control/requirement IDs for batch lookup
  const controlIds = new Set<string>();
  const requirementIds = new Set<string>();
  for (const f of rawFindings) {
    if (f.control_id) controlIds.add(f.control_id);
    if (f.requirement_id) requirementIds.add(f.requirement_id);
  }

  // Batch-fetch control codes
  const controlMap = new Map<string, string>();
  if (controlIds.size > 0) {
    for (const cid of controlIds) {
      const [ctrl] = await d
        .select({ code: complianceControls.code })
        .from(complianceControls)
        .where(eq(complianceControls.id, cid))
        .limit(1);
      if (ctrl) controlMap.set(cid, ctrl.code);
    }
  }

  // Batch-fetch requirement codes
  const requirementMap = new Map<string, string>();
  if (requirementIds.size > 0) {
    for (const rid of requirementIds) {
      const [req] = await d
        .select({ code: regulatoryRequirements.code })
        .from(regulatoryRequirements)
        .where(eq(regulatoryRequirements.id, rid))
        .limit(1);
      if (req) requirementMap.set(rid, req.code);
    }
  }

  // Build export findings
  const findings: ExportFinding[] = rawFindings.map((f) => ({
    title: f.title,
    severity: f.severity,
    status: f.status,
    control_code: f.control_id ? (controlMap.get(f.control_id) ?? null) : null,
    requirement_code: f.requirement_id ? (requirementMap.get(f.requirement_id) ?? null) : null,
    description: f.description,
    remediation_plan: f.remediation_plan,
    due_date: f.due_date,
    resolved_at: f.resolved_at,
  }));

  // Build summary
  const bySeverity: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
  }

  return {
    audit: {
      name: audit.name,
      framework: frameworkName,
      status: audit.status,
      auditor: audit.auditor,
      start_date: audit.start_date,
      end_date: audit.end_date,
      scope: audit.scope,
    },
    findings,
    summary: {
      total_findings: findings.length,
      by_severity: bySeverity,
      by_status: byStatus,
    },
  };
}
