import { eq, and, count, like, or, asc, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  regulatoryFrameworks,
  regulatoryRequirements,
  requirementServiceMappings,
  assetRegulatoryFlags,
  serviceDescriptions,
  assets,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError, LicenseLimitError } from '../../lib/errors.js';
import { COMMUNITY_LIMITS } from '@opsweave/shared';
import type {
  ComplianceFilterParams,
  CreateRegulatoryFrameworkInput,
  UpdateRegulatoryFrameworkInput,
  CreateRequirementInput,
  UpdateRequirementInput,
  UpsertMappingInput,
  FlagAssetInput,
} from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// =============================================================================
// Regulatory Frameworks
// =============================================================================

/**
 * List regulatory frameworks for a tenant with optional search and pagination.
 * Includes requirement count per framework via a separate count query.
 */
export async function listFrameworks(
  tenantId: string,
  params: ComplianceFilterParams,
): Promise<{ frameworks: unknown[]; total: number }> {
  const d = db();
  const { page, limit, order, q } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(regulatoryFrameworks.tenant_id, tenantId)];

  if (q) {
    conditions.push(
      or(
        like(regulatoryFrameworks.name, `%${q}%`),
        like(regulatoryFrameworks.description, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(regulatoryFrameworks)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select({
      id: regulatoryFrameworks.id,
      tenant_id: regulatoryFrameworks.tenant_id,
      name: regulatoryFrameworks.name,
      version: regulatoryFrameworks.version,
      description: regulatoryFrameworks.description,
      effective_date: regulatoryFrameworks.effective_date,
      created_at: regulatoryFrameworks.created_at,
    })
    .from(regulatoryFrameworks)
    .where(and(...conditions))
    .orderBy(orderFn(regulatoryFrameworks.created_at))
    .limit(limit)
    .offset(offset);

  // Fetch requirement counts for each framework
  const shaped = await Promise.all(
    rows.map(async (row) => {
      const [reqCount] = await d
        .select({ count: count() })
        .from(regulatoryRequirements)
        .where(eq(regulatoryRequirements.framework_id, row.id));

      return {
        ...row,
        requirement_count: reqCount?.count ?? 0,
      };
    }),
  );

  return { frameworks: shaped, total };
}

/**
 * Get a single regulatory framework with its requirements list.
 */
export async function getFramework(
  tenantId: string,
  frameworkId: string,
): Promise<unknown> {
  const d = db();

  const [framework] = await d
    .select()
    .from(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    )
    .limit(1);

  if (!framework) {
    throw new NotFoundError('Regulatory framework not found');
  }

  const requirements = await d
    .select()
    .from(regulatoryRequirements)
    .where(eq(regulatoryRequirements.framework_id, frameworkId))
    .orderBy(asc(regulatoryRequirements.code));

  return {
    ...framework,
    requirements,
  };
}

/**
 * Create a new regulatory framework.
 * Enforces Community Edition limit of maxFrameworks per tenant.
 */
export async function createFramework(
  tenantId: string,
  data: CreateRegulatoryFrameworkInput,
  _userId: string,
): Promise<unknown> {
  const d = db();

  // License-aware limit check
  const { validateLicenseKey } = await import('../../middleware/license.js');
  const { getTenantLicenseKey } = await import('../tenants/tenants.service.js');
  const licenseKey = await getTenantLicenseKey(tenantId);
  const licensePayload = validateLicenseKey(licenseKey);
  const maxFrameworks = licensePayload?.limits?.maxFrameworks ?? COMMUNITY_LIMITS.maxFrameworks;

  // -1 = unlimited (Enterprise)
  if (maxFrameworks !== -1) {
    const [countResult] = await d
      .select({ count: count() })
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.tenant_id, tenantId));

    const currentCount = countResult?.count ?? 0;
    if (currentCount >= maxFrameworks) {
      throw new LicenseLimitError(
        `Maximum frameworks reached (limit: ${maxFrameworks}). Upgrade to Enterprise for unlimited frameworks.`,
      );
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  await d.insert(regulatoryFrameworks).values({
    id,
    tenant_id: tenantId,
    name: data.name,
    version: data.version ?? null,
    description: data.description ?? null,
    effective_date: data.effective_date ?? null,
    created_at: now,
  });

  return getFramework(tenantId, id);
}

/**
 * Update an existing regulatory framework.
 */
export async function updateFramework(
  tenantId: string,
  frameworkId: string,
  data: UpdateRegulatoryFrameworkInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select({ id: regulatoryFrameworks.id })
    .from(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Regulatory framework not found');
  }

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.version !== undefined) updateData.version = data.version;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.effective_date !== undefined) updateData.effective_date = data.effective_date;

  if (Object.keys(updateData).length > 0) {
    await d
      .update(regulatoryFrameworks)
      .set(updateData)
      .where(
        and(
          eq(regulatoryFrameworks.tenant_id, tenantId),
          eq(regulatoryFrameworks.id, frameworkId),
        ),
      );
  }

  return getFramework(tenantId, frameworkId);
}

/**
 * Delete a regulatory framework.
 * Fails if the framework has requirements attached.
 */
export async function deleteFramework(
  tenantId: string,
  frameworkId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ id: regulatoryFrameworks.id })
    .from(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Regulatory framework not found');
  }

  // Block deletion if requirements exist
  const [reqCount] = await d
    .select({ count: count() })
    .from(regulatoryRequirements)
    .where(eq(regulatoryRequirements.framework_id, frameworkId));

  if ((reqCount?.count ?? 0) > 0) {
    throw new ConflictError(
      'Cannot delete framework — it has requirements attached. Remove all requirements first.',
    );
  }

  await d
    .delete(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    );
}

// =============================================================================
// Requirements
// =============================================================================

/**
 * List requirements for a framework with optional search and pagination.
 */
export async function listRequirements(
  tenantId: string,
  frameworkId: string,
  params: ComplianceFilterParams & { category?: string },
): Promise<{ requirements: unknown[]; total: number }> {
  const d = db();
  const { page, limit, order, q } = params;
  const offset = (page - 1) * limit;

  // Verify framework belongs to tenant
  const [framework] = await d
    .select({ id: regulatoryFrameworks.id })
    .from(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    )
    .limit(1);

  if (!framework) {
    throw new NotFoundError('Regulatory framework not found');
  }

  const conditions = [eq(regulatoryRequirements.framework_id, frameworkId)];

  if (q) {
    conditions.push(
      or(
        like(regulatoryRequirements.code, `%${q}%`),
        like(regulatoryRequirements.title, `%${q}%`),
      )!,
    );
  }

  if (params.category) {
    conditions.push(eq(regulatoryRequirements.category, params.category));
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(regulatoryRequirements)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select()
    .from(regulatoryRequirements)
    .where(and(...conditions))
    .orderBy(orderFn(regulatoryRequirements.code))
    .limit(limit)
    .offset(offset);

  return { requirements: rows, total };
}

/**
 * Get a single requirement by ID.
 */
export async function getRequirement(
  tenantId: string,
  requirementId: string,
): Promise<unknown> {
  const d = db();

  // Join via framework to enforce tenant scoping
  const rows = await d
    .select({
      id: regulatoryRequirements.id,
      framework_id: regulatoryRequirements.framework_id,
      code: regulatoryRequirements.code,
      title: regulatoryRequirements.title,
      description: regulatoryRequirements.description,
      category: regulatoryRequirements.category,
      created_at: regulatoryRequirements.created_at,
      framework_name: regulatoryFrameworks.name,
    })
    .from(regulatoryRequirements)
    .innerJoin(
      regulatoryFrameworks,
      and(
        eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id),
        eq(regulatoryFrameworks.tenant_id, tenantId),
      ),
    )
    .where(eq(regulatoryRequirements.id, requirementId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Requirement not found');
  }

  return row;
}

/**
 * Create a new requirement under a framework.
 */
export async function createRequirement(
  tenantId: string,
  frameworkId: string,
  data: CreateRequirementInput,
): Promise<unknown> {
  const d = db();

  // Verify framework belongs to tenant
  const [framework] = await d
    .select({ id: regulatoryFrameworks.id })
    .from(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    )
    .limit(1);

  if (!framework) {
    throw new NotFoundError('Regulatory framework not found');
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  await d.insert(regulatoryRequirements).values({
    id,
    framework_id: frameworkId,
    code: data.code,
    title: data.title,
    description: data.description ?? null,
    category: data.category ?? null,
    created_at: now,
  });

  return getRequirement(tenantId, id);
}

/**
 * Update an existing requirement.
 */
export async function updateRequirement(
  tenantId: string,
  requirementId: string,
  data: UpdateRequirementInput,
): Promise<unknown> {
  const d = db();

  // Verify existence and tenant scoping via framework join
  const rows = await d
    .select({ id: regulatoryRequirements.id })
    .from(regulatoryRequirements)
    .innerJoin(
      regulatoryFrameworks,
      and(
        eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id),
        eq(regulatoryFrameworks.tenant_id, tenantId),
      ),
    )
    .where(eq(regulatoryRequirements.id, requirementId))
    .limit(1);

  if (!rows[0]) {
    throw new NotFoundError('Requirement not found');
  }

  const updateData: Record<string, unknown> = {};

  if (data.code !== undefined) updateData.code = data.code;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;

  if (Object.keys(updateData).length > 0) {
    await d
      .update(regulatoryRequirements)
      .set(updateData)
      .where(eq(regulatoryRequirements.id, requirementId));
  }

  return getRequirement(tenantId, requirementId);
}

/**
 * Delete a requirement.
 * Fails if the requirement has service mappings.
 */
export async function deleteRequirement(
  tenantId: string,
  requirementId: string,
): Promise<void> {
  const d = db();

  // Verify existence and tenant scoping via framework join
  const rows = await d
    .select({ id: regulatoryRequirements.id })
    .from(regulatoryRequirements)
    .innerJoin(
      regulatoryFrameworks,
      and(
        eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id),
        eq(regulatoryFrameworks.tenant_id, tenantId),
      ),
    )
    .where(eq(regulatoryRequirements.id, requirementId))
    .limit(1);

  if (!rows[0]) {
    throw new NotFoundError('Requirement not found');
  }

  // Block deletion if mappings exist
  const [mappingCount] = await d
    .select({ count: count() })
    .from(requirementServiceMappings)
    .where(eq(requirementServiceMappings.requirement_id, requirementId));

  if ((mappingCount?.count ?? 0) > 0) {
    throw new ConflictError(
      'Cannot delete requirement — it has service mappings. Remove all mappings first.',
    );
  }

  await d
    .delete(regulatoryRequirements)
    .where(eq(regulatoryRequirements.id, requirementId));
}

// =============================================================================
// Mappings (Requirement <-> Service Description)
// =============================================================================

/**
 * Upsert a mapping between a requirement and a service description.
 * Uses onConflictDoUpdate to handle both INSERT and UPDATE cases.
 */
export async function upsertMapping(
  tenantId: string,
  requirementId: string,
  serviceDescId: string,
  data: UpsertMappingInput,
  userId: string,
): Promise<unknown> {
  const d = db();

  // Verify requirement belongs to tenant
  const reqRows = await d
    .select({ id: regulatoryRequirements.id })
    .from(regulatoryRequirements)
    .innerJoin(
      regulatoryFrameworks,
      and(
        eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id),
        eq(regulatoryFrameworks.tenant_id, tenantId),
      ),
    )
    .where(eq(regulatoryRequirements.id, requirementId))
    .limit(1);

  if (!reqRows[0]) {
    throw new NotFoundError('Requirement not found');
  }

  // Verify service description belongs to tenant
  const [svc] = await d
    .select({ id: serviceDescriptions.id, title: serviceDescriptions.title })
    .from(serviceDescriptions)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.id, serviceDescId),
      ),
    )
    .limit(1);

  if (!svc) {
    throw new NotFoundError('Service description not found');
  }

  const now = new Date().toISOString();

  await d
    .insert(requirementServiceMappings)
    .values({
      requirement_id: requirementId,
      service_desc_id: serviceDescId,
      tenant_id: tenantId,
      coverage_level: data.coverage_level,
      evidence_notes: data.evidence_notes ?? null,
      reviewed_at: now,
      reviewed_by: userId,
    })
    .onConflictDoUpdate({
      target: [
        requirementServiceMappings.requirement_id,
        requirementServiceMappings.service_desc_id,
      ],
      set: {
        coverage_level: data.coverage_level,
        evidence_notes: data.evidence_notes ?? null,
        reviewed_at: now,
        reviewed_by: userId,
      },
    });

  const [mapping] = await d
    .select()
    .from(requirementServiceMappings)
    .where(
      and(
        eq(requirementServiceMappings.requirement_id, requirementId),
        eq(requirementServiceMappings.service_desc_id, serviceDescId),
      ),
    )
    .limit(1);

  return mapping;
}

/**
 * Delete a mapping between a requirement and a service description.
 */
export async function deleteMapping(
  tenantId: string,
  requirementId: string,
  serviceDescId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ requirement_id: requirementServiceMappings.requirement_id })
    .from(requirementServiceMappings)
    .where(
      and(
        eq(requirementServiceMappings.tenant_id, tenantId),
        eq(requirementServiceMappings.requirement_id, requirementId),
        eq(requirementServiceMappings.service_desc_id, serviceDescId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Mapping not found');
  }

  await d
    .delete(requirementServiceMappings)
    .where(
      and(
        eq(requirementServiceMappings.tenant_id, tenantId),
        eq(requirementServiceMappings.requirement_id, requirementId),
        eq(requirementServiceMappings.service_desc_id, serviceDescId),
      ),
    );
}

/**
 * Get the compliance matrix for a framework.
 * Returns each requirement with all its service mappings.
 */
export async function getMatrixForFramework(
  tenantId: string,
  frameworkId: string,
): Promise<unknown> {
  const d = db();

  // Verify framework belongs to tenant
  const [framework] = await d
    .select()
    .from(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    )
    .limit(1);

  if (!framework) {
    throw new NotFoundError('Regulatory framework not found');
  }

  // Fetch all requirements for this framework
  const requirements = await d
    .select()
    .from(regulatoryRequirements)
    .where(eq(regulatoryRequirements.framework_id, frameworkId))
    .orderBy(asc(regulatoryRequirements.code));

  // For each requirement, fetch its mappings with service description titles
  const requirementsWithMappings = await Promise.all(
    requirements.map(async (req) => {
      const mappingRows = await d
        .select({
          service_desc_id: requirementServiceMappings.service_desc_id,
          coverage_level: requirementServiceMappings.coverage_level,
          evidence_notes: requirementServiceMappings.evidence_notes,
          reviewed_at: requirementServiceMappings.reviewed_at,
          reviewed_by: requirementServiceMappings.reviewed_by,
          service_title: serviceDescriptions.title,
          service_code: serviceDescriptions.code,
        })
        .from(requirementServiceMappings)
        .leftJoin(
          serviceDescriptions,
          eq(requirementServiceMappings.service_desc_id, serviceDescriptions.id),
        )
        .where(eq(requirementServiceMappings.requirement_id, req.id));

      return {
        ...req,
        mappings: mappingRows.map((m) => ({
          service_desc_id: m.service_desc_id,
          service_title: m.service_title ?? '',
          service_code: m.service_code ?? '',
          coverage_level: m.coverage_level,
          evidence_notes: m.evidence_notes,
          reviewed_at: m.reviewed_at,
          reviewed_by: m.reviewed_by,
        })),
      };
    }),
  );

  return {
    framework,
    requirements: requirementsWithMappings,
  };
}

// =============================================================================
// Asset Regulatory Flags
// =============================================================================

/**
 * Flag an asset as subject to a regulatory framework.
 * Uses INSERT OR IGNORE semantics (silently skips if already flagged).
 */
export async function flagAsset(
  tenantId: string,
  frameworkId: string,
  data: FlagAssetInput,
  userId: string,
): Promise<unknown> {
  const d = db();

  // Verify framework belongs to tenant
  const [framework] = await d
    .select({ id: regulatoryFrameworks.id })
    .from(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    )
    .limit(1);

  if (!framework) {
    throw new NotFoundError('Regulatory framework not found');
  }

  // Verify asset belongs to tenant
  const [asset] = await d
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.tenant_id, tenantId),
        eq(assets.id, data.asset_id),
      ),
    )
    .limit(1);

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const now = new Date().toISOString();

  await d
    .insert(assetRegulatoryFlags)
    .values({
      asset_id: data.asset_id,
      framework_id: frameworkId,
      tenant_id: tenantId,
      reason: data.reason ?? null,
      flagged_at: now,
      flagged_by: userId,
    })
    .onConflictDoNothing();

  const [flag] = await d
    .select()
    .from(assetRegulatoryFlags)
    .where(
      and(
        eq(assetRegulatoryFlags.asset_id, data.asset_id),
        eq(assetRegulatoryFlags.framework_id, frameworkId),
      ),
    )
    .limit(1);

  return flag;
}

/**
 * Remove a regulatory flag from an asset.
 */
export async function unflagAsset(
  tenantId: string,
  frameworkId: string,
  assetId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ asset_id: assetRegulatoryFlags.asset_id })
    .from(assetRegulatoryFlags)
    .where(
      and(
        eq(assetRegulatoryFlags.tenant_id, tenantId),
        eq(assetRegulatoryFlags.framework_id, frameworkId),
        eq(assetRegulatoryFlags.asset_id, assetId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Asset flag not found');
  }

  await d
    .delete(assetRegulatoryFlags)
    .where(
      and(
        eq(assetRegulatoryFlags.tenant_id, tenantId),
        eq(assetRegulatoryFlags.framework_id, frameworkId),
        eq(assetRegulatoryFlags.asset_id, assetId),
      ),
    );
}

/**
 * Get all assets flagged for a specific regulatory framework.
 */
export async function getFrameworkAssets(
  tenantId: string,
  frameworkId: string,
): Promise<unknown[]> {
  const d = db();

  // Verify framework belongs to tenant
  const [framework] = await d
    .select({ id: regulatoryFrameworks.id })
    .from(regulatoryFrameworks)
    .where(
      and(
        eq(regulatoryFrameworks.tenant_id, tenantId),
        eq(regulatoryFrameworks.id, frameworkId),
      ),
    )
    .limit(1);

  if (!framework) {
    throw new NotFoundError('Regulatory framework not found');
  }

  const rows = await d
    .select({
      asset_id: assetRegulatoryFlags.asset_id,
      framework_id: assetRegulatoryFlags.framework_id,
      tenant_id: assetRegulatoryFlags.tenant_id,
      reason: assetRegulatoryFlags.reason,
      flagged_at: assetRegulatoryFlags.flagged_at,
      flagged_by: assetRegulatoryFlags.flagged_by,
      asset_name: assets.name,
      asset_display_name: assets.display_name,
      asset_type: assets.asset_type,
      asset_status: assets.status,
    })
    .from(assetRegulatoryFlags)
    .innerJoin(
      assets,
      and(
        eq(assetRegulatoryFlags.asset_id, assets.id),
        eq(assets.tenant_id, tenantId),
      ),
    )
    .where(
      and(
        eq(assetRegulatoryFlags.tenant_id, tenantId),
        eq(assetRegulatoryFlags.framework_id, frameworkId),
      ),
    )
    .orderBy(desc(assetRegulatoryFlags.flagged_at));

  return rows.map((row) => ({
    asset_id: row.asset_id,
    framework_id: row.framework_id,
    tenant_id: row.tenant_id,
    reason: row.reason,
    flagged_at: row.flagged_at,
    flagged_by: row.flagged_by,
    asset: {
      id: row.asset_id,
      name: row.asset_name,
      display_name: row.asset_display_name,
      asset_type: row.asset_type,
      status: row.asset_status,
    },
  }));
}
