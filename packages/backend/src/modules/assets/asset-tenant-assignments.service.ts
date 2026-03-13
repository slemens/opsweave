// =============================================================================
// OpsWeave — Asset Tenant Assignments Service (REQ-2.1)
// =============================================================================

import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  assetTenantAssignments,
  assets,
  assetRelations,
  tenants,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

export interface AssetTenantAssignment {
  id: string;
  asset_id: string;
  tenant_id: string;
  assignment_type: string;
  inherited_from_asset_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  tenant_name?: string;
  inherited_from_asset_name?: string | null;
}

export interface CreateAssignmentInput {
  tenant_id: string;
  assignment_type: 'dedicated' | 'shared' | 'inherited';
  inherited_from_asset_id?: string | null;
  notes?: string | null;
}

export interface UpdateAssignmentInput {
  assignment_type?: 'dedicated' | 'shared' | 'inherited';
  inherited_from_asset_id?: string | null;
  notes?: string | null;
}

// ─── Service ──────────────────────────────────────────────

/**
 * List all tenant assignments for a given asset.
 */
export async function listByAsset(
  assetId: string,
  tenantId: string,
): Promise<AssetTenantAssignment[]> {
  const d = db();

  // Verify asset belongs to current tenant
  const [existing] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, assetId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  const rows = await d
    .select({
      id: assetTenantAssignments.id,
      asset_id: assetTenantAssignments.asset_id,
      tenant_id: assetTenantAssignments.tenant_id,
      assignment_type: assetTenantAssignments.assignment_type,
      inherited_from_asset_id: assetTenantAssignments.inherited_from_asset_id,
      notes: assetTenantAssignments.notes,
      created_at: assetTenantAssignments.created_at,
      created_by: assetTenantAssignments.created_by,
      tenant_name: tenants.name,
    })
    .from(assetTenantAssignments)
    .leftJoin(tenants, eq(assetTenantAssignments.tenant_id, tenants.id))
    .where(eq(assetTenantAssignments.asset_id, assetId));

  // Fetch inherited_from_asset names if present
  const result: AssetTenantAssignment[] = [];
  for (const row of rows) {
    let inherited_from_asset_name: string | null = null;
    if (row.inherited_from_asset_id) {
      const [parentAsset] = await d
        .select({ display_name: assets.display_name })
        .from(assets)
        .where(eq(assets.id, row.inherited_from_asset_id))
        .limit(1);
      inherited_from_asset_name = parentAsset?.display_name ?? null;
    }
    result.push({
      id: row.id,
      asset_id: row.asset_id,
      tenant_id: row.tenant_id,
      assignment_type: row.assignment_type,
      inherited_from_asset_id: row.inherited_from_asset_id,
      notes: row.notes,
      created_at: row.created_at,
      created_by: row.created_by,
      tenant_name: row.tenant_name ?? '',
      inherited_from_asset_name,
    });
  }

  return result;
}

/**
 * List all assets assigned to a given tenant.
 */
export async function listByTenant(
  tenantId: string,
): Promise<AssetTenantAssignment[]> {
  const d = db();

  const rows = await d
    .select({
      id: assetTenantAssignments.id,
      asset_id: assetTenantAssignments.asset_id,
      tenant_id: assetTenantAssignments.tenant_id,
      assignment_type: assetTenantAssignments.assignment_type,
      inherited_from_asset_id: assetTenantAssignments.inherited_from_asset_id,
      notes: assetTenantAssignments.notes,
      created_at: assetTenantAssignments.created_at,
      created_by: assetTenantAssignments.created_by,
      tenant_name: tenants.name,
    })
    .from(assetTenantAssignments)
    .leftJoin(tenants, eq(assetTenantAssignments.tenant_id, tenants.id))
    .where(eq(assetTenantAssignments.tenant_id, tenantId));

  return rows.map((row) => ({
    id: row.id,
    asset_id: row.asset_id,
    tenant_id: row.tenant_id,
    assignment_type: row.assignment_type,
    inherited_from_asset_id: row.inherited_from_asset_id,
    notes: row.notes,
    created_at: row.created_at,
    created_by: row.created_by,
    tenant_name: row.tenant_name ?? '',
    inherited_from_asset_name: null,
  }));
}

/**
 * Assign an asset to a target tenant.
 */
export async function assign(
  assetId: string,
  tenantId: string,
  input: CreateAssignmentInput,
  createdBy?: string,
): Promise<AssetTenantAssignment> {
  const d = db();

  // Verify asset belongs to current tenant
  const [existing] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, assetId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  // Verify target tenant exists
  const [targetTenant] = await d
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, input.tenant_id))
    .limit(1);

  if (!targetTenant) {
    throw new NotFoundError('Target tenant not found');
  }

  // Verify inherited_from_asset_id if provided
  if (input.inherited_from_asset_id) {
    const [parentAsset] = await d
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.id, input.inherited_from_asset_id))
      .limit(1);

    if (!parentAsset) {
      throw new NotFoundError('Inherited-from asset not found');
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  try {
    await d.insert(assetTenantAssignments).values({
      id,
      asset_id: assetId,
      tenant_id: input.tenant_id,
      assignment_type: input.assignment_type,
      inherited_from_asset_id: input.inherited_from_asset_id ?? null,
      notes: input.notes ?? null,
      created_at: now,
      created_by: createdBy ?? null,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError('Asset is already assigned to this tenant');
    }
    throw err;
  }

  return {
    id,
    asset_id: assetId,
    tenant_id: input.tenant_id,
    assignment_type: input.assignment_type,
    inherited_from_asset_id: input.inherited_from_asset_id ?? null,
    notes: input.notes ?? null,
    created_at: now,
    created_by: createdBy ?? null,
    tenant_name: targetTenant.name,
    inherited_from_asset_name: null,
  };
}

/**
 * Update an existing assignment.
 */
export async function update(
  assignmentId: string,
  tenantId: string,
  input: UpdateAssignmentInput,
): Promise<AssetTenantAssignment> {
  const d = db();

  // Find assignment and verify ownership through asset
  const [existing] = await d
    .select({
      id: assetTenantAssignments.id,
      asset_id: assetTenantAssignments.asset_id,
      tenant_id: assetTenantAssignments.tenant_id,
      assignment_type: assetTenantAssignments.assignment_type,
      inherited_from_asset_id: assetTenantAssignments.inherited_from_asset_id,
      notes: assetTenantAssignments.notes,
      created_at: assetTenantAssignments.created_at,
      created_by: assetTenantAssignments.created_by,
    })
    .from(assetTenantAssignments)
    .where(eq(assetTenantAssignments.id, assignmentId))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Assignment not found');
  }

  // Verify the asset belongs to the requesting tenant
  const [ownerAsset] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, existing.asset_id), eq(assets.tenant_id, tenantId)))
    .limit(1);

  if (!ownerAsset) {
    throw new NotFoundError('Assignment not found');
  }

  const updateData: Record<string, unknown> = {};
  if (input.assignment_type !== undefined) updateData.assignment_type = input.assignment_type;
  if (input.inherited_from_asset_id !== undefined) updateData.inherited_from_asset_id = input.inherited_from_asset_id;
  if (input.notes !== undefined) updateData.notes = input.notes;

  if (Object.keys(updateData).length > 0) {
    await d
      .update(assetTenantAssignments)
      .set(updateData)
      .where(eq(assetTenantAssignments.id, assignmentId));
  }

  // Fetch updated row with tenant name
  const updatedRows = await d
    .select({
      id: assetTenantAssignments.id,
      asset_id: assetTenantAssignments.asset_id,
      tenant_id: assetTenantAssignments.tenant_id,
      assignment_type: assetTenantAssignments.assignment_type,
      inherited_from_asset_id: assetTenantAssignments.inherited_from_asset_id,
      notes: assetTenantAssignments.notes,
      created_at: assetTenantAssignments.created_at,
      created_by: assetTenantAssignments.created_by,
      tenant_name: tenants.name,
    })
    .from(assetTenantAssignments)
    .leftJoin(tenants, eq(assetTenantAssignments.tenant_id, tenants.id))
    .where(eq(assetTenantAssignments.id, assignmentId))
    .limit(1);

  const updated = updatedRows[0];
  if (!updated) {
    throw new NotFoundError('Assignment not found after update');
  }

  return {
    id: updated.id,
    asset_id: updated.asset_id,
    tenant_id: updated.tenant_id,
    assignment_type: updated.assignment_type,
    inherited_from_asset_id: updated.inherited_from_asset_id,
    notes: updated.notes,
    created_at: updated.created_at,
    created_by: updated.created_by,
    tenant_name: updated.tenant_name ?? '',
    inherited_from_asset_name: null,
  };
}

/**
 * Remove an assignment.
 */
export async function remove(
  assignmentId: string,
  tenantId: string,
): Promise<void> {
  const d = db();

  // Find assignment
  const [existing] = await d
    .select({
      id: assetTenantAssignments.id,
      asset_id: assetTenantAssignments.asset_id,
    })
    .from(assetTenantAssignments)
    .where(eq(assetTenantAssignments.id, assignmentId))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Assignment not found');
  }

  // Verify the asset belongs to the requesting tenant
  const [ownerAsset] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, existing.asset_id), eq(assets.tenant_id, tenantId)))
    .limit(1);

  if (!ownerAsset) {
    throw new NotFoundError('Assignment not found');
  }

  await d
    .delete(assetTenantAssignments)
    .where(eq(assetTenantAssignments.id, assignmentId));
}

/**
 * Resolve inherited tenant assignments by walking the asset relation graph.
 * For each parent asset that has tenant assignments, this asset inherits those
 * assignments with type 'inherited'.
 */
export async function resolveInherited(
  assetId: string,
  tenantId: string,
): Promise<AssetTenantAssignment[]> {
  const d = db();

  // Verify asset exists
  const [existing] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, assetId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  // Walk upward through parent relations (max 5 hops)
  const visited = new Set<string>([assetId]);
  let currentIds = [assetId];
  const inherited: AssetTenantAssignment[] = [];
  const maxDepth = 5;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (currentIds.length === 0) break;

    const nextIds: string[] = [];

    for (const currentId of currentIds) {
      const rels = await d
        .select({ parent_id: assetRelations.source_asset_id })
        .from(assetRelations)
        .where(and(
          eq(assetRelations.tenant_id, tenantId),
          eq(assetRelations.target_asset_id, currentId),
        ));

      for (const rel of rels) {
        if (visited.has(rel.parent_id)) continue;
        visited.add(rel.parent_id);

        // Get tenant assignments of this parent
        const parentAssignments = await d
          .select({
            id: assetTenantAssignments.id,
            asset_id: assetTenantAssignments.asset_id,
            tenant_id: assetTenantAssignments.tenant_id,
            assignment_type: assetTenantAssignments.assignment_type,
            notes: assetTenantAssignments.notes,
            created_at: assetTenantAssignments.created_at,
            created_by: assetTenantAssignments.created_by,
            tenant_name: tenants.name,
            parent_display_name: assets.display_name,
          })
          .from(assetTenantAssignments)
          .leftJoin(tenants, eq(assetTenantAssignments.tenant_id, tenants.id))
          .leftJoin(assets, eq(assetTenantAssignments.asset_id, assets.id))
          .where(eq(assetTenantAssignments.asset_id, rel.parent_id));

        for (const pa of parentAssignments) {
          inherited.push({
            id: pa.id,
            asset_id: assetId,
            tenant_id: pa.tenant_id,
            assignment_type: 'inherited',
            inherited_from_asset_id: pa.asset_id,
            notes: pa.notes,
            created_at: pa.created_at,
            created_by: pa.created_by,
            tenant_name: pa.tenant_name ?? '',
            inherited_from_asset_name: pa.parent_display_name ?? null,
          });
        }

        nextIds.push(rel.parent_id);
      }
    }

    currentIds = nextIds;
  }

  return inherited;
}
