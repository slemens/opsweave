import { eq, and, count, like, or, asc, desc, inArray, lte, gt, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  assets,
  assetRelations,
  assetRelationHistory,
  assetServiceLinks,
  assetRegulatoryFlags,
  assigneeGroups,
  customers,
  regulatoryFrameworks,
  relationTypes,
  tickets,
  users,
  verticalCatalogs,
  horizontalCatalog,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError, LicenseLimitError } from '../../lib/errors.js';
import { slaEngine } from '../../lib/sla-engine.js';
import { COMMUNITY_LIMITS } from '@opsweave/shared';
import type { AssetFilterParams, CreateAssetInput, UpdateAssetInput } from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Service ──────────────────────────────────────────────

/**
 * List assets with filtering, pagination, and sorting.
 */
export async function listAssets(
  tenantId: string,
  params: AssetFilterParams,
): Promise<{ assets: unknown[]; total: number }> {
  const d = db();
  const { page, limit, sort, order, q, asset_type, asset_types, status, sla_tier, environment, owner_group_id, customer_id } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(assets.tenant_id, tenantId)];

  if (asset_type) {
    conditions.push(eq(assets.asset_type, asset_type));
  } else if (asset_types) {
    const types = asset_types.split(',').filter(Boolean);
    if (types.length > 0) conditions.push(inArray(assets.asset_type, types));
  }
  if (status) conditions.push(eq(assets.status, status));
  if (sla_tier) conditions.push(eq(assets.sla_tier, sla_tier));
  if (environment) conditions.push(eq(assets.environment, environment));
  if (owner_group_id) conditions.push(eq(assets.owner_group_id, owner_group_id));
  if (customer_id) conditions.push(eq(assets.customer_id, customer_id));

  if (q) {
    conditions.push(
      or(
        like(assets.name, `%${q}%`),
        like(assets.display_name, `%${q}%`),
        like(assets.ip_address, `%${q}%`),
        like(assets.location, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(assets)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn = sort === 'name' ? assets.name
    : sort === 'display_name' ? assets.display_name
    : sort === 'asset_type' ? assets.asset_type
    : sort === 'status' ? assets.status
    : sort === 'sla_tier' ? assets.sla_tier
    : sort === 'ip_address' ? assets.ip_address
    : sort === 'updated_at' ? assets.updated_at
    : assets.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select({
      id: assets.id,
      tenant_id: assets.tenant_id,
      asset_type: assets.asset_type,
      name: assets.name,
      display_name: assets.display_name,
      status: assets.status,
      ip_address: assets.ip_address,
      location: assets.location,
      sla_tier: assets.sla_tier,
      environment: assets.environment,
      owner_group_id: assets.owner_group_id,
      customer_id: assets.customer_id,
      attributes: assets.attributes,
      created_at: assets.created_at,
      updated_at: assets.updated_at,
      created_by: assets.created_by,
      group_name: assigneeGroups.name,
      customer_name: customers.name,
    })
    .from(assets)
    .leftJoin(assigneeGroups, eq(assets.owner_group_id, assigneeGroups.id))
    .leftJoin(customers, eq(assets.customer_id, customers.id))
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  const shaped = rows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    asset_type: row.asset_type,
    name: row.name,
    display_name: row.display_name,
    status: row.status,
    ip_address: row.ip_address,
    location: row.location,
    sla_tier: row.sla_tier,
    environment: row.environment,
    owner_group_id: row.owner_group_id,
    customer_id: row.customer_id,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    owner_group: row.owner_group_id ? { id: row.owner_group_id, name: row.group_name ?? '' } : null,
    customer: row.customer_id ? { id: row.customer_id, name: row.customer_name ?? '' } : null,
  }));

  return { assets: shaped, total };
}

/**
 * Get a single asset with related entity information.
 */
export async function getAsset(
  tenantId: string,
  assetId: string,
): Promise<unknown> {
  const d = db();

  const rows = await d
    .select({
      id: assets.id,
      tenant_id: assets.tenant_id,
      asset_type: assets.asset_type,
      name: assets.name,
      display_name: assets.display_name,
      status: assets.status,
      ip_address: assets.ip_address,
      location: assets.location,
      sla_tier: assets.sla_tier,
      environment: assets.environment,
      owner_group_id: assets.owner_group_id,
      customer_id: assets.customer_id,
      attributes: assets.attributes,
      created_at: assets.created_at,
      updated_at: assets.updated_at,
      created_by: assets.created_by,
      group_name: assigneeGroups.name,
      customer_name: customers.name,
    })
    .from(assets)
    .leftJoin(assigneeGroups, eq(assets.owner_group_id, assigneeGroups.id))
    .leftJoin(customers, eq(assets.customer_id, customers.id))
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, assetId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Asset not found');
  }

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    asset_type: row.asset_type,
    name: row.name,
    display_name: row.display_name,
    status: row.status,
    ip_address: row.ip_address,
    location: row.location,
    sla_tier: row.sla_tier,
    environment: row.environment,
    owner_group_id: row.owner_group_id,
    customer_id: row.customer_id,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    owner_group: row.owner_group_id ? { id: row.owner_group_id, name: row.group_name ?? '' } : null,
    customer: row.customer_id ? { id: row.customer_id, name: row.customer_name ?? '' } : null,
  };
}

/**
 * Create a new asset.
 */
export async function createAsset(
  tenantId: string,
  data: CreateAssetInput,
  userId: string,
): Promise<unknown> {
  const d = db();

  // License-aware limit check
  const { validateLicenseKey } = await import('../../middleware/license.js');
  const { getTenantLicenseKey } = await import('../tenants/tenants.service.js');
  const licenseKey = await getTenantLicenseKey(tenantId);
  const licensePayload = validateLicenseKey(licenseKey);
  const maxAssets = licensePayload?.limits?.maxAssets ?? COMMUNITY_LIMITS.maxAssets;

  // -1 = unlimited (Enterprise)
  if (maxAssets !== -1) {
    const [countResult] = await d
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.tenant_id, tenantId));

    const currentCount = countResult?.count ?? 0;
    if (currentCount >= maxAssets) {
      throw new LicenseLimitError(
        `Asset limit reached (${maxAssets}). Upgrade to Enterprise for unlimited assets.`,
      );
    }
  }

  const now = new Date().toISOString();
  const id = uuidv4();

  await d.insert(assets).values({
    id,
    tenant_id: tenantId,
    asset_type: data.asset_type,
    name: data.name,
    display_name: data.display_name,
    status: data.status ?? 'active',
    ip_address: data.ip_address ?? null,
    location: data.location ?? null,
    sla_tier: data.sla_tier ?? 'none',
    environment: data.environment ?? null,
    owner_group_id: data.owner_group_id ?? null,
    customer_id: data.customer_id ?? null,
    attributes: JSON.stringify(data.attributes ?? {}),
    created_at: now,
    updated_at: now,
    created_by: userId,
  });

  return getAsset(tenantId, id);
}

/**
 * Update an existing asset.
 */
export async function updateAsset(
  tenantId: string,
  assetId: string,
  data: UpdateAssetInput,
  _userId: string,
): Promise<unknown> {
  const d = db();

  // Check existence
  const [existing] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, assetId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.asset_type !== undefined) updateData.asset_type = data.asset_type;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.display_name !== undefined) updateData.display_name = data.display_name;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.ip_address !== undefined) updateData.ip_address = data.ip_address;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.sla_tier !== undefined) updateData.sla_tier = data.sla_tier;
  if (data.environment !== undefined) updateData.environment = data.environment;
  if (data.owner_group_id !== undefined) updateData.owner_group_id = data.owner_group_id;
  if (data.customer_id !== undefined) updateData.customer_id = data.customer_id;
  if (data.attributes !== undefined) updateData.attributes = JSON.stringify(data.attributes);

  await d
    .update(assets)
    .set(updateData)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, assetId)));

  return getAsset(tenantId, assetId);
}

/**
 * Delete an asset. Fails if relations or tickets reference it.
 */
export async function deleteAsset(
  tenantId: string,
  assetId: string,
): Promise<void> {
  const d = db();

  // Check existence
  const [existing] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, assetId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  // Check for linked relations
  const [relCount] = await d
    .select({ count: count() })
    .from(assetRelations)
    .where(
      and(
        eq(assetRelations.tenant_id, tenantId),
        or(
          eq(assetRelations.source_asset_id, assetId),
          eq(assetRelations.target_asset_id, assetId),
        ),
      ),
    );

  if ((relCount?.count ?? 0) > 0) {
    throw new ConflictError('Cannot delete asset — it has linked relations. Remove them first.');
  }

  // Check for linked tickets
  const [ticketCount] = await d
    .select({ count: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        eq(tickets.asset_id, assetId),
      ),
    );

  if ((ticketCount?.count ?? 0) > 0) {
    throw new ConflictError('Cannot delete asset — it has linked tickets.');
  }

  await d
    .delete(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, assetId)));
}

/**
 * Get all relations for an asset (as source or target).
 */
export async function getAssetRelations(
  tenantId: string,
  assetId: string,
  options?: { asOf?: string },
): Promise<unknown[]> {
  const d = db();

  // Build temporal filter conditions if asOf is provided
  const temporalConditions = options?.asOf
    ? [
        or(isNull(assetRelations.valid_from), lte(assetRelations.valid_from, options.asOf)),
        or(isNull(assetRelations.valid_until), gt(assetRelations.valid_until, options.asOf)),
      ]
    : [];

  // Relations where this asset is the source
  const sourceRows = await d
    .select({
      id: assetRelations.id,
      tenant_id: assetRelations.tenant_id,
      source_asset_id: assetRelations.source_asset_id,
      target_asset_id: assetRelations.target_asset_id,
      relation_type: assetRelations.relation_type,
      properties: assetRelations.properties,
      valid_from: assetRelations.valid_from,
      valid_until: assetRelations.valid_until,
      metadata: assetRelations.metadata,
      created_at: assetRelations.created_at,
      created_by: assetRelations.created_by,
      target_name: assets.display_name,
      target_asset_type: assets.asset_type,
    })
    .from(assetRelations)
    .leftJoin(assets, eq(assetRelations.target_asset_id, assets.id))
    .where(
      and(
        eq(assetRelations.tenant_id, tenantId),
        eq(assetRelations.source_asset_id, assetId),
        ...temporalConditions,
      ),
    );

  // Relations where this asset is the target
  const targetRelRows = await d
    .select({
      id: assetRelations.id,
      tenant_id: assetRelations.tenant_id,
      source_asset_id: assetRelations.source_asset_id,
      target_asset_id: assetRelations.target_asset_id,
      relation_type: assetRelations.relation_type,
      properties: assetRelations.properties,
      valid_from: assetRelations.valid_from,
      valid_until: assetRelations.valid_until,
      metadata: assetRelations.metadata,
      created_at: assetRelations.created_at,
      created_by: assetRelations.created_by,
    })
    .from(assetRelations)
    .where(
      and(
        eq(assetRelations.tenant_id, tenantId),
        eq(assetRelations.target_asset_id, assetId),
        ...temporalConditions,
      ),
    );

  // Fetch source asset names for target relations
  const sourceIds = targetRelRows.map((r) => r.source_asset_id);
  const sourceAssetMap = new Map<string, { display_name: string; asset_type: string }>();
  if (sourceIds.length > 0) {
    for (const sourceId of sourceIds) {
      const [a] = await d
        .select({ display_name: assets.display_name, asset_type: assets.asset_type })
        .from(assets)
        .where(eq(assets.id, sourceId))
        .limit(1);
      if (a) {
        sourceAssetMap.set(sourceId, a);
      }
    }
  }

  const parseJson = (val: string | null | undefined) => {
    if (!val) return {};
    try { return JSON.parse(val); } catch { return {}; }
  };

  const outgoing = sourceRows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    source_asset_id: row.source_asset_id,
    target_asset_id: row.target_asset_id,
    relation_type: row.relation_type,
    properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties,
    valid_from: row.valid_from ?? null,
    valid_until: row.valid_until ?? null,
    metadata: parseJson(row.metadata),
    created_at: row.created_at,
    created_by: row.created_by,
    direction: 'outgoing' as const,
    related_asset: {
      id: row.target_asset_id,
      display_name: row.target_name ?? '',
      asset_type: row.target_asset_type ?? '',
    },
  }));

  const incoming = targetRelRows.map((row) => {
    const src = sourceAssetMap.get(row.source_asset_id);
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      source_asset_id: row.source_asset_id,
      target_asset_id: row.target_asset_id,
      relation_type: row.relation_type,
      properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties,
      valid_from: row.valid_from ?? null,
      valid_until: row.valid_until ?? null,
      metadata: parseJson(row.metadata),
      created_at: row.created_at,
      created_by: row.created_by,
      direction: 'incoming' as const,
      related_asset: {
        id: row.source_asset_id,
        display_name: src?.display_name ?? '',
        asset_type: src?.asset_type ?? '',
      },
    };
  });

  return [...outgoing, ...incoming];
}

/**
 * Create a relation between two assets.
 */
export async function createAssetRelation(
  tenantId: string,
  data: { source_asset_id: string; target_asset_id: string; relation_type: string; properties?: Record<string, unknown>; valid_from?: string | null; valid_until?: string | null; metadata?: Record<string, unknown> },
  userId: string,
): Promise<unknown> {
  const d = db();

  // Verify both assets exist in the same tenant
  const [source] = await d
    .select({ id: assets.id, asset_type: assets.asset_type })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, data.source_asset_id)))
    .limit(1);

  if (!source) {
    throw new NotFoundError('Source asset not found');
  }

  const [target] = await d
    .select({ id: assets.id, asset_type: assets.asset_type })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, data.target_asset_id)))
    .limit(1);

  if (!target) {
    throw new NotFoundError('Target asset not found');
  }

  // Evo-3D: Validate source/target type constraints from relation type registry
  const [relType] = await d
    .select({ source_types: relationTypes.source_types, target_types: relationTypes.target_types })
    .from(relationTypes)
    .where(and(eq(relationTypes.tenant_id, tenantId), eq(relationTypes.slug, data.relation_type)))
    .limit(1);

  if (relType) {
    const parseTypes = (json: string | null): string[] => {
      if (!json) return [];
      try { const arr = JSON.parse(json); return Array.isArray(arr) ? arr : []; } catch { return []; }
    };
    const allowedSource = parseTypes(relType.source_types);
    const allowedTarget = parseTypes(relType.target_types);

    if (allowedSource.length > 0 && !allowedSource.includes(source.asset_type)) {
      throw new ConflictError(`Source asset type '${source.asset_type}' is not allowed for relation type '${data.relation_type}'`);
    }
    if (allowedTarget.length > 0 && !allowedTarget.includes(target.asset_type)) {
      throw new ConflictError(`Target asset type '${target.asset_type}' is not allowed for relation type '${data.relation_type}'`);
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  try {
    await d.insert(assetRelations).values({
      id,
      tenant_id: tenantId,
      source_asset_id: data.source_asset_id,
      target_asset_id: data.target_asset_id,
      relation_type: data.relation_type,
      properties: JSON.stringify(data.properties ?? {}),
      valid_from: data.valid_from ?? null,
      valid_until: data.valid_until ?? null,
      metadata: JSON.stringify(data.metadata ?? {}),
      created_at: now,
      created_by: userId,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError('This relation already exists');
    }
    throw err;
  }

  // REQ-3.3b: Record creation in relation history
  await d.insert(assetRelationHistory).values({
    id: uuidv4(),
    relation_id: id,
    tenant_id: tenantId,
    action: 'created',
    changed_by: userId,
    changed_at: now,
    old_values: null,
    new_values: JSON.stringify({
      source_asset_id: data.source_asset_id,
      target_asset_id: data.target_asset_id,
      relation_type: data.relation_type,
      properties: data.properties ?? {},
      valid_from: data.valid_from ?? null,
      valid_until: data.valid_until ?? null,
    }),
  });

  return {
    id,
    tenant_id: tenantId,
    source_asset_id: data.source_asset_id,
    target_asset_id: data.target_asset_id,
    relation_type: data.relation_type,
    properties: data.properties ?? {},
    valid_from: data.valid_from ?? null,
    valid_until: data.valid_until ?? null,
    metadata: data.metadata ?? {},
    created_at: now,
    created_by: userId,
  };
}

/**
 * Update an existing asset relation (properties, valid_from, valid_until, metadata).
 * REQ-3.2a: Edge Properties on Relations
 */
export async function updateAssetRelation(
  tenantId: string,
  relationId: string,
  data: { properties?: Record<string, unknown>; valid_from?: string | null; valid_until?: string | null; metadata?: Record<string, unknown> },
  userId?: string,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select({
      id: assetRelations.id,
      source_asset_id: assetRelations.source_asset_id,
      target_asset_id: assetRelations.target_asset_id,
      relation_type: assetRelations.relation_type,
      properties: assetRelations.properties,
      valid_from: assetRelations.valid_from,
      valid_until: assetRelations.valid_until,
    })
    .from(assetRelations)
    .where(and(eq(assetRelations.tenant_id, tenantId), eq(assetRelations.id, relationId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Relation not found');
  }

  const updateData: Record<string, unknown> = {};
  if (data.properties !== undefined) updateData.properties = JSON.stringify(data.properties);
  if (data.valid_from !== undefined) updateData.valid_from = data.valid_from;
  if (data.valid_until !== undefined) updateData.valid_until = data.valid_until;
  if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

  if (Object.keys(updateData).length > 0) {
    // REQ-3.3b: Record modification in relation history
    const parseProps = (val: string | null | undefined) => {
      if (!val) return {};
      try { return JSON.parse(val); } catch { return {}; }
    };
    await d.insert(assetRelationHistory).values({
      id: uuidv4(),
      relation_id: relationId,
      tenant_id: tenantId,
      action: 'modified',
      changed_by: userId ?? null,
      changed_at: new Date().toISOString(),
      old_values: JSON.stringify({
        properties: parseProps(existing.properties),
        valid_from: existing.valid_from,
        valid_until: existing.valid_until,
      }),
      new_values: JSON.stringify({
        properties: data.properties ?? parseProps(existing.properties),
        valid_from: data.valid_from !== undefined ? data.valid_from : existing.valid_from,
        valid_until: data.valid_until !== undefined ? data.valid_until : existing.valid_until,
      }),
    });

    await d
      .update(assetRelations)
      .set(updateData)
      .where(and(eq(assetRelations.tenant_id, tenantId), eq(assetRelations.id, relationId)));
  }

  const [updated] = await d
    .select({
      id: assetRelations.id,
      tenant_id: assetRelations.tenant_id,
      source_asset_id: assetRelations.source_asset_id,
      target_asset_id: assetRelations.target_asset_id,
      relation_type: assetRelations.relation_type,
      properties: assetRelations.properties,
      valid_from: assetRelations.valid_from,
      valid_until: assetRelations.valid_until,
      metadata: assetRelations.metadata,
      created_at: assetRelations.created_at,
      created_by: assetRelations.created_by,
    })
    .from(assetRelations)
    .where(and(eq(assetRelations.tenant_id, tenantId), eq(assetRelations.id, relationId)))
    .limit(1);

  if (!updated) {
    throw new NotFoundError('Relation not found after update');
  }

  const parseJsonLocal = (val: string | null | undefined) => {
    if (!val) return {};
    try { return JSON.parse(val); } catch { return {}; }
  };

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    source_asset_id: updated.source_asset_id,
    target_asset_id: updated.target_asset_id,
    relation_type: updated.relation_type,
    properties: typeof updated.properties === 'string' ? JSON.parse(updated.properties) : updated.properties,
    valid_from: updated.valid_from ?? null,
    valid_until: updated.valid_until ?? null,
    metadata: parseJsonLocal(updated.metadata),
    created_at: updated.created_at,
    created_by: updated.created_by,
  };
}

/**
 * Delete an asset relation.
 */
export async function deleteAssetRelation(
  tenantId: string,
  relationId: string,
  userId?: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({
      id: assetRelations.id,
      source_asset_id: assetRelations.source_asset_id,
      target_asset_id: assetRelations.target_asset_id,
      relation_type: assetRelations.relation_type,
      properties: assetRelations.properties,
      valid_from: assetRelations.valid_from,
      valid_until: assetRelations.valid_until,
    })
    .from(assetRelations)
    .where(and(eq(assetRelations.tenant_id, tenantId), eq(assetRelations.id, relationId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Relation not found');
  }

  // REQ-3.3b: Record deletion in relation history
  await d.insert(assetRelationHistory).values({
    id: uuidv4(),
    relation_id: relationId,
    tenant_id: tenantId,
    action: 'deleted',
    changed_by: userId ?? null,
    changed_at: new Date().toISOString(),
    old_values: JSON.stringify({
      source_asset_id: existing.source_asset_id,
      target_asset_id: existing.target_asset_id,
      relation_type: existing.relation_type,
      properties: typeof existing.properties === 'string' ? JSON.parse(existing.properties) : existing.properties,
      valid_from: existing.valid_from,
      valid_until: existing.valid_until,
    }),
    new_values: null,
  });

  await d
    .delete(assetRelations)
    .where(and(eq(assetRelations.tenant_id, tenantId), eq(assetRelations.id, relationId)));
}

/**
 * Get asset statistics.
 */
export async function getAssetStats(
  tenantId: string,
): Promise<{ by_type: Record<string, number>; by_status: Record<string, number>; by_sla: Record<string, number>; total: number }> {
  const d = db();

  const [totalResult] = await d
    .select({ count: count() })
    .from(assets)
    .where(eq(assets.tenant_id, tenantId));

  const total = totalResult?.count ?? 0;

  const typeRows = await d
    .select({ asset_type: assets.asset_type, count: count() })
    .from(assets)
    .where(eq(assets.tenant_id, tenantId))
    .groupBy(assets.asset_type);

  const statusRows = await d
    .select({ status: assets.status, count: count() })
    .from(assets)
    .where(eq(assets.tenant_id, tenantId))
    .groupBy(assets.status);

  const slaRows = await d
    .select({ sla_tier: assets.sla_tier, count: count() })
    .from(assets)
    .where(eq(assets.tenant_id, tenantId))
    .groupBy(assets.sla_tier);

  const by_type: Record<string, number> = {};
  for (const row of typeRows) {
    by_type[row.asset_type] = row.count;
  }

  const by_status: Record<string, number> = {};
  for (const row of statusRows) {
    by_status[row.status] = row.count;
  }

  const by_sla: Record<string, number> = {};
  for (const row of slaRows) {
    by_sla[row.sla_tier] = row.count;
  }

  return { by_type, by_status, by_sla, total };
}

/**
 * Get the full connected component (BFS) graph centred on a given asset.
 */
export async function getAssetGraph(
  tenantId: string,
  assetId: string,
): Promise<{
  nodes: Array<{ id: string; display_name: string; asset_type: string; status: string; name: string }>;
  edges: Array<{ id: string; source_asset_id: string; target_asset_id: string; relation_type: string }>;
  centerAssetId: string;
}> {
  const d = db();

  // Load ALL relations for this tenant once
  const allRelations = await d
    .select({
      id: assetRelations.id,
      source_asset_id: assetRelations.source_asset_id,
      target_asset_id: assetRelations.target_asset_id,
      relation_type: assetRelations.relation_type,
    })
    .from(assetRelations)
    .where(eq(assetRelations.tenant_id, tenantId));

  // BFS to find full connected component starting from assetId
  const visited = new Set<string>([assetId]);
  const queue = [assetId];
  const relevantEdges: typeof allRelations = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const rel of allRelations) {
      if (rel.source_asset_id === current || rel.target_asset_id === current) {
        relevantEdges.push(rel);
        const neighbor = rel.source_asset_id === current ? rel.target_asset_id : rel.source_asset_id;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  // Deduplicate edges
  const edgeMap = new Map<string, (typeof allRelations)[0]>();
  for (const e of relevantEdges) edgeMap.set(e.id, e);
  const uniqueEdges = Array.from(edgeMap.values());

  if (visited.size === 0) return { nodes: [], edges: [], centerAssetId: assetId };

  // Fetch all visited asset nodes
  const nodeRows = await d
    .select({
      id: assets.id,
      name: assets.name,
      display_name: assets.display_name,
      asset_type: assets.asset_type,
      status: assets.status,
    })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), inArray(assets.id, Array.from(visited))));

  return { nodes: nodeRows, edges: uniqueEdges, centerAssetId: assetId };
}

/**
 * Get the full topology graph (all assets + all relations) for a tenant.
 */
export async function getFullAssetGraph(tenantId: string): Promise<{
  nodes: Array<{ id: string; display_name: string; asset_type: string; status: string; name: string }>;
  edges: Array<{ id: string; source_asset_id: string; target_asset_id: string; relation_type: string }>;
}> {
  const d = db();
  const [nodeRows, edgeRows] = await Promise.all([
    d
      .select({
        id: assets.id,
        name: assets.name,
        display_name: assets.display_name,
        asset_type: assets.asset_type,
        status: assets.status,
      })
      .from(assets)
      .where(eq(assets.tenant_id, tenantId)),
    d
      .select({
        id: assetRelations.id,
        source_asset_id: assetRelations.source_asset_id,
        target_asset_id: assetRelations.target_asset_id,
        relation_type: assetRelations.relation_type,
      })
      .from(assetRelations)
      .where(eq(assetRelations.tenant_id, tenantId)),
  ]);
  return { nodes: nodeRows, edges: edgeRows };
}

/**
 * Get tickets linked to an asset.
 */
export async function getAssetTickets(
  tenantId: string,
  assetId: string,
): Promise<unknown[]> {
  const d = db();

  const rows = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      ticket_type: tickets.ticket_type,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      created_at: tickets.created_at,
      assignee_name: users.display_name,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assignee_id, users.id))
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        eq(tickets.asset_id, assetId),
      ),
    )
    .orderBy(desc(tickets.created_at));

  return rows.map((row) => ({
    id: row.id,
    ticket_number: row.ticket_number,
    ticket_type: row.ticket_type,
    title: row.title,
    status: row.status,
    priority: row.priority,
    created_at: row.created_at,
    assignee: row.assignee_name ? { display_name: row.assignee_name } : null,
  }));
}

// ─── AUDIT-FIX: H-10 — Missing Asset Sub-Endpoints ──────

/**
 * Get the SLA inheritance chain for an asset.
 * Walks the DAG upward (child → parent) and returns every hop with its SLA tier.
 * The first entry is the asset itself; subsequent entries are ancestors.
 */
export async function getAssetSlaChain(
  tenantId: string,
  assetId: string,
): Promise<{
  resolved_tier: string | null;
  chain: Array<{
    level: number;
    source: 'self' | 'inherited';
    sla_tier: string;
    asset_id: string;
    asset_name: string;
  }>;
}> {
  const d = db();

  // Verify asset exists
  const selfRows = await d
    .select({ id: assets.id, display_name: assets.display_name, sla_tier: assets.sla_tier })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.tenant_id, tenantId)))
    .limit(1);

  const self = selfRows[0];
  if (!self) {
    throw new NotFoundError('Asset not found');
  }

  const chain: Array<{
    level: number;
    source: 'self' | 'inherited';
    sla_tier: string;
    asset_id: string;
    asset_name: string;
  }> = [];

  // Level 0: the asset itself
  chain.push({
    level: 0,
    source: 'self',
    sla_tier: self.sla_tier,
    asset_id: self.id,
    asset_name: self.display_name,
  });

  // Walk upward through the DAG (max 5 hops, matching sla-engine)
  let currentIds = [assetId];
  const visited = new Set<string>([assetId]);
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

        const parentRows = await d
          .select({ id: assets.id, display_name: assets.display_name, sla_tier: assets.sla_tier })
          .from(assets)
          .where(and(eq(assets.id, rel.parent_id), eq(assets.tenant_id, tenantId)))
          .limit(1);

        const parent = parentRows[0];
        if (parent) {
          chain.push({
            level: depth,
            source: 'inherited',
            sla_tier: parent.sla_tier,
            asset_id: parent.id,
            asset_name: parent.display_name,
          });
          nextIds.push(parent.id);
        }
      }
    }

    currentIds = nextIds;
  }

  // Resolve the effective tier using the existing engine
  const resolved_tier = await slaEngine.resolveSlaTier(tenantId, assetId);

  return { resolved_tier, chain };
}

/**
 * Get services linked to an asset via asset_service_links → vertical catalogs.
 */
export async function getAssetServices(
  tenantId: string,
  assetId: string,
): Promise<Array<{
  vertical_catalog_id: string;
  vertical_catalog_name: string;
  base_catalog_name: string | null;
  effective_from: string;
  effective_until: string | null;
}>> {
  const d = db();

  // Verify asset exists
  const selfRows = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.tenant_id, tenantId)))
    .limit(1);

  if (!selfRows[0]) {
    throw new NotFoundError('Asset not found');
  }

  // Query asset_service_links → vertical_catalogs → horizontal_catalog
  const rows = await d
    .select({
      vertical_catalog_id: assetServiceLinks.vertical_id,
      vertical_catalog_name: verticalCatalogs.name,
      base_catalog_name: horizontalCatalog.name,
      effective_from: assetServiceLinks.effective_from,
      effective_until: assetServiceLinks.effective_until,
    })
    .from(assetServiceLinks)
    .innerJoin(verticalCatalogs, eq(assetServiceLinks.vertical_id, verticalCatalogs.id))
    .leftJoin(horizontalCatalog, eq(verticalCatalogs.base_catalog_id, horizontalCatalog.id))
    .where(and(
      eq(assetServiceLinks.tenant_id, tenantId),
      eq(assetServiceLinks.asset_id, assetId),
    ));

  return rows.map((r) => ({
    vertical_catalog_id: r.vertical_catalog_id,
    vertical_catalog_name: r.vertical_catalog_name,
    base_catalog_name: r.base_catalog_name,
    effective_from: r.effective_from,
    effective_until: r.effective_until,
  }));
}

/**
 * Get compliance/regulatory flags for an asset.
 * Returns all regulatory frameworks this asset is flagged under.
 */
export async function getAssetCompliance(
  tenantId: string,
  assetId: string,
): Promise<Array<{
  framework_id: string;
  framework_name: string;
  framework_version: string | null;
  reason: string | null;
  flagged_at: string;
  flagged_by: string;
}>> {
  const d = db();

  // Verify asset exists
  const selfRows = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.tenant_id, tenantId)))
    .limit(1);

  if (!selfRows[0]) {
    throw new NotFoundError('Asset not found');
  }

  const rows = await d
    .select({
      framework_id: assetRegulatoryFlags.framework_id,
      framework_name: regulatoryFrameworks.name,
      framework_version: regulatoryFrameworks.version,
      reason: assetRegulatoryFlags.reason,
      flagged_at: assetRegulatoryFlags.flagged_at,
      flagged_by: assetRegulatoryFlags.flagged_by,
    })
    .from(assetRegulatoryFlags)
    .innerJoin(regulatoryFrameworks, eq(assetRegulatoryFlags.framework_id, regulatoryFrameworks.id))
    .where(and(
      eq(assetRegulatoryFlags.tenant_id, tenantId),
      eq(assetRegulatoryFlags.asset_id, assetId),
    ));

  return rows;
}

// ─── REQ-3.3b — History Endpoints ────────────────────────────

/**
 * Get relation change history for an asset.
 * Returns all history entries for relations where this asset is source or target.
 */
export async function getAssetRelationHistoryEntries(
  tenantId: string,
  assetId: string,
): Promise<Array<{
  id: string;
  relation_id: string;
  action: string;
  changed_by: string | null;
  changed_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by_name: string | null;
}>> {
  const d = db();

  // Get all relation IDs that involve this asset (current and historical)
  const relRows = await d
    .select({ id: assetRelations.id })
    .from(assetRelations)
    .where(
      and(
        eq(assetRelations.tenant_id, tenantId),
        or(
          eq(assetRelations.source_asset_id, assetId),
          eq(assetRelations.target_asset_id, assetId),
        ),
      ),
    );

  const relIds = relRows.map((r) => r.id);

  // Also find relation IDs from history that reference this asset (for deleted relations)
  const historyRelIds = await d
    .select({ relation_id: assetRelationHistory.relation_id })
    .from(assetRelationHistory)
    .where(eq(assetRelationHistory.tenant_id, tenantId));

  // Filter history entries whose old_values or new_values reference this asset
  const allHistoryRelIds = new Set(relIds);
  for (const h of historyRelIds) {
    allHistoryRelIds.add(h.relation_id);
  }

  if (allHistoryRelIds.size === 0) return [];

  const rows = await d
    .select({
      id: assetRelationHistory.id,
      relation_id: assetRelationHistory.relation_id,
      action: assetRelationHistory.action,
      changed_by: assetRelationHistory.changed_by,
      changed_at: assetRelationHistory.changed_at,
      old_values: assetRelationHistory.old_values,
      new_values: assetRelationHistory.new_values,
      changed_by_name: users.display_name,
    })
    .from(assetRelationHistory)
    .leftJoin(users, eq(assetRelationHistory.changed_by, users.id))
    .where(
      and(
        eq(assetRelationHistory.tenant_id, tenantId),
        inArray(assetRelationHistory.relation_id, Array.from(allHistoryRelIds)),
      ),
    )
    .orderBy(desc(assetRelationHistory.changed_at));

  const parseJson = (val: string | null): Record<string, unknown> | null => {
    if (!val) return null;
    try { return JSON.parse(val) as Record<string, unknown>; } catch { return null; }
  };

  // Filter: only include entries that actually involve this asset
  return rows
    .map((row) => ({
      id: row.id,
      relation_id: row.relation_id,
      action: row.action,
      changed_by: row.changed_by,
      changed_at: row.changed_at,
      old_values: parseJson(row.old_values),
      new_values: parseJson(row.new_values),
      changed_by_name: row.changed_by_name ?? null,
    }))
    .filter((entry) => {
      // Keep if the relation is directly associated with this asset
      if (relIds.includes(entry.relation_id)) return true;
      // Or if old/new values reference this asset
      const checkAssetId = (vals: Record<string, unknown> | null): boolean => {
        if (!vals) return false;
        return vals.source_asset_id === assetId || vals.target_asset_id === assetId;
      };
      return checkAssetId(entry.old_values) || checkAssetId(entry.new_values);
    });
}

/**
 * Get capacity change history for an asset.
 */
export async function getAssetCapacityHistoryEntries(
  tenantId: string,
  assetId: string,
): Promise<Array<{
  id: string;
  asset_id: string;
  capacity_type_id: string;
  old_total: number | null;
  old_allocated: number | null;
  new_total: number | null;
  new_allocated: number | null;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
  changed_by_name: string | null;
  capacity_type_name: string | null;
}>> {
  const d = db();

  const { assetCapacityHistory, capacityTypes } = await import('../../db/schema/index.js');

  const rows = await d
    .select({
      id: assetCapacityHistory.id,
      asset_id: assetCapacityHistory.asset_id,
      capacity_type_id: assetCapacityHistory.capacity_type_id,
      old_total: assetCapacityHistory.old_total,
      old_allocated: assetCapacityHistory.old_allocated,
      new_total: assetCapacityHistory.new_total,
      new_allocated: assetCapacityHistory.new_allocated,
      changed_by: assetCapacityHistory.changed_by,
      changed_at: assetCapacityHistory.changed_at,
      reason: assetCapacityHistory.reason,
      changed_by_name: users.display_name,
      capacity_type_name: capacityTypes.name,
    })
    .from(assetCapacityHistory)
    .leftJoin(users, eq(assetCapacityHistory.changed_by, users.id))
    .leftJoin(capacityTypes, eq(assetCapacityHistory.capacity_type_id, capacityTypes.id))
    .where(
      and(
        eq(assetCapacityHistory.tenant_id, tenantId),
        eq(assetCapacityHistory.asset_id, assetId),
      ),
    )
    .orderBy(desc(assetCapacityHistory.changed_at));

  return rows.map((row) => ({
    id: row.id,
    asset_id: row.asset_id,
    capacity_type_id: row.capacity_type_id,
    old_total: row.old_total,
    old_allocated: row.old_allocated,
    new_total: row.new_total,
    new_allocated: row.new_allocated,
    changed_by: row.changed_by,
    changed_at: row.changed_at,
    reason: row.reason,
    changed_by_name: row.changed_by_name ?? null,
    capacity_type_name: row.capacity_type_name ?? null,
  }));
}
