import { eq, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  complianceEvidence,
  complianceControls,
} from '../../db/schema/index.js';
import { NotFoundError } from '../../lib/errors.js';
import type { CreateComplianceEvidenceInput } from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

// =============================================================================
// Evidence
// =============================================================================

export async function listEvidence(
  tenantId: string,
  controlId: string,
): Promise<unknown[]> {
  const d = db();

  // Verify control exists
  const [control] = await d
    .select()
    .from(complianceControls)
    .where(
      and(
        eq(complianceControls.tenant_id, tenantId),
        eq(complianceControls.id, controlId),
      ),
    )
    .limit(1);

  if (!control) throw new NotFoundError('Compliance control not found');

  const rows = await d
    .select()
    .from(complianceEvidence)
    .where(
      and(
        eq(complianceEvidence.tenant_id, tenantId),
        eq(complianceEvidence.control_id, controlId),
      ),
    )
    .orderBy(complianceEvidence.uploaded_at);

  return rows;
}

export async function createEvidence(
  tenantId: string,
  controlId: string,
  data: CreateComplianceEvidenceInput,
  userId?: string,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  // Verify control exists
  const [control] = await d
    .select()
    .from(complianceControls)
    .where(
      and(
        eq(complianceControls.tenant_id, tenantId),
        eq(complianceControls.id, controlId),
      ),
    )
    .limit(1);

  if (!control) throw new NotFoundError('Compliance control not found');

  await d.insert(complianceEvidence).values({
    id,
    tenant_id: tenantId,
    control_id: controlId,
    evidence_type: data.evidence_type ?? 'document',
    title: data.title,
    url: data.url ?? null,
    description: data.description ?? null,
    uploaded_at: now,
    uploaded_by: userId ?? null,
  });

  const [row] = await d
    .select()
    .from(complianceEvidence)
    .where(eq(complianceEvidence.id, id))
    .limit(1);

  return row;
}

export async function deleteEvidence(
  tenantId: string,
  evidenceId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(complianceEvidence)
    .where(
      and(
        eq(complianceEvidence.tenant_id, tenantId),
        eq(complianceEvidence.id, evidenceId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Compliance evidence not found');

  await d
    .delete(complianceEvidence)
    .where(
      and(
        eq(complianceEvidence.tenant_id, tenantId),
        eq(complianceEvidence.id, evidenceId),
      ),
    );
}

/**
 * Get evidence count for a control (useful for control detail view).
 */
export async function getEvidenceCount(
  tenantId: string,
  controlId: string,
): Promise<number> {
  const d = db();

  const [result] = await d
    .select({ count: count() })
    .from(complianceEvidence)
    .where(
      and(
        eq(complianceEvidence.tenant_id, tenantId),
        eq(complianceEvidence.control_id, controlId),
      ),
    );

  return result?.count ?? 0;
}
