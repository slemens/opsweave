import { eq, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { capacityTypes, assetCapacities } from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { CreateCapacityTypeInput, SetAssetCapacityInput } from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ── Capacity Types ──────────────────────────────────────────

/**
 * List all capacity types for a tenant.
 */
export async function listCapacityTypes(tenantId: string): Promise<unknown[]> {
  const d = db();
  const rows = await d
    .select()
    .from(capacityTypes)
    .where(eq(capacityTypes.tenant_id, tenantId))
    .orderBy(capacityTypes.category, capacityTypes.slug);
  return rows;
}

/**
 * Create a new capacity type. Slug must be unique per tenant.
 */
export async function createCapacityType(
  tenantId: string,
  data: CreateCapacityTypeInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    await d.insert(capacityTypes).values({
      id,
      tenant_id: tenantId,
      slug: data.slug,
      name: data.name,
      unit: data.unit,
      category: data.category ?? null,
      is_system: 0,
      created_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Capacity type with slug "${data.slug}" already exists`);
    }
    throw err;
  }

  return getCapacityTypeById(tenantId, id);
}

/**
 * Update a capacity type. System types: only name can be changed.
 */
export async function updateCapacityType(
  tenantId: string,
  typeId: string,
  data: Partial<Pick<CreateCapacityTypeInput, 'name' | 'unit' | 'category'>>,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(capacityTypes)
    .where(and(eq(capacityTypes.tenant_id, tenantId), eq(capacityTypes.id, typeId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Capacity type not found');

  const updateData: Record<string, unknown> = {};

  if (existing.is_system === 1) {
    // System types: only name can be updated
    if (data.name !== undefined) updateData.name = data.name;
  } else {
    if (data.name !== undefined) updateData.name = data.name;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.category !== undefined) updateData.category = data.category;
  }

  if (Object.keys(updateData).length > 0) {
    await d
      .update(capacityTypes)
      .set(updateData)
      .where(and(eq(capacityTypes.tenant_id, tenantId), eq(capacityTypes.id, typeId)));
  }

  return getCapacityTypeById(tenantId, typeId);
}

/**
 * Delete a capacity type. Cannot delete system types or types in use.
 */
export async function deleteCapacityType(
  tenantId: string,
  typeId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(capacityTypes)
    .where(and(eq(capacityTypes.tenant_id, tenantId), eq(capacityTypes.id, typeId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Capacity type not found');
  if (existing.is_system === 1) {
    throw new ConflictError('System capacity types cannot be deleted');
  }

  // Check if any asset capacities use this type
  const [usage] = await d
    .select({ count: count() })
    .from(assetCapacities)
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.capacity_type_id, typeId),
    ));

  if ((usage?.count ?? 0) > 0) {
    throw new ConflictError('Cannot delete capacity type — it is in use by asset capacities');
  }

  await d
    .delete(capacityTypes)
    .where(and(eq(capacityTypes.tenant_id, tenantId), eq(capacityTypes.id, typeId)));
}

// ── Asset Capacities ────────────────────────────────────────

/**
 * Get all capacity entries for an asset.
 */
export async function getAssetCapacities(
  tenantId: string,
  assetId: string,
): Promise<unknown[]> {
  const d = db();
  const rows = await d
    .select({
      id: assetCapacities.id,
      asset_id: assetCapacities.asset_id,
      capacity_type_id: assetCapacities.capacity_type_id,
      tenant_id: assetCapacities.tenant_id,
      direction: assetCapacities.direction,
      total: assetCapacities.total,
      allocated: assetCapacities.allocated,
      reserved: assetCapacities.reserved,
      created_at: assetCapacities.created_at,
      updated_at: assetCapacities.updated_at,
      // Join capacity type info
      type_slug: capacityTypes.slug,
      type_name: capacityTypes.name,
      type_unit: capacityTypes.unit,
      type_category: capacityTypes.category,
    })
    .from(assetCapacities)
    .innerJoin(capacityTypes, eq(assetCapacities.capacity_type_id, capacityTypes.id))
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.asset_id, assetId),
    ))
    .orderBy(capacityTypes.slug, assetCapacities.direction);

  return rows;
}

/**
 * Set (upsert) a capacity entry for an asset.
 * If an entry with same (asset_id, capacity_type_id, direction) exists, update it.
 * Otherwise, insert a new entry.
 */
export async function setAssetCapacity(
  tenantId: string,
  assetId: string,
  data: SetAssetCapacityInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();

  // Verify capacity type exists for this tenant
  const [capType] = await d
    .select()
    .from(capacityTypes)
    .where(and(
      eq(capacityTypes.tenant_id, tenantId),
      eq(capacityTypes.id, data.capacity_type_id),
    ))
    .limit(1);

  if (!capType) throw new NotFoundError('Capacity type not found');

  // Check for existing entry with same (asset_id, capacity_type_id, direction)
  const [existing] = await d
    .select()
    .from(assetCapacities)
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.asset_id, assetId),
      eq(assetCapacities.capacity_type_id, data.capacity_type_id),
      eq(assetCapacities.direction, data.direction),
    ))
    .limit(1);

  let entryId: string;

  if (existing) {
    // Update existing entry
    entryId = existing.id;
    await d
      .update(assetCapacities)
      .set({
        total: String(data.total),
        updated_at: now,
      })
      .where(eq(assetCapacities.id, existing.id));
  } else {
    // Insert new entry
    entryId = uuidv4();
    await d.insert(assetCapacities).values({
      id: entryId,
      asset_id: assetId,
      capacity_type_id: data.capacity_type_id,
      tenant_id: tenantId,
      direction: data.direction,
      total: String(data.total),
      allocated: '0',
      reserved: '0',
      created_at: now,
      updated_at: now,
    });
  }

  // Return the entry with joined type info
  const [result] = await d
    .select({
      id: assetCapacities.id,
      asset_id: assetCapacities.asset_id,
      capacity_type_id: assetCapacities.capacity_type_id,
      tenant_id: assetCapacities.tenant_id,
      direction: assetCapacities.direction,
      total: assetCapacities.total,
      allocated: assetCapacities.allocated,
      reserved: assetCapacities.reserved,
      created_at: assetCapacities.created_at,
      updated_at: assetCapacities.updated_at,
      type_slug: capacityTypes.slug,
      type_name: capacityTypes.name,
      type_unit: capacityTypes.unit,
      type_category: capacityTypes.category,
    })
    .from(assetCapacities)
    .innerJoin(capacityTypes, eq(assetCapacities.capacity_type_id, capacityTypes.id))
    .where(eq(assetCapacities.id, entryId))
    .limit(1);

  return result;
}

/**
 * Delete an asset capacity entry.
 */
export async function deleteAssetCapacity(
  tenantId: string,
  capacityId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(assetCapacities)
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.id, capacityId),
    ))
    .limit(1);

  if (!existing) throw new NotFoundError('Asset capacity entry not found');

  await d
    .delete(assetCapacities)
    .where(eq(assetCapacities.id, capacityId));
}

/**
 * Get capacity utilization for an asset.
 * Returns per capacity type: total, allocated, reserved, available, percentage.
 */
export async function getCapacityUtilization(
  tenantId: string,
  assetId: string,
): Promise<unknown[]> {
  const d = db();

  const rows = await d
    .select({
      id: assetCapacities.id,
      capacity_type_id: assetCapacities.capacity_type_id,
      direction: assetCapacities.direction,
      total: assetCapacities.total,
      allocated: assetCapacities.allocated,
      reserved: assetCapacities.reserved,
      type_slug: capacityTypes.slug,
      type_name: capacityTypes.name,
      type_unit: capacityTypes.unit,
      type_category: capacityTypes.category,
    })
    .from(assetCapacities)
    .innerJoin(capacityTypes, eq(assetCapacities.capacity_type_id, capacityTypes.id))
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.asset_id, assetId),
    ))
    .orderBy(capacityTypes.slug, assetCapacities.direction);

  return rows.map((row) => {
    const total = parseFloat(row.total) || 0;
    const allocated = parseFloat(row.allocated) || 0;
    const reserved = parseFloat(row.reserved) || 0;
    const available = Math.max(0, total - allocated - reserved);
    const utilizationPercent = total > 0
      ? Math.round(((allocated + reserved) / total) * 10000) / 100
      : 0;

    return {
      id: row.id,
      capacity_type_id: row.capacity_type_id,
      direction: row.direction,
      total,
      allocated,
      reserved,
      available,
      utilization_percent: utilizationPercent,
      type_slug: row.type_slug,
      type_name: row.type_name,
      type_unit: row.type_unit,
      type_category: row.type_category,
    };
  });
}

// ── Helpers ──────────────────────────────────────────────────

async function getCapacityTypeById(
  tenantId: string,
  typeId: string,
): Promise<unknown> {
  const d = db();
  const [row] = await d
    .select()
    .from(capacityTypes)
    .where(and(eq(capacityTypes.tenant_id, tenantId), eq(capacityTypes.id, typeId)))
    .limit(1);

  if (!row) throw new NotFoundError('Capacity type not found');
  return row;
}
