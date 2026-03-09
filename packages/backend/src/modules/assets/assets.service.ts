import { eq, and, count, like, or, asc, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  assets,
  assetRelations,
  assigneeGroups,
  customers,
  tickets,
  users,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError, LicenseLimitError } from '../../lib/errors.js';
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
  const { page, limit, sort, order, q, asset_type, status, sla_tier, environment, owner_group_id, customer_id } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(assets.tenant_id, tenantId)];

  if (asset_type) conditions.push(eq(assets.asset_type, asset_type));
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

  // Community Edition limit check
  const [countResult] = await d
    .select({ count: count() })
    .from(assets)
    .where(eq(assets.tenant_id, tenantId));

  const currentCount = countResult?.count ?? 0;
  if (currentCount >= COMMUNITY_LIMITS.maxAssets) {
    throw new LicenseLimitError(
      `Asset limit reached (${COMMUNITY_LIMITS.maxAssets}). Upgrade to Enterprise for unlimited assets.`,
    );
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
): Promise<unknown[]> {
  const d = db();

  // We need two separate queries: one for source, one for target,
  // then merge them. Drizzle doesn't support self-join aliases easily
  // so we use a raw approach with separate queries.

  // Relations where this asset is the source
  const sourceRows = await d
    .select({
      id: assetRelations.id,
      tenant_id: assetRelations.tenant_id,
      source_asset_id: assetRelations.source_asset_id,
      target_asset_id: assetRelations.target_asset_id,
      relation_type: assetRelations.relation_type,
      properties: assetRelations.properties,
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
      ),
    );

  // Relations where this asset is the target — need source info
  // Use a subquery approach: fetch relations, then fetch source names
  const targetRelRows = await d
    .select({
      id: assetRelations.id,
      tenant_id: assetRelations.tenant_id,
      source_asset_id: assetRelations.source_asset_id,
      target_asset_id: assetRelations.target_asset_id,
      relation_type: assetRelations.relation_type,
      properties: assetRelations.properties,
      created_at: assetRelations.created_at,
      created_by: assetRelations.created_by,
    })
    .from(assetRelations)
    .where(
      and(
        eq(assetRelations.tenant_id, tenantId),
        eq(assetRelations.target_asset_id, assetId),
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

  const outgoing = sourceRows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    source_asset_id: row.source_asset_id,
    target_asset_id: row.target_asset_id,
    relation_type: row.relation_type,
    properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties,
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
  data: { source_asset_id: string; target_asset_id: string; relation_type: string; properties?: Record<string, unknown> },
  userId: string,
): Promise<unknown> {
  const d = db();

  // Verify both assets exist in the same tenant
  const [source] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, data.source_asset_id)))
    .limit(1);

  if (!source) {
    throw new NotFoundError('Source asset not found');
  }

  const [target] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, data.target_asset_id)))
    .limit(1);

  if (!target) {
    throw new NotFoundError('Target asset not found');
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
      created_at: now,
      created_by: userId,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError('This relation already exists');
    }
    throw err;
  }

  return {
    id,
    tenant_id: tenantId,
    source_asset_id: data.source_asset_id,
    target_asset_id: data.target_asset_id,
    relation_type: data.relation_type,
    properties: data.properties ?? {},
    created_at: now,
    created_by: userId,
  };
}

/**
 * Delete an asset relation.
 */
export async function deleteAssetRelation(
  tenantId: string,
  relationId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ id: assetRelations.id })
    .from(assetRelations)
    .where(and(eq(assetRelations.tenant_id, tenantId), eq(assetRelations.id, relationId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Relation not found');
  }

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
