import { eq, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { capacityTypes, assetCapacities, assetCapacityHistory, assets, assetRelations, relationTypes } from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { CreateCapacityTypeInput, SetAssetCapacityInput, CapacityMapping } from '@opsweave/shared';

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
      source_relation_id: assetCapacities.source_relation_id,
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
  userId?: string,
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

    const newAllocated = data.allocated !== undefined ? data.allocated : (parseFloat(existing.allocated) || 0);
    const newReserved = data.reserved !== undefined ? data.reserved : (parseFloat(existing.reserved) || 0);

    // REQ-3.3b: Record capacity change in history
    await d.insert(assetCapacityHistory).values({
      id: uuidv4(),
      asset_id: assetId,
      capacity_type_id: data.capacity_type_id,
      tenant_id: tenantId,
      old_total: Math.round(parseFloat(existing.total) || 0),
      old_allocated: Math.round(parseFloat(existing.allocated) || 0),
      new_total: Math.round(data.total),
      new_allocated: Math.round(newAllocated),
      changed_by: userId ?? null,
      changed_at: now,
      reason: null,
    });

    await d
      .update(assetCapacities)
      .set({
        total: String(data.total),
        allocated: String(newAllocated),
        reserved: String(newReserved),
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
      allocated: String(data.allocated ?? 0),
      reserved: String(data.reserved ?? 0),
      created_at: now,
      updated_at: now,
    });

    // REQ-3.3b: Record capacity creation in history
    await d.insert(assetCapacityHistory).values({
      id: uuidv4(),
      asset_id: assetId,
      capacity_type_id: data.capacity_type_id,
      tenant_id: tenantId,
      old_total: null,
      old_allocated: null,
      new_total: Math.round(data.total),
      new_allocated: 0,
      changed_by: userId ?? null,
      changed_at: now,
      reason: null,
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
      source_relation_id: assetCapacities.source_relation_id,
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
      source_relation_id: assetCapacities.source_relation_id,
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
      capacity_type: {
        slug: row.type_slug,
        name: row.type_name,
        unit: row.type_unit,
        category: row.type_category,
      },
      direction: row.direction,
      total,
      allocated,
      reserved,
      available,
      utilization_pct: utilizationPercent,
      source_relation_id: row.source_relation_id,
    };
  });
}

// ── Capacity Planning (REQ-3.4a / REQ-3.4b) ─────────────────

/**
 * Utilization overview: aggregated utilization across all assets
 * that PROVIDE capacity.
 */
export interface UtilizationOverviewItem {
  assetId: string;
  assetName: string;
  assetType: string;
  capacities: Array<{
    capacityTypeId: string;
    type: string;
    unit: string;
    total: number;
    allocated: number;
    reserved: number;
    available: number;
    utilizationPct: number;
  }>;
}

export async function getUtilizationOverview(
  tenantId: string,
): Promise<UtilizationOverviewItem[]> {
  const d = db();

  const rows = await d
    .select({
      assetId: assetCapacities.asset_id,
      assetName: assets.display_name,
      assetType: assets.asset_type,
      capacityTypeId: assetCapacities.capacity_type_id,
      typeName: capacityTypes.name,
      typeUnit: capacityTypes.unit,
      total: assetCapacities.total,
      allocated: assetCapacities.allocated,
      reserved: assetCapacities.reserved,
    })
    .from(assetCapacities)
    .innerJoin(assets, eq(assetCapacities.asset_id, assets.id))
    .innerJoin(capacityTypes, eq(assetCapacities.capacity_type_id, capacityTypes.id))
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.direction, 'provides'),
    ))
    .orderBy(assets.display_name, capacityTypes.name);

  // Group by asset
  const assetMap = new Map<string, UtilizationOverviewItem>();
  for (const row of rows) {
    let entry = assetMap.get(row.assetId);
    if (!entry) {
      entry = {
        assetId: row.assetId,
        assetName: row.assetName,
        assetType: row.assetType,
        capacities: [],
      };
      assetMap.set(row.assetId, entry);
    }
    const total = parseFloat(row.total) || 0;
    const allocated = parseFloat(row.allocated) || 0;
    const reserved = parseFloat(row.reserved) || 0;
    const available = Math.max(0, total - allocated - reserved);
    const utilizationPct = total > 0
      ? Math.round(((allocated + reserved) / total) * 10000) / 100
      : 0;

    entry.capacities.push({
      capacityTypeId: row.capacityTypeId,
      type: row.typeName,
      unit: row.typeUnit,
      total,
      allocated,
      reserved,
      available,
      utilizationPct,
    });
  }

  return Array.from(assetMap.values());
}

/**
 * Find assets that provide ALL requested capacity types with sufficient free capacity.
 * Returns sorted by best fit (most total free capacity first).
 */
export interface CapacityRequirement {
  capacityTypeId: string;
  value: number;
}

export interface CompatibleHost {
  assetId: string;
  assetName: string;
  assetType: string;
  capacities: Array<{
    capacityTypeId: string;
    type: string;
    unit: string;
    total: number;
    allocated: number;
    reserved: number;
    available: number;
    required: number;
    remainingAfter: number;
  }>;
  /** Sum of (available - required) across all requirements; higher = better fit */
  fitScore: number;
}

export async function findCompatibleHosts(
  tenantId: string,
  requirements: CapacityRequirement[],
): Promise<CompatibleHost[]> {
  if (requirements.length === 0) return [];

  const d = db();

  // Fetch all 'provides' capacities for the requested types
  const rows = await d
    .select({
      assetId: assetCapacities.asset_id,
      assetName: assets.display_name,
      assetType: assets.asset_type,
      capacityTypeId: assetCapacities.capacity_type_id,
      typeName: capacityTypes.name,
      typeUnit: capacityTypes.unit,
      total: assetCapacities.total,
      allocated: assetCapacities.allocated,
      reserved: assetCapacities.reserved,
    })
    .from(assetCapacities)
    .innerJoin(assets, eq(assetCapacities.asset_id, assets.id))
    .innerJoin(capacityTypes, eq(assetCapacities.capacity_type_id, capacityTypes.id))
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.direction, 'provides'),
    ))
    .orderBy(assets.display_name);

  // Build per-asset capacity map
  const assetMap = new Map<string, {
    assetId: string;
    assetName: string;
    assetType: string;
    caps: Map<string, { typeName: string; typeUnit: string; total: number; allocated: number; reserved: number }>;
  }>();

  for (const row of rows) {
    let entry = assetMap.get(row.assetId);
    if (!entry) {
      entry = {
        assetId: row.assetId,
        assetName: row.assetName,
        assetType: row.assetType,
        caps: new Map(),
      };
      assetMap.set(row.assetId, entry);
    }
    entry.caps.set(row.capacityTypeId, {
      typeName: row.typeName,
      typeUnit: row.typeUnit,
      total: parseFloat(row.total) || 0,
      allocated: parseFloat(row.allocated) || 0,
      reserved: parseFloat(row.reserved) || 0,
    });
  }

  // Filter: asset must have ALL required types with sufficient free capacity
  const results: CompatibleHost[] = [];
  for (const entry of assetMap.values()) {
    let allSatisfied = true;
    let fitScore = 0;
    const capacities: CompatibleHost['capacities'] = [];

    for (const req of requirements) {
      const cap = entry.caps.get(req.capacityTypeId);
      if (!cap) {
        allSatisfied = false;
        break;
      }
      const available = Math.max(0, cap.total - cap.allocated - cap.reserved);
      if (available < req.value) {
        allSatisfied = false;
        break;
      }
      const remainingAfter = available - req.value;
      fitScore += remainingAfter;
      capacities.push({
        capacityTypeId: req.capacityTypeId,
        type: cap.typeName,
        unit: cap.typeUnit,
        total: cap.total,
        allocated: cap.allocated,
        reserved: cap.reserved,
        available,
        required: req.value,
        remainingAfter,
      });
    }

    if (allSatisfied) {
      results.push({
        assetId: entry.assetId,
        assetName: entry.assetName,
        assetType: entry.assetType,
        capacities,
        fitScore,
      });
    }
  }

  // Sort by best fit (most free capacity first)
  results.sort((a, b) => b.fitScore - a.fitScore);
  return results;
}

/**
 * Check if a workload (asset that REQUIRES capacity) can fit on a target
 * (asset that PROVIDES capacity).
 */
export interface MigrationFeasibilityResult {
  feasible: boolean;
  workloadAssetId: string;
  workloadAssetName: string;
  targetAssetId: string;
  targetAssetName: string;
  details: Array<{
    capacityTypeId: string;
    type: string;
    unit: string;
    required: number;
    available: number;
    sufficient: boolean;
  }>;
}

export async function checkMigrationFeasibility(
  tenantId: string,
  workloadAssetId: string,
  targetAssetId: string,
): Promise<MigrationFeasibilityResult> {
  const d = db();

  // Get workload's requirements
  const workloadRows = await d
    .select({
      capacityTypeId: assetCapacities.capacity_type_id,
      total: assetCapacities.total,
      typeName: capacityTypes.name,
      typeUnit: capacityTypes.unit,
    })
    .from(assetCapacities)
    .innerJoin(capacityTypes, eq(assetCapacities.capacity_type_id, capacityTypes.id))
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.asset_id, workloadAssetId),
      eq(assetCapacities.direction, 'requires'),
    ));

  // Get target's provided capacities
  const targetRows = await d
    .select({
      capacityTypeId: assetCapacities.capacity_type_id,
      total: assetCapacities.total,
      allocated: assetCapacities.allocated,
      reserved: assetCapacities.reserved,
      typeName: capacityTypes.name,
      typeUnit: capacityTypes.unit,
    })
    .from(assetCapacities)
    .innerJoin(capacityTypes, eq(assetCapacities.capacity_type_id, capacityTypes.id))
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.asset_id, targetAssetId),
      eq(assetCapacities.direction, 'provides'),
    ));

  // Get asset names
  const [workloadAsset] = await d
    .select({ name: assets.display_name })
    .from(assets)
    .where(and(eq(assets.id, workloadAssetId), eq(assets.tenant_id, tenantId)))
    .limit(1);

  const [targetAsset] = await d
    .select({ name: assets.display_name })
    .from(assets)
    .where(and(eq(assets.id, targetAssetId), eq(assets.tenant_id, tenantId)))
    .limit(1);

  if (!workloadAsset) throw new NotFoundError('Workload asset not found');
  if (!targetAsset) throw new NotFoundError('Target asset not found');

  const targetCaps = new Map<string, { total: number; allocated: number; reserved: number; typeName: string; typeUnit: string }>();
  for (const row of targetRows) {
    targetCaps.set(row.capacityTypeId, {
      total: parseFloat(row.total) || 0,
      allocated: parseFloat(row.allocated) || 0,
      reserved: parseFloat(row.reserved) || 0,
      typeName: row.typeName,
      typeUnit: row.typeUnit,
    });
  }

  let feasible = true;
  const details: MigrationFeasibilityResult['details'] = [];

  for (const wRow of workloadRows) {
    const required = parseFloat(wRow.total) || 0;
    const tCap = targetCaps.get(wRow.capacityTypeId);
    const available = tCap
      ? Math.max(0, tCap.total - tCap.allocated - tCap.reserved)
      : 0;
    const sufficient = available >= required;
    if (!sufficient) feasible = false;

    details.push({
      capacityTypeId: wRow.capacityTypeId,
      type: wRow.typeName,
      unit: wRow.typeUnit,
      required,
      available,
      sufficient,
    });
  }

  return {
    feasible,
    workloadAssetId,
    workloadAssetName: workloadAsset.name,
    targetAssetId,
    targetAssetName: targetAsset.name,
    details,
  };
}

/**
 * Find assets where utilization is below threshold% for any provided capacity type.
 */
export interface OverprovisionedAsset {
  assetId: string;
  assetName: string;
  assetType: string;
  underutilizedCapacities: Array<{
    capacityTypeId: string;
    type: string;
    unit: string;
    total: number;
    allocated: number;
    reserved: number;
    utilizationPct: number;
  }>;
}

export async function getOverprovisionedAssets(
  tenantId: string,
  threshold: number = 30,
): Promise<OverprovisionedAsset[]> {
  const d = db();

  const rows = await d
    .select({
      assetId: assetCapacities.asset_id,
      assetName: assets.display_name,
      assetType: assets.asset_type,
      capacityTypeId: assetCapacities.capacity_type_id,
      typeName: capacityTypes.name,
      typeUnit: capacityTypes.unit,
      total: assetCapacities.total,
      allocated: assetCapacities.allocated,
      reserved: assetCapacities.reserved,
    })
    .from(assetCapacities)
    .innerJoin(assets, eq(assetCapacities.asset_id, assets.id))
    .innerJoin(capacityTypes, eq(assetCapacities.capacity_type_id, capacityTypes.id))
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.direction, 'provides'),
    ))
    .orderBy(assets.display_name);

  const assetMap = new Map<string, OverprovisionedAsset>();

  for (const row of rows) {
    const total = parseFloat(row.total) || 0;
    const allocated = parseFloat(row.allocated) || 0;
    const reserved = parseFloat(row.reserved) || 0;
    const utilizationPct = total > 0
      ? Math.round(((allocated + reserved) / total) * 10000) / 100
      : 0;

    if (utilizationPct < threshold) {
      let entry = assetMap.get(row.assetId);
      if (!entry) {
        entry = {
          assetId: row.assetId,
          assetName: row.assetName,
          assetType: row.assetType,
          underutilizedCapacities: [],
        };
        assetMap.set(row.assetId, entry);
      }
      entry.underutilizedCapacities.push({
        capacityTypeId: row.capacityTypeId,
        type: row.typeName,
        unit: row.typeUnit,
        total,
        allocated,
        reserved,
        utilizationPct,
      });
    }
  }

  return Array.from(assetMap.values());
}

// ── Capacity Consumers (Drill-Down) ─────────────────────────

/**
 * Get all assets that consume a specific capacity type from a provider asset.
 * Finds related assets (via asset_relations in both directions) and checks
 * if they have a 'consumes' entry for the same capacity type.
 * Assets without explicit consumes entries are still shown (consumed = null).
 */
export interface CapacityConsumer {
  assetId: string;
  assetName: string;
  assetType: string;
  relationType: string;
  consumed: number | null;
  unit: string;
}

export async function getCapacityConsumers(
  tenantId: string,
  providerAssetId: string,
  capacityTypeId: string,
): Promise<CapacityConsumer[]> {
  const d = db();

  // Find all assets related to the provider in BOTH directions:
  // - source→target=provider (e.g. VM "runs_on" Host, Firewall "connected_to" Switch)
  // - source=provider→target (e.g. provider "feeds" consumer)
  // Exclude structural relations like "member_of" that don't imply capacity consumption
  const structuralRelations = ['part_of', 'documented_by'];

  const incomingRows = await d
    .select({
      relatedAssetId: assetRelations.source_asset_id,
      relationType: assetRelations.relation_type,
    })
    .from(assetRelations)
    .where(and(
      eq(assetRelations.tenant_id, tenantId),
      eq(assetRelations.target_asset_id, providerAssetId),
    ));

  const outgoingRows = await d
    .select({
      relatedAssetId: assetRelations.target_asset_id,
      relationType: assetRelations.relation_type,
    })
    .from(assetRelations)
    .where(and(
      eq(assetRelations.tenant_id, tenantId),
      eq(assetRelations.source_asset_id, providerAssetId),
    ));

  const relatedMap = new Map<string, string>();
  for (const r of [...incomingRows, ...outgoingRows]) {
    if (!structuralRelations.includes(r.relationType)) {
      relatedMap.set(r.relatedAssetId, r.relationType);
    }
  }

  if (relatedMap.size === 0) return [];

  // Get capacity type info for unit
  const [capType] = await d
    .select({ unit: capacityTypes.unit })
    .from(capacityTypes)
    .where(eq(capacityTypes.id, capacityTypeId))
    .limit(1);

  const unit = capType?.unit ?? '';

  // For each related asset: get asset info + optional consumes entry
  const consumers: CapacityConsumer[] = [];

  for (const [relatedId, relationType] of relatedMap) {
    // Get asset info
    const [asset] = await d
      .select({
        displayName: assets.display_name,
        assetType: assets.asset_type,
      })
      .from(assets)
      .where(and(eq(assets.id, relatedId), eq(assets.tenant_id, tenantId)))
      .limit(1);

    if (!asset) continue;

    // Check for explicit consumes entry
    const [cap] = await d
      .select({ total: assetCapacities.total })
      .from(assetCapacities)
      .where(and(
        eq(assetCapacities.tenant_id, tenantId),
        eq(assetCapacities.asset_id, relatedId),
        eq(assetCapacities.capacity_type_id, capacityTypeId),
        eq(assetCapacities.direction, 'consumes'),
      ))
      .limit(1);

    consumers.push({
      assetId: relatedId,
      assetName: asset.displayName,
      assetType: asset.assetType,
      relationType,
      consumed: cap ? (parseFloat(cap.total) || 0) : null,
      unit,
    });
  }

  // Sort: tracked consumers first (by consumed desc), then untracked alphabetically
  consumers.sort((a, b) => {
    if (a.consumed !== null && b.consumed !== null) return b.consumed - a.consumed;
    if (a.consumed !== null) return -1;
    if (b.consumed !== null) return 1;
    return a.assetName.localeCompare(b.assetName);
  });

  return consumers;
}

// ── Capacity-Relation Sync ───────────────────────────────────

/**
 * Sync capacity consumes entries from a relation's properties.
 * Called after relation create/update.
 * Reads capacity_mappings from the relation type and upserts consumes entries
 * on the source asset with source_relation_id set.
 */
export async function syncCapacityFromRelation(
  tenantId: string,
  relationId: string,
  sourceAssetId: string,
  targetAssetId: string,
  relationType: string,
  properties: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  const d = db();

  // Get capacity_mappings from relation type
  const [relType] = await d
    .select({ capacity_mappings: relationTypes.capacity_mappings })
    .from(relationTypes)
    .where(and(eq(relationTypes.tenant_id, tenantId), eq(relationTypes.slug, relationType)))
    .limit(1);

  if (!relType) return;

  let mappings: CapacityMapping[] = [];
  try {
    const parsed = JSON.parse(relType.capacity_mappings);
    if (Array.isArray(parsed)) mappings = parsed;
  } catch { /* empty */ }

  if (mappings.length === 0) return;

  const now = new Date().toISOString();

  // Get all capacity types for this tenant (keyed by slug)
  const allCapTypes = await d
    .select({ id: capacityTypes.id, slug: capacityTypes.slug })
    .from(capacityTypes)
    .where(eq(capacityTypes.tenant_id, tenantId));

  const capBySlug = new Map(allCapTypes.map((ct) => [ct.slug, ct.id]));

  for (const mapping of mappings) {
    const value = properties[mapping.property_key];
    if (value === undefined || value === null || value === '') continue;

    const capTypeId = capBySlug.get(mapping.capacity_type_slug);
    if (!capTypeId) continue;

    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) continue;

    // Check if a consumes entry already exists for this relation
    const [existing] = await d
      .select()
      .from(assetCapacities)
      .where(and(
        eq(assetCapacities.tenant_id, tenantId),
        eq(assetCapacities.asset_id, sourceAssetId),
        eq(assetCapacities.capacity_type_id, capTypeId),
        eq(assetCapacities.direction, 'consumes'),
        eq(assetCapacities.source_relation_id, relationId),
      ))
      .limit(1);

    if (existing) {
      const oldTotal = parseFloat(existing.total) || 0;
      if (oldTotal !== numValue) {
        // Record history
        await d.insert(assetCapacityHistory).values({
          id: uuidv4(),
          asset_id: sourceAssetId,
          capacity_type_id: capTypeId,
          tenant_id: tenantId,
          old_total: Math.round(oldTotal),
          old_allocated: Math.round(parseFloat(existing.allocated) || 0),
          new_total: Math.round(numValue),
          new_allocated: Math.round(parseFloat(existing.allocated) || 0),
          changed_by: userId ?? null,
          changed_at: now,
          reason: 'relation_sync',
        });

        await d
          .update(assetCapacities)
          .set({ total: String(numValue), updated_at: now })
          .where(eq(assetCapacities.id, existing.id));
      }
    } else {
      // Need to handle unique constraint: (asset_id, capacity_type_id, direction)
      // If a manual consumes entry exists without source_relation_id, we create alongside it
      // by using a different approach — we use the unique combo WITH source_relation_id
      // But the DB unique constraint is on (asset_id, capacity_type_id, direction) without source_relation_id
      // So we check if there's already a consumes entry for this type
      const [existingManual] = await d
        .select()
        .from(assetCapacities)
        .where(and(
          eq(assetCapacities.tenant_id, tenantId),
          eq(assetCapacities.asset_id, sourceAssetId),
          eq(assetCapacities.capacity_type_id, capTypeId),
          eq(assetCapacities.direction, 'consumes'),
        ))
        .limit(1);

      if (existingManual) {
        // Update existing entry to be relation-linked
        const oldTotal = parseFloat(existingManual.total) || 0;
        await d.insert(assetCapacityHistory).values({
          id: uuidv4(),
          asset_id: sourceAssetId,
          capacity_type_id: capTypeId,
          tenant_id: tenantId,
          old_total: Math.round(oldTotal),
          old_allocated: Math.round(parseFloat(existingManual.allocated) || 0),
          new_total: Math.round(numValue),
          new_allocated: Math.round(parseFloat(existingManual.allocated) || 0),
          changed_by: userId ?? null,
          changed_at: now,
          reason: 'relation_sync',
        });

        await d
          .update(assetCapacities)
          .set({
            total: String(numValue),
            source_relation_id: relationId,
            updated_at: now,
          })
          .where(eq(assetCapacities.id, existingManual.id));
      } else {
        // Insert new consumes entry
        await d.insert(assetCapacities).values({
          id: uuidv4(),
          asset_id: sourceAssetId,
          capacity_type_id: capTypeId,
          tenant_id: tenantId,
          direction: 'consumes',
          total: String(numValue),
          allocated: String(numValue),
          reserved: '0',
          source_relation_id: relationId,
          created_at: now,
          updated_at: now,
        });

        await d.insert(assetCapacityHistory).values({
          id: uuidv4(),
          asset_id: sourceAssetId,
          capacity_type_id: capTypeId,
          tenant_id: tenantId,
          old_total: null,
          old_allocated: null,
          new_total: Math.round(numValue),
          new_allocated: Math.round(numValue),
          changed_by: userId ?? null,
          changed_at: now,
          reason: 'relation_sync',
        });
      }
    }
  }

  // Recalculate provider's allocated values
  await recalculateProviderAllocated(tenantId, targetAssetId, userId);
}

/**
 * Recalculate the `allocated` field on a provider asset's `provides` entries.
 * Sums all `consumes` entries from related assets for each capacity type.
 */
export async function recalculateProviderAllocated(
  tenantId: string,
  providerAssetId: string,
  userId?: string,
  capacityTypeId?: string,
): Promise<void> {
  const d = db();
  const now = new Date().toISOString();

  // Get all 'provides' entries for this provider
  const providerEntries = await d
    .select()
    .from(assetCapacities)
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.asset_id, providerAssetId),
      eq(assetCapacities.direction, 'provides'),
      ...(capacityTypeId ? [eq(assetCapacities.capacity_type_id, capacityTypeId)] : []),
    ));

  if (providerEntries.length === 0) return;

  // Find all assets that have a relation pointing TO this provider (source → target=provider)
  const consumerRelations = await d
    .select({
      source_asset_id: assetRelations.source_asset_id,
    })
    .from(assetRelations)
    .where(and(
      eq(assetRelations.tenant_id, tenantId),
      eq(assetRelations.target_asset_id, providerAssetId),
    ));

  const consumerAssetIds = consumerRelations.map((r) => r.source_asset_id);

  for (const provEntry of providerEntries) {
    // Sum all consumes entries for this capacity type from related assets
    let totalConsumed = 0;

    if (consumerAssetIds.length > 0) {
      for (const consumerId of consumerAssetIds) {
        const [cap] = await d
          .select({ total: assetCapacities.total })
          .from(assetCapacities)
          .where(and(
            eq(assetCapacities.tenant_id, tenantId),
            eq(assetCapacities.asset_id, consumerId),
            eq(assetCapacities.capacity_type_id, provEntry.capacity_type_id),
            eq(assetCapacities.direction, 'consumes'),
          ))
          .limit(1);

        if (cap) {
          totalConsumed += parseFloat(cap.total) || 0;
        }
      }
    }

    const oldAllocated = parseFloat(provEntry.allocated) || 0;
    if (oldAllocated !== totalConsumed) {
      await d.insert(assetCapacityHistory).values({
        id: uuidv4(),
        asset_id: providerAssetId,
        capacity_type_id: provEntry.capacity_type_id,
        tenant_id: tenantId,
        old_total: Math.round(parseFloat(provEntry.total) || 0),
        old_allocated: Math.round(oldAllocated),
        new_total: Math.round(parseFloat(provEntry.total) || 0),
        new_allocated: Math.round(totalConsumed),
        changed_by: userId ?? null,
        changed_at: now,
        reason: 'auto_recalculated',
      });

      await d
        .update(assetCapacities)
        .set({ allocated: String(totalConsumed), updated_at: now })
        .where(eq(assetCapacities.id, provEntry.id));
    }
  }
}

/**
 * Cleanup capacity entries linked to a deleted relation.
 * Removes all consumes entries with the given source_relation_id
 * and recalculates the provider's allocated values.
 */
export async function cleanupCapacityForDeletedRelation(
  tenantId: string,
  relationId: string,
  targetAssetId: string,
  userId?: string,
): Promise<void> {
  const d = db();
  const now = new Date().toISOString();

  // Find all capacity entries linked to this relation
  const linkedEntries = await d
    .select()
    .from(assetCapacities)
    .where(and(
      eq(assetCapacities.tenant_id, tenantId),
      eq(assetCapacities.source_relation_id, relationId),
    ));

  for (const entry of linkedEntries) {
    // Record deletion in history
    await d.insert(assetCapacityHistory).values({
      id: uuidv4(),
      asset_id: entry.asset_id,
      capacity_type_id: entry.capacity_type_id,
      tenant_id: tenantId,
      old_total: Math.round(parseFloat(entry.total) || 0),
      old_allocated: Math.round(parseFloat(entry.allocated) || 0),
      new_total: null,
      new_allocated: null,
      changed_by: userId ?? null,
      changed_at: now,
      reason: 'relation_deleted',
    });

    await d
      .delete(assetCapacities)
      .where(eq(assetCapacities.id, entry.id));
  }

  // Recalculate provider allocated
  if (linkedEntries.length > 0) {
    await recalculateProviderAllocated(tenantId, targetAssetId, userId);
  }
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
