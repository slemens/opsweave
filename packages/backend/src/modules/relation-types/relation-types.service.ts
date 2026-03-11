import { eq, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { relationTypes, assetRelations } from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { CreateRelationTypeInput, UpdateRelationTypeInput } from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

export async function listRelationTypes(
  tenantId: string,
  activeOnly = false,
): Promise<unknown[]> {
  const d = db();
  const conditions = [eq(relationTypes.tenant_id, tenantId)];
  if (activeOnly) conditions.push(eq(relationTypes.is_active, 1));

  const rows = await d
    .select()
    .from(relationTypes)
    .where(and(...conditions))
    .orderBy(relationTypes.slug);

  return rows.map(parseRelationType);
}

export async function getRelationType(
  tenantId: string,
  typeId: string,
): Promise<unknown> {
  const d = db();
  const [row] = await d
    .select()
    .from(relationTypes)
    .where(and(eq(relationTypes.tenant_id, tenantId), eq(relationTypes.id, typeId)))
    .limit(1);

  if (!row) throw new NotFoundError('Relation type not found');
  return parseRelationType(row);
}

export async function createRelationType(
  tenantId: string,
  data: CreateRelationTypeInput,
): Promise<unknown> {
  const d = db();
  const id = uuidv4();
  const now = new Date().toISOString();

  try {
    await d.insert(relationTypes).values({
      id,
      tenant_id: tenantId,
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? null,
      is_directional: data.is_directional !== false ? 1 : 0,
      source_types: JSON.stringify(data.source_types ?? []),
      target_types: JSON.stringify(data.target_types ?? []),
      properties_schema: JSON.stringify(data.properties_schema ?? []),
      is_system: 0,
      is_active: 1,
      color: data.color ?? null,
      created_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Relation type with slug "${data.slug}" already exists`);
    }
    throw err;
  }

  return getRelationType(tenantId, id);
}

export async function updateRelationType(
  tenantId: string,
  typeId: string,
  data: UpdateRelationTypeInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(relationTypes)
    .where(and(eq(relationTypes.tenant_id, tenantId), eq(relationTypes.id, typeId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Relation type not found');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.is_directional !== undefined) updateData.is_directional = data.is_directional ? 1 : 0;
  if (data.source_types !== undefined) updateData.source_types = JSON.stringify(data.source_types);
  if (data.target_types !== undefined) updateData.target_types = JSON.stringify(data.target_types);
  if (data.properties_schema !== undefined) updateData.properties_schema = JSON.stringify(data.properties_schema);
  if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;
  if (data.color !== undefined) updateData.color = data.color;

  if (Object.keys(updateData).length > 0) {
    await d
      .update(relationTypes)
      .set(updateData)
      .where(and(eq(relationTypes.tenant_id, tenantId), eq(relationTypes.id, typeId)));
  }

  return getRelationType(tenantId, typeId);
}

export async function deleteRelationType(
  tenantId: string,
  typeId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(relationTypes)
    .where(and(eq(relationTypes.tenant_id, tenantId), eq(relationTypes.id, typeId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Relation type not found');
  if (existing.is_system === 1) {
    throw new ConflictError('System relation types cannot be deleted');
  }

  const [relCount] = await d
    .select({ count: count() })
    .from(assetRelations)
    .where(and(eq(assetRelations.tenant_id, tenantId), eq(assetRelations.relation_type, existing.slug)));

  if ((relCount?.count ?? 0) > 0) {
    throw new ConflictError('Cannot delete relation type — relations of this type exist');
  }

  await d
    .delete(relationTypes)
    .where(and(eq(relationTypes.tenant_id, tenantId), eq(relationTypes.id, typeId)));
}

function parseRelationType(row: Record<string, unknown>) {
  return {
    ...row,
    source_types: typeof row.source_types === 'string' ? JSON.parse(row.source_types as string) : row.source_types,
    target_types: typeof row.target_types === 'string' ? JSON.parse(row.target_types as string) : row.target_types,
    properties_schema: typeof row.properties_schema === 'string' ? JSON.parse(row.properties_schema as string) : row.properties_schema,
  };
}
