import { eq, and, count, like, or, asc, desc, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  regulatoryFrameworks,
  regulatoryRequirements,
  requirementServiceMappings,
  assetRegulatoryFlags,
  serviceDescriptions,
  assets,
  frameworkRequirementMappings,
  complianceControls,
  complianceAudits,
  auditFindings,
  complianceEvidence,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError, LicenseLimitError, ValidationError } from '../../lib/errors.js';
import { COMMUNITY_LIMITS } from '@opsweave/shared';
import type {
  ComplianceFilterParams,
  CreateRegulatoryFrameworkInput,
  UpdateRegulatoryFrameworkInput,
  CreateRequirementInput,
  UpdateRequirementInput,
  UpsertMappingInput,
  FlagAssetInput,
  CreateCrossMappingInput,
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

// =============================================================================
// Cross-Framework Requirement Mappings (Evo-4D: REQ-4.1)
// =============================================================================

/**
 * List cross-framework requirement mappings for a tenant.
 * Optionally filter by a specific requirement ID.
 */
export async function listCrossMappings(
  tenantId: string,
  requirementId?: string,
): Promise<unknown[]> {
  const d = db();

  const conditions = [eq(frameworkRequirementMappings.tenant_id, tenantId)];
  if (requirementId) {
    conditions.push(
      or(
        eq(frameworkRequirementMappings.source_requirement_id, requirementId),
        eq(frameworkRequirementMappings.target_requirement_id, requirementId),
      )!,
    );
  }

  const rows = await d
    .select({
      id: frameworkRequirementMappings.id,
      tenant_id: frameworkRequirementMappings.tenant_id,
      source_requirement_id: frameworkRequirementMappings.source_requirement_id,
      target_requirement_id: frameworkRequirementMappings.target_requirement_id,
      mapping_type: frameworkRequirementMappings.mapping_type,
      notes: frameworkRequirementMappings.notes,
      created_by: frameworkRequirementMappings.created_by,
      created_at: frameworkRequirementMappings.created_at,
    })
    .from(frameworkRequirementMappings)
    .where(and(...conditions))
    .orderBy(desc(frameworkRequirementMappings.created_at));

  // Enrich with requirement details
  return Promise.all(
    rows.map(async (row) => {
      const [source] = await d
        .select({
          id: regulatoryRequirements.id,
          code: regulatoryRequirements.code,
          title: regulatoryRequirements.title,
          framework_id: regulatoryRequirements.framework_id,
          framework_name: regulatoryFrameworks.name,
        })
        .from(regulatoryRequirements)
        .innerJoin(regulatoryFrameworks, eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id))
        .where(eq(regulatoryRequirements.id, row.source_requirement_id))
        .limit(1);

      const [target] = await d
        .select({
          id: regulatoryRequirements.id,
          code: regulatoryRequirements.code,
          title: regulatoryRequirements.title,
          framework_id: regulatoryRequirements.framework_id,
          framework_name: regulatoryFrameworks.name,
        })
        .from(regulatoryRequirements)
        .innerJoin(regulatoryFrameworks, eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id))
        .where(eq(regulatoryRequirements.id, row.target_requirement_id))
        .limit(1);

      return {
        ...row,
        source_requirement: source ?? null,
        target_requirement: target ?? null,
      };
    }),
  );
}

/**
 * Create a cross-framework requirement mapping.
 * Validates that both requirements exist, belong to this tenant's frameworks,
 * and belong to DIFFERENT frameworks.
 */
export async function createCrossMapping(
  tenantId: string,
  data: CreateCrossMappingInput,
  userId: string,
): Promise<unknown> {
  const d = db();

  // Fetch both requirements with their framework info (tenant-scoped)
  const [sourceReq] = await d
    .select({
      id: regulatoryRequirements.id,
      framework_id: regulatoryRequirements.framework_id,
    })
    .from(regulatoryRequirements)
    .innerJoin(
      regulatoryFrameworks,
      and(
        eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id),
        eq(regulatoryFrameworks.tenant_id, tenantId),
      ),
    )
    .where(eq(regulatoryRequirements.id, data.source_requirement_id))
    .limit(1);

  if (!sourceReq) {
    throw new NotFoundError('Source requirement not found');
  }

  const [targetReq] = await d
    .select({
      id: regulatoryRequirements.id,
      framework_id: regulatoryRequirements.framework_id,
    })
    .from(regulatoryRequirements)
    .innerJoin(
      regulatoryFrameworks,
      and(
        eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id),
        eq(regulatoryFrameworks.tenant_id, tenantId),
      ),
    )
    .where(eq(regulatoryRequirements.id, data.target_requirement_id))
    .limit(1);

  if (!targetReq) {
    throw new NotFoundError('Target requirement not found');
  }

  if (sourceReq.framework_id === targetReq.framework_id) {
    throw new ValidationError(
      'Cross-mappings must be between requirements from different frameworks',
    );
  }

  if (data.source_requirement_id === data.target_requirement_id) {
    throw new ValidationError('Cannot map a requirement to itself');
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  await d
    .insert(frameworkRequirementMappings)
    .values({
      id,
      tenant_id: tenantId,
      source_requirement_id: data.source_requirement_id,
      target_requirement_id: data.target_requirement_id,
      mapping_type: data.mapping_type,
      notes: data.notes ?? null,
      created_by: userId,
      created_at: now,
    })
    .onConflictDoNothing();

  // Return the created mapping with enriched data
  const mappings = await listCrossMappings(tenantId, data.source_requirement_id);
  return (mappings as Array<Record<string, unknown>>).find((m) => m.id === id) ?? mappings[0];
}

/**
 * Delete a cross-framework requirement mapping.
 */
export async function deleteCrossMapping(
  tenantId: string,
  mappingId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ id: frameworkRequirementMappings.id })
    .from(frameworkRequirementMappings)
    .where(
      and(
        eq(frameworkRequirementMappings.tenant_id, tenantId),
        eq(frameworkRequirementMappings.id, mappingId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Cross-mapping not found');
  }

  await d
    .delete(frameworkRequirementMappings)
    .where(
      and(
        eq(frameworkRequirementMappings.tenant_id, tenantId),
        eq(frameworkRequirementMappings.id, mappingId),
      ),
    );
}

/**
 * Export all cross-framework mappings as CSV for a tenant.
 * Returns a CSV string with headers:
 * source_framework,source_requirement_code,target_framework,target_requirement_code,mapping_type,notes
 */
export async function exportCrossMappingsCsv(tenantId: string): Promise<string> {
  const mappings = await listCrossMappings(tenantId);
  const header = 'source_framework,source_requirement_code,target_framework,target_requirement_code,mapping_type,notes';
  const rows = (mappings as Array<Record<string, unknown>>).map((m) => {
    const src = m.source_requirement as { framework_name?: string; code?: string } | null;
    const tgt = m.target_requirement as { framework_name?: string; code?: string } | null;
    return [
      escapeCsvField(src?.framework_name ?? ''),
      escapeCsvField(src?.code ?? ''),
      escapeCsvField(tgt?.framework_name ?? ''),
      escapeCsvField(tgt?.code ?? ''),
      escapeCsvField(String(m.mapping_type ?? '')),
      escapeCsvField(String(m.notes ?? '')),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

/**
 * Import cross-framework mappings from CSV for a tenant.
 * Returns counts of imported, skipped (duplicates), and error messages.
 */
export async function importCrossMappingsCsv(
  tenantId: string,
  csvText: string,
  userId: string,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const d = db();
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { imported: 0, skipped: 0, errors: ['CSV file is empty or has no data rows'] };
  }

  // Skip header row
  const dataLines = lines.slice(1);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Pre-fetch all frameworks and requirements for this tenant for lookup
  const allFrameworks = await d
    .select({ id: regulatoryFrameworks.id, name: regulatoryFrameworks.name })
    .from(regulatoryFrameworks)
    .where(eq(regulatoryFrameworks.tenant_id, tenantId));

  const allRequirements = await d
    .select({
      id: regulatoryRequirements.id,
      code: regulatoryRequirements.code,
      framework_id: regulatoryRequirements.framework_id,
    })
    .from(regulatoryRequirements)
    .innerJoin(
      regulatoryFrameworks,
      and(
        eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id),
        eq(regulatoryFrameworks.tenant_id, tenantId),
      ),
    );

  const validMappingTypes = ['equal', 'partial', 'related'];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2; // 1-based, accounting for header
    const fields = parseCsvRow(dataLines[i]!);
    if (fields.length < 5) {
      errors.push(`Row ${rowNum}: insufficient columns (expected at least 5, got ${fields.length})`);
      continue;
    }

    const [srcFrameworkName, srcReqCode, tgtFrameworkName, tgtReqCode, mappingType, notes] = fields;

    // Validate mapping_type
    if (!validMappingTypes.includes(mappingType!)) {
      errors.push(`Row ${rowNum}: invalid mapping_type "${mappingType}" (must be equal, partial, or related)`);
      continue;
    }

    // Look up source framework + requirement
    const srcFramework = allFrameworks.find((f) => f.name === srcFrameworkName);
    if (!srcFramework) {
      errors.push(`Row ${rowNum}: source framework "${srcFrameworkName}" not found`);
      continue;
    }

    const srcReq = allRequirements.find(
      (r) => r.framework_id === srcFramework.id && r.code === srcReqCode,
    );
    if (!srcReq) {
      errors.push(`Row ${rowNum}: source requirement "${srcReqCode}" not found in "${srcFrameworkName}"`);
      continue;
    }

    // Look up target framework + requirement
    const tgtFramework = allFrameworks.find((f) => f.name === tgtFrameworkName);
    if (!tgtFramework) {
      errors.push(`Row ${rowNum}: target framework "${tgtFrameworkName}" not found`);
      continue;
    }

    const tgtReq = allRequirements.find(
      (r) => r.framework_id === tgtFramework.id && r.code === tgtReqCode,
    );
    if (!tgtReq) {
      errors.push(`Row ${rowNum}: target requirement "${tgtReqCode}" not found in "${tgtFrameworkName}"`);
      continue;
    }

    if (srcFramework.id === tgtFramework.id) {
      errors.push(`Row ${rowNum}: source and target frameworks must be different`);
      continue;
    }

    // Check for existing duplicate
    const [existing] = await d
      .select({ id: frameworkRequirementMappings.id })
      .from(frameworkRequirementMappings)
      .where(
        and(
          eq(frameworkRequirementMappings.tenant_id, tenantId),
          eq(frameworkRequirementMappings.source_requirement_id, srcReq.id),
          eq(frameworkRequirementMappings.target_requirement_id, tgtReq.id),
        ),
      )
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await d
      .insert(frameworkRequirementMappings)
      .values({
        id,
        tenant_id: tenantId,
        source_requirement_id: srcReq.id,
        target_requirement_id: tgtReq.id,
        mapping_type: mappingType as string,
        notes: notes?.trim() || null,
        created_by: userId,
        created_at: now,
      })
      .onConflictDoNothing();

    imported++;
  }

  return { imported, skipped, errors };
}

// ---------------------------------------------------------------------------
// CSV Helpers
// ---------------------------------------------------------------------------

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvRow(row: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < row.length) {
    const ch = row[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Get all cross-framework mappings where source or target is in the given framework.
 */
export async function getCrossMappingsForFramework(
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

  // Get all requirements for this framework
  const frameworkReqs = await d
    .select({ id: regulatoryRequirements.id })
    .from(regulatoryRequirements)
    .where(eq(regulatoryRequirements.framework_id, frameworkId));

  if (frameworkReqs.length === 0) {
    return [];
  }

  const reqIds = frameworkReqs.map((r) => r.id);

  // Get all mappings where source OR target is in this framework
  const allMappings = await d
    .select()
    .from(frameworkRequirementMappings)
    .where(eq(frameworkRequirementMappings.tenant_id, tenantId));

  const filtered = allMappings.filter(
    (m) =>
      reqIds.includes(m.source_requirement_id) ||
      reqIds.includes(m.target_requirement_id),
  );

  // Enrich with requirement details
  return Promise.all(
    filtered.map(async (row) => {
      const [source] = await d
        .select({
          id: regulatoryRequirements.id,
          code: regulatoryRequirements.code,
          title: regulatoryRequirements.title,
          framework_id: regulatoryRequirements.framework_id,
          framework_name: regulatoryFrameworks.name,
        })
        .from(regulatoryRequirements)
        .innerJoin(regulatoryFrameworks, eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id))
        .where(eq(regulatoryRequirements.id, row.source_requirement_id))
        .limit(1);

      const [target] = await d
        .select({
          id: regulatoryRequirements.id,
          code: regulatoryRequirements.code,
          title: regulatoryRequirements.title,
          framework_id: regulatoryRequirements.framework_id,
          framework_name: regulatoryFrameworks.name,
        })
        .from(regulatoryRequirements)
        .innerJoin(regulatoryFrameworks, eq(regulatoryRequirements.framework_id, regulatoryFrameworks.id))
        .where(eq(regulatoryRequirements.id, row.target_requirement_id))
        .limit(1);

      return {
        ...row,
        source_requirement: source ?? null,
        target_requirement: target ?? null,
      };
    }),
  );
}

// =============================================================================
// Compliance Dashboard Stats (Evo-4D: REQ-4.4)
// =============================================================================

/**
 * Get comprehensive compliance dashboard statistics for a tenant.
 */
export async function getDashboardStats(tenantId: string): Promise<unknown> {
  const d = db();

  // ─── Per-framework coverage statistics ───
  const frameworks = await d
    .select({
      id: regulatoryFrameworks.id,
      name: regulatoryFrameworks.name,
      version: regulatoryFrameworks.version,
    })
    .from(regulatoryFrameworks)
    .where(eq(regulatoryFrameworks.tenant_id, tenantId))
    .orderBy(asc(regulatoryFrameworks.name));

  const frameworkStats = await Promise.all(
    frameworks.map(async (fw) => {
      // Total requirements
      const [totalResult] = await d
        .select({ count: count() })
        .from(regulatoryRequirements)
        .where(eq(regulatoryRequirements.framework_id, fw.id));
      const total = totalResult?.count ?? 0;

      // Requirements with at least one service mapping
      const reqs = await d
        .select({ id: regulatoryRequirements.id })
        .from(regulatoryRequirements)
        .where(eq(regulatoryRequirements.framework_id, fw.id));

      let mappedCount = 0;
      for (const req of reqs) {
        const [mc] = await d
          .select({ count: count() })
          .from(requirementServiceMappings)
          .where(
            and(
              eq(requirementServiceMappings.tenant_id, tenantId),
              eq(requirementServiceMappings.requirement_id, req.id),
            ),
          );
        if ((mc?.count ?? 0) > 0) {
          mappedCount++;
        }
      }

      return {
        framework_id: fw.id,
        framework_name: fw.name,
        framework_version: fw.version,
        total_requirements: total,
        mapped_count: mappedCount,
        unmapped_count: total - mappedCount,
        coverage_pct: total > 0 ? Math.round((mappedCount / total) * 100) : 0,
      };
    }),
  );

  // ─── Control status breakdown ───
  const controlStatuses = await d
    .select({
      status: complianceControls.status,
      count: count(),
    })
    .from(complianceControls)
    .where(eq(complianceControls.tenant_id, tenantId))
    .groupBy(complianceControls.status);

  const controlStatusMap: Record<string, number> = {
    planned: 0,
    implemented: 0,
    verified: 0,
    not_applicable: 0,
  };
  for (const row of controlStatuses) {
    controlStatusMap[row.status] = row.count;
  }

  // ─── Stale controls (not updated in >12 months) ───
  const twelveMonthsAgo = new Date(Date.now() - 365 * 86400000).toISOString();
  const [staleResult] = await d
    .select({ count: count() })
    .from(complianceControls)
    .where(
      and(
        eq(complianceControls.tenant_id, tenantId),
        lt(complianceControls.updated_at, twelveMonthsAgo),
      ),
    );
  const staleControlCount = staleResult?.count ?? 0;

  // ─── Open findings by severity ───
  const findingsBySeverity = await d
    .select({
      severity: auditFindings.severity,
      count: count(),
    })
    .from(auditFindings)
    .where(
      and(
        eq(auditFindings.tenant_id, tenantId),
        eq(auditFindings.status, 'open'),
      ),
    )
    .groupBy(auditFindings.severity);

  const openFindingsMap: Record<string, number> = {
    critical: 0,
    major: 0,
    minor: 0,
    observation: 0,
  };
  for (const row of findingsBySeverity) {
    openFindingsMap[row.severity] = row.count;
  }

  // ─── Audit status summary ───
  const auditStatuses = await d
    .select({
      status: complianceAudits.status,
      count: count(),
    })
    .from(complianceAudits)
    .where(eq(complianceAudits.tenant_id, tenantId))
    .groupBy(complianceAudits.status);

  const auditStatusMap: Record<string, number> = {
    planned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of auditStatuses) {
    auditStatusMap[row.status] = row.count;
  }

  // ─── Evidence count ───
  const [evidenceResult] = await d
    .select({ count: count() })
    .from(complianceEvidence)
    .where(eq(complianceEvidence.tenant_id, tenantId));

  // ─── Cross-mapping count ───
  const [crossMappingResult] = await d
    .select({ count: count() })
    .from(frameworkRequirementMappings)
    .where(eq(frameworkRequirementMappings.tenant_id, tenantId));

  // Map to frontend ComplianceDashboardData interface
  const coverage = frameworkStats.map((fw) => ({
    framework_id: fw.framework_id,
    framework_name: fw.framework_name,
    framework_version: fw.framework_version,
    total_requirements: fw.total_requirements,
    mapped_requirements: fw.mapped_count,
    coverage_pct: fw.coverage_pct,
  }));

  // Fetch recent audits for dashboard display
  const recentAudits = await d
    .select({
      id: complianceAudits.id,
      name: complianceAudits.name,
      audit_type: complianceAudits.audit_type,
      status: complianceAudits.status,
      auditor: complianceAudits.auditor,
      start_date: complianceAudits.start_date,
      end_date: complianceAudits.end_date,
    })
    .from(complianceAudits)
    .where(eq(complianceAudits.tenant_id, tenantId))
    .orderBy(desc(complianceAudits.created_at))
    .limit(5);

  return {
    coverage,
    control_statuses: controlStatusMap,
    open_findings: openFindingsMap,
    recent_audits: recentAudits,
    // Additional stats for extended dashboard
    frameworks: frameworkStats,
    controls: {
      by_status: controlStatusMap,
      total: Object.values(controlStatusMap).reduce((a, b) => a + b, 0),
      stale_count: staleControlCount,
    },
    findings: {
      open_by_severity: openFindingsMap,
      total_open: Object.values(openFindingsMap).reduce((a, b) => a + b, 0),
    },
    audits: {
      by_status: auditStatusMap,
      total: Object.values(auditStatusMap).reduce((a, b) => a + b, 0),
    },
    evidence_count: evidenceResult?.count ?? 0,
    cross_mapping_count: crossMappingResult?.count ?? 0,
  };
}
