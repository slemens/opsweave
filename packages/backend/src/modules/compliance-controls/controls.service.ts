import { eq, and, count, like, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  complianceControls,
  requirementControlMappings,
  regulatoryRequirements,
  regulatoryFrameworks,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type {
  CreateComplianceControlInput,
  UpdateComplianceControlInput,
  MapRequirementControlInput,
  ControlFilterParams,
} from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

/**
 * List all compliance controls for a tenant with optional filters.
 */
export async function listControls(
  tenantId: string,
  filters?: ControlFilterParams,
): Promise<{ data: unknown[]; total: number }> {
  const d = db();
  const conditions = [eq(complianceControls.tenant_id, tenantId)];

  if (filters?.status) {
    conditions.push(eq(complianceControls.status, filters.status));
  }
  if (filters?.category) {
    conditions.push(eq(complianceControls.category, filters.category));
  }
  if (filters?.q) {
    const search = `%${filters.q}%`;
    conditions.push(
      or(
        like(complianceControls.title, search),
        like(complianceControls.code, search),
        like(complianceControls.description, search),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [totalResult] = await d
    .select({ count: count() })
    .from(complianceControls)
    .where(whereClause);

  const total = totalResult?.count ?? 0;

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  const rows = await d
    .select()
    .from(complianceControls)
    .where(whereClause)
    .orderBy(complianceControls.code)
    .limit(limit)
    .offset(offset);

  return { data: rows, total };
}

/**
 * Get a single control with its requirement mappings.
 */
export async function getControl(
  tenantId: string,
  controlId: string,
): Promise<unknown> {
  const d = db();

  const [row] = await d
    .select()
    .from(complianceControls)
    .where(
      and(
        eq(complianceControls.tenant_id, tenantId),
        eq(complianceControls.id, controlId),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError('Compliance control not found');

  // Fetch mappings for this control
  const mappings = await d
    .select({
      requirement_id: requirementControlMappings.requirement_id,
      control_id: requirementControlMappings.control_id,
      coverage: requirementControlMappings.coverage,
      notes: requirementControlMappings.notes,
      requirement_code: regulatoryRequirements.code,
      requirement_title: regulatoryRequirements.title,
      framework_id: regulatoryRequirements.framework_id,
    })
    .from(requirementControlMappings)
    .innerJoin(
      regulatoryRequirements,
      eq(requirementControlMappings.requirement_id, regulatoryRequirements.id),
    )
    .where(
      and(
        eq(requirementControlMappings.tenant_id, tenantId),
        eq(requirementControlMappings.control_id, controlId),
      ),
    );

  return { ...row, mappings };
}

/**
 * Create a new compliance control.
 */
export async function createControl(
  tenantId: string,
  data: CreateComplianceControlInput,
  _userId: string,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    await d.insert(complianceControls).values({
      id,
      tenant_id: tenantId,
      code: data.code,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      control_type: data.control_type ?? 'preventive',
      status: data.status ?? 'planned',
      owner_id: data.owner_id ?? null,
      created_at: now,
      updated_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Control with code "${data.code}" already exists in this tenant`);
    }
    throw err;
  }

  return getControl(tenantId, id);
}

/**
 * Update an existing compliance control.
 */
export async function updateControl(
  tenantId: string,
  controlId: string,
  data: UpdateComplianceControlInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(complianceControls)
    .where(
      and(
        eq(complianceControls.tenant_id, tenantId),
        eq(complianceControls.id, controlId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Compliance control not found');

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.code !== undefined) updateData.code = data.code;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.control_type !== undefined) updateData.control_type = data.control_type;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.owner_id !== undefined) updateData.owner_id = data.owner_id;

  try {
    await d
      .update(complianceControls)
      .set(updateData)
      .where(
        and(
          eq(complianceControls.tenant_id, tenantId),
          eq(complianceControls.id, controlId),
        ),
      );
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Control with code "${data.code}" already exists in this tenant`);
    }
    throw err;
  }

  return getControl(tenantId, controlId);
}

/**
 * Delete a compliance control. Must not have any requirement mappings.
 */
export async function deleteControl(
  tenantId: string,
  controlId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(complianceControls)
    .where(
      and(
        eq(complianceControls.tenant_id, tenantId),
        eq(complianceControls.id, controlId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Compliance control not found');

  // Check for existing mappings
  const [mappingCount] = await d
    .select({ count: count() })
    .from(requirementControlMappings)
    .where(
      and(
        eq(requirementControlMappings.tenant_id, tenantId),
        eq(requirementControlMappings.control_id, controlId),
      ),
    );

  if ((mappingCount?.count ?? 0) > 0) {
    throw new ConflictError(
      'Cannot delete control — requirement mappings exist. Remove all mappings first.',
    );
  }

  await d
    .delete(complianceControls)
    .where(
      and(
        eq(complianceControls.tenant_id, tenantId),
        eq(complianceControls.id, controlId),
      ),
    );
}

/**
 * Map a requirement to a control (create mapping).
 */
export async function mapRequirementToControl(
  tenantId: string,
  data: MapRequirementControlInput,
): Promise<unknown> {
  const d = db();

  // Verify control exists in this tenant
  const [control] = await d
    .select()
    .from(complianceControls)
    .where(
      and(
        eq(complianceControls.tenant_id, tenantId),
        eq(complianceControls.id, data.control_id),
      ),
    )
    .limit(1);

  if (!control) throw new NotFoundError('Compliance control not found');

  // Verify requirement exists
  const [requirement] = await d
    .select()
    .from(regulatoryRequirements)
    .where(eq(regulatoryRequirements.id, data.requirement_id))
    .limit(1);

  if (!requirement) throw new NotFoundError('Regulatory requirement not found');

  try {
    await d.insert(requirementControlMappings).values({
      requirement_id: data.requirement_id,
      control_id: data.control_id,
      tenant_id: tenantId,
      coverage: data.coverage ?? 'full',
      notes: data.notes ?? null,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError('This requirement is already mapped to this control');
    }
    throw err;
  }

  return {
    requirement_id: data.requirement_id,
    control_id: data.control_id,
    tenant_id: tenantId,
    coverage: data.coverage ?? 'full',
    notes: data.notes ?? null,
  };
}

/**
 * Remove a requirement-control mapping.
 */
export async function removeRequirementControlMapping(
  tenantId: string,
  requirementId: string,
  controlId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ count: count() })
    .from(requirementControlMappings)
    .where(
      and(
        eq(requirementControlMappings.tenant_id, tenantId),
        eq(requirementControlMappings.requirement_id, requirementId),
        eq(requirementControlMappings.control_id, controlId),
      ),
    );

  if ((existing?.count ?? 0) === 0) {
    throw new NotFoundError('Requirement-control mapping not found');
  }

  await d
    .delete(requirementControlMappings)
    .where(
      and(
        eq(requirementControlMappings.tenant_id, tenantId),
        eq(requirementControlMappings.requirement_id, requirementId),
        eq(requirementControlMappings.control_id, controlId),
      ),
    );
}

/**
 * Get cross-framework mappings for a control — all requirements (across frameworks)
 * that are mapped to this control.
 */
export async function getCrossFrameworkMappings(
  tenantId: string,
  controlId: string,
): Promise<unknown> {
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

  // Get all requirements mapped to this control, grouped by framework
  const mappings = await d
    .select({
      requirement_id: requirementControlMappings.requirement_id,
      coverage: requirementControlMappings.coverage,
      notes: requirementControlMappings.notes,
      requirement_code: regulatoryRequirements.code,
      requirement_title: regulatoryRequirements.title,
      requirement_category: regulatoryRequirements.category,
      framework_id: regulatoryFrameworks.id,
      framework_name: regulatoryFrameworks.name,
      framework_version: regulatoryFrameworks.version,
    })
    .from(requirementControlMappings)
    .innerJoin(
      regulatoryRequirements,
      eq(requirementControlMappings.requirement_id, regulatoryRequirements.id),
    )
    .innerJoin(
      regulatoryFrameworks,
      eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id),
    )
    .where(
      and(
        eq(requirementControlMappings.tenant_id, tenantId),
        eq(requirementControlMappings.control_id, controlId),
      ),
    )
    .orderBy(regulatoryFrameworks.name, regulatoryRequirements.code);

  return {
    control,
    mappings,
  };
}
