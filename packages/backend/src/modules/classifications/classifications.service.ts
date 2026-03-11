import { eq, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  classificationModels,
  classificationValues,
  assetClassifications,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import type {
  CreateClassificationModelInput,
  UpdateClassificationModelInput,
  CreateClassificationValueInput,
  ClassifyAssetInput,
} from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ── Helpers ──────────────────────────────────────────

function parseLabel(raw: unknown): Record<string, string> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return raw as Record<string, string>;
  }
  return {};
}

function parseValue(row: Record<string, unknown>) {
  return {
    ...row,
    label: parseLabel(row.label),
  };
}

// =============================================================================
// Classification Models
// =============================================================================

/**
 * List all classification models for a tenant.
 */
export async function listClassificationModels(
  tenantId: string,
): Promise<unknown[]> {
  const d = db();
  const rows = await d
    .select()
    .from(classificationModels)
    .where(eq(classificationModels.tenant_id, tenantId))
    .orderBy(classificationModels.name);

  return rows;
}

/**
 * Get a single classification model by ID, including its values.
 */
export async function getClassificationModel(
  tenantId: string,
  modelId: string,
): Promise<unknown> {
  const d = db();

  const [model] = await d
    .select()
    .from(classificationModels)
    .where(
      and(
        eq(classificationModels.tenant_id, tenantId),
        eq(classificationModels.id, modelId),
      ),
    )
    .limit(1);

  if (!model) throw new NotFoundError('Classification model not found');

  const values = await d
    .select()
    .from(classificationValues)
    .where(eq(classificationValues.model_id, modelId))
    .orderBy(classificationValues.sort_order, classificationValues.value);

  return {
    ...model,
    values: values.map(parseValue),
  };
}

/**
 * Create a new classification model.
 */
export async function createClassificationModel(
  tenantId: string,
  data: CreateClassificationModelInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    await d.insert(classificationModels).values({
      id,
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      is_system: 0,
      is_active: 1,
      created_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(
        `Classification model with name "${data.name}" already exists`,
      );
    }
    throw err;
  }

  logger.info({ tenantId, modelId: id }, 'Classification model created');
  return getClassificationModel(tenantId, id);
}

/**
 * Update an existing classification model.
 * System models: only description and is_active may be changed.
 */
export async function updateClassificationModel(
  tenantId: string,
  modelId: string,
  data: UpdateClassificationModelInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(classificationModels)
    .where(
      and(
        eq(classificationModels.tenant_id, tenantId),
        eq(classificationModels.id, modelId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Classification model not found');

  const updateData: Record<string, unknown> = {};

  if (existing.is_system === 1) {
    // System models: only description and is_active
    if (data.description !== undefined) updateData.description = data.description;
    if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;
  } else {
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;
  }

  if (Object.keys(updateData).length > 0) {
    try {
      await d
        .update(classificationModels)
        .set(updateData)
        .where(
          and(
            eq(classificationModels.tenant_id, tenantId),
            eq(classificationModels.id, modelId),
          ),
        );
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE')) {
        throw new ConflictError(
          `Classification model with name "${data.name}" already exists`,
        );
      }
      throw err;
    }
  }

  return getClassificationModel(tenantId, modelId);
}

/**
 * Delete a classification model.
 * System models cannot be deleted. Models with classifications in use cannot be deleted.
 */
export async function deleteClassificationModel(
  tenantId: string,
  modelId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(classificationModels)
    .where(
      and(
        eq(classificationModels.tenant_id, tenantId),
        eq(classificationModels.id, modelId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Classification model not found');
  if (existing.is_system === 1) {
    throw new ConflictError('System classification models cannot be deleted');
  }

  // Check if any values of this model are in use
  const values = await d
    .select({ id: classificationValues.id })
    .from(classificationValues)
    .where(eq(classificationValues.model_id, modelId));

  if (values.length > 0) {
    const valueIds = values.map((v) => v.id);
    for (const vid of valueIds) {
      const [usageCount] = await d
        .select({ count: count() })
        .from(assetClassifications)
        .where(eq(assetClassifications.value_id, vid));
      if ((usageCount?.count ?? 0) > 0) {
        throw new ConflictError(
          'Cannot delete classification model — values are in use by assets',
        );
      }
    }

    // Delete all values first
    for (const vid of valueIds) {
      await d
        .delete(classificationValues)
        .where(eq(classificationValues.id, vid));
    }
  }

  await d
    .delete(classificationModels)
    .where(
      and(
        eq(classificationModels.tenant_id, tenantId),
        eq(classificationModels.id, modelId),
      ),
    );

  logger.info({ tenantId, modelId }, 'Classification model deleted');
}

// =============================================================================
// Classification Values
// =============================================================================

/**
 * Add a value to a classification model.
 */
export async function createClassificationValue(
  tenantId: string,
  modelId: string,
  data: CreateClassificationValueInput,
): Promise<unknown> {
  const d = db();

  // Verify model exists and belongs to tenant
  const [model] = await d
    .select()
    .from(classificationModels)
    .where(
      and(
        eq(classificationModels.tenant_id, tenantId),
        eq(classificationModels.id, modelId),
      ),
    )
    .limit(1);

  if (!model) throw new NotFoundError('Classification model not found');

  const id = uuidv4();

  try {
    await d.insert(classificationValues).values({
      id,
      model_id: modelId,
      value: data.value,
      label: JSON.stringify(data.label),
      color: data.color ?? null,
      sort_order: data.sort_order ?? 0,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(
        `Value "${data.value}" already exists in this model`,
      );
    }
    throw err;
  }

  const [row] = await d
    .select()
    .from(classificationValues)
    .where(eq(classificationValues.id, id))
    .limit(1);

  return row ? parseValue(row as Record<string, unknown>) : null;
}

/**
 * Update a classification value.
 */
export async function updateClassificationValue(
  tenantId: string,
  valueId: string,
  data: Partial<CreateClassificationValueInput>,
): Promise<unknown> {
  const d = db();

  // Verify value exists and belongs to tenant (via model)
  const [existing] = await d
    .select({
      id: classificationValues.id,
      model_id: classificationValues.model_id,
    })
    .from(classificationValues)
    .innerJoin(
      classificationModels,
      eq(classificationValues.model_id, classificationModels.id),
    )
    .where(
      and(
        eq(classificationValues.id, valueId),
        eq(classificationModels.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Classification value not found');

  const updateData: Record<string, unknown> = {};
  if (data.value !== undefined) updateData.value = data.value;
  if (data.label !== undefined) updateData.label = JSON.stringify(data.label);
  if (data.color !== undefined) updateData.color = data.color;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;

  if (Object.keys(updateData).length > 0) {
    try {
      await d
        .update(classificationValues)
        .set(updateData)
        .where(eq(classificationValues.id, valueId));
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE')) {
        throw new ConflictError(
          `Value "${data.value}" already exists in this model`,
        );
      }
      throw err;
    }
  }

  const [row] = await d
    .select()
    .from(classificationValues)
    .where(eq(classificationValues.id, valueId))
    .limit(1);

  return row ? parseValue(row as Record<string, unknown>) : null;
}

/**
 * Delete a classification value. Fails if it is in use by any asset.
 */
export async function deleteClassificationValue(
  tenantId: string,
  valueId: string,
): Promise<void> {
  const d = db();

  // Verify value exists and belongs to tenant
  const [existing] = await d
    .select({ id: classificationValues.id })
    .from(classificationValues)
    .innerJoin(
      classificationModels,
      eq(classificationValues.model_id, classificationModels.id),
    )
    .where(
      and(
        eq(classificationValues.id, valueId),
        eq(classificationModels.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Classification value not found');

  // Check if in use
  const [usageCount] = await d
    .select({ count: count() })
    .from(assetClassifications)
    .where(eq(assetClassifications.value_id, valueId));

  if ((usageCount?.count ?? 0) > 0) {
    throw new ConflictError(
      'Cannot delete classification value — it is in use by assets',
    );
  }

  await d
    .delete(classificationValues)
    .where(eq(classificationValues.id, valueId));

  logger.info({ tenantId, valueId }, 'Classification value deleted');
}

// =============================================================================
// Asset Classifications
// =============================================================================

/**
 * Classify an asset (add a classification value to it).
 */
export async function classifyAsset(
  tenantId: string,
  assetId: string,
  data: ClassifyAssetInput,
  userId: string,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();

  // Verify the value exists and belongs to a model in this tenant
  const [val] = await d
    .select({ id: classificationValues.id })
    .from(classificationValues)
    .innerJoin(
      classificationModels,
      eq(classificationValues.model_id, classificationModels.id),
    )
    .where(
      and(
        eq(classificationValues.id, data.value_id),
        eq(classificationModels.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!val) throw new NotFoundError('Classification value not found');

  try {
    await d.insert(assetClassifications).values({
      asset_id: assetId,
      value_id: data.value_id,
      tenant_id: tenantId,
      justification: data.justification ?? null,
      classified_by: userId,
      classified_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError('Asset already has this classification');
    }
    throw err;
  }

  logger.info(
    { tenantId, assetId, valueId: data.value_id },
    'Asset classified',
  );
  return getAssetClassifications(tenantId, assetId);
}

/**
 * Remove a classification from an asset.
 */
export async function removeAssetClassification(
  tenantId: string,
  assetId: string,
  valueId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ asset_id: assetClassifications.asset_id })
    .from(assetClassifications)
    .where(
      and(
        eq(assetClassifications.tenant_id, tenantId),
        eq(assetClassifications.asset_id, assetId),
        eq(assetClassifications.value_id, valueId),
      ),
    )
    .limit(1);

  if (!existing) throw new NotFoundError('Asset classification not found');

  await d
    .delete(assetClassifications)
    .where(
      and(
        eq(assetClassifications.tenant_id, tenantId),
        eq(assetClassifications.asset_id, assetId),
        eq(assetClassifications.value_id, valueId),
      ),
    );

  logger.info(
    { tenantId, assetId, valueId },
    'Asset classification removed',
  );
}

/**
 * Get all classifications for an asset, grouped by model.
 */
export async function getAssetClassifications(
  tenantId: string,
  assetId: string,
): Promise<unknown[]> {
  const d = db();

  const rows = await d
    .select({
      asset_id: assetClassifications.asset_id,
      value_id: assetClassifications.value_id,
      justification: assetClassifications.justification,
      classified_by: assetClassifications.classified_by,
      classified_at: assetClassifications.classified_at,
      value: classificationValues.value,
      label: classificationValues.label,
      color: classificationValues.color,
      sort_order: classificationValues.sort_order,
      model_id: classificationValues.model_id,
      model_name: classificationModels.name,
    })
    .from(assetClassifications)
    .innerJoin(
      classificationValues,
      eq(assetClassifications.value_id, classificationValues.id),
    )
    .innerJoin(
      classificationModels,
      eq(classificationValues.model_id, classificationModels.id),
    )
    .where(
      and(
        eq(assetClassifications.tenant_id, tenantId),
        eq(assetClassifications.asset_id, assetId),
      ),
    )
    .orderBy(classificationModels.name, classificationValues.sort_order);

  return rows.map((r) => ({
    ...r,
    label: parseLabel(r.label),
  }));
}
