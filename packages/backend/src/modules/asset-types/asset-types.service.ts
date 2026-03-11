import { eq, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { assetTypes, assets } from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { CreateAssetTypeInput, UpdateAssetTypeInput } from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

/**
 * List all asset types for a tenant.
 */
export async function listAssetTypes(
  tenantId: string,
  activeOnly = false,
): Promise<unknown[]> {
  const d = db();
  const conditions = [eq(assetTypes.tenant_id, tenantId)];
  if (activeOnly) {
    conditions.push(eq(assetTypes.is_active, 1));
  }

  const rows = await d
    .select()
    .from(assetTypes)
    .where(and(...conditions))
    .orderBy(assetTypes.category, assetTypes.slug);

  return rows.map(parseAssetType);
}

/**
 * Get a single asset type by ID.
 */
export async function getAssetType(
  tenantId: string,
  typeId: string,
): Promise<unknown> {
  const d = db();
  const [row] = await d
    .select()
    .from(assetTypes)
    .where(and(eq(assetTypes.tenant_id, tenantId), eq(assetTypes.id, typeId)))
    .limit(1);

  if (!row) throw new NotFoundError('Asset type not found');
  return parseAssetType(row);
}

/**
 * Validate that an asset_type slug exists for the given tenant.
 * Returns the type record or null.
 */
export async function validateAssetType(
  tenantId: string,
  slug: string,
): Promise<unknown | null> {
  const d = db();
  const [row] = await d
    .select()
    .from(assetTypes)
    .where(and(
      eq(assetTypes.tenant_id, tenantId),
      eq(assetTypes.slug, slug),
      eq(assetTypes.is_active, 1),
    ))
    .limit(1);

  return row ? parseAssetType(row) : null;
}

/**
 * Create a new asset type.
 */
export async function createAssetType(
  tenantId: string,
  data: CreateAssetTypeInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    await d.insert(assetTypes).values({
      id,
      tenant_id: tenantId,
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? 'other',
      icon: data.icon ?? null,
      color: data.color ?? null,
      is_system: 0,
      is_active: 1,
      attribute_schema: JSON.stringify(data.attribute_schema ?? []),
      created_at: now,
      updated_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Asset type with slug "${data.slug}" already exists`);
    }
    throw err;
  }

  return getAssetType(tenantId, id);
}

/**
 * Update an existing asset type. System types can only be partially modified.
 */
export async function updateAssetType(
  tenantId: string,
  typeId: string,
  data: UpdateAssetTypeInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(assetTypes)
    .where(and(eq(assetTypes.tenant_id, tenantId), eq(assetTypes.id, typeId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Asset type not found');

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;
  if (data.attribute_schema !== undefined) updateData.attribute_schema = JSON.stringify(data.attribute_schema);

  await d
    .update(assetTypes)
    .set(updateData)
    .where(and(eq(assetTypes.tenant_id, tenantId), eq(assetTypes.id, typeId)));

  return getAssetType(tenantId, typeId);
}

/**
 * Delete an asset type. System types cannot be deleted.
 * Fails if assets of this type exist.
 */
export async function deleteAssetType(
  tenantId: string,
  typeId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(assetTypes)
    .where(and(eq(assetTypes.tenant_id, tenantId), eq(assetTypes.id, typeId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Asset type not found');
  if (existing.is_system === 1) {
    throw new ConflictError('System asset types cannot be deleted');
  }

  // Check if any assets use this type
  const [assetCount] = await d
    .select({ count: count() })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.asset_type, existing.slug)));

  if ((assetCount?.count ?? 0) > 0) {
    throw new ConflictError('Cannot delete asset type — assets of this type exist');
  }

  await d
    .delete(assetTypes)
    .where(and(eq(assetTypes.tenant_id, tenantId), eq(assetTypes.id, typeId)));
}

// ── Helpers ──────────────────────────────────────────

function parseAssetType(row: Record<string, unknown>) {
  return {
    ...row,
    attribute_schema: typeof row.attribute_schema === 'string'
      ? JSON.parse(row.attribute_schema as string)
      : row.attribute_schema,
  };
}
