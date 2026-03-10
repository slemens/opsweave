import { eq, and, count, like, or, asc, desc, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  serviceDescriptions,
  horizontalCatalog,
  horizontalCatalogItems,
  verticalCatalogs,
  verticalCatalogOverrides,
  customers,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type {
  CreateServiceDescriptionInput,
  UpdateServiceDescriptionInput,
  CreateHorizontalCatalogInput,
  UpdateHorizontalCatalogInput,
  ServiceDescriptionFilterParams,
  CatalogFilterParams,
} from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Helpers ──────────────────────────────────────────────

function parseComplianceTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

function shapeServiceDescription(row: {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  description: string;
  scope_included: string | null;
  scope_excluded: string | null;
  compliance_tags: unknown;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}): unknown {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    code: row.code,
    title: row.title,
    description: row.description,
    scope_included: row.scope_included,
    scope_excluded: row.scope_excluded,
    compliance_tags: parseComplianceTags(row.compliance_tags),
    version: row.version,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── Service Descriptions ─────────────────────────────────

/**
 * List service descriptions with filtering and pagination.
 */
export async function listServiceDescriptions(
  tenantId: string,
  params: ServiceDescriptionFilterParams,
): Promise<{ serviceDescriptions: unknown[]; total: number }> {
  const d = db();
  const { page, limit, sort, order, q, status } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(serviceDescriptions.tenant_id, tenantId)];

  if (status) conditions.push(eq(serviceDescriptions.status, status));

  if (q) {
    conditions.push(
      or(
        like(serviceDescriptions.code, `%${q}%`),
        like(serviceDescriptions.title, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(serviceDescriptions)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn =
    sort === 'code' ? serviceDescriptions.code
    : sort === 'title' ? serviceDescriptions.title
    : sort === 'status' ? serviceDescriptions.status
    : sort === 'version' ? serviceDescriptions.version
    : sort === 'updated_at' ? serviceDescriptions.updated_at
    : serviceDescriptions.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select({
      id: serviceDescriptions.id,
      tenant_id: serviceDescriptions.tenant_id,
      code: serviceDescriptions.code,
      title: serviceDescriptions.title,
      description: serviceDescriptions.description,
      scope_included: serviceDescriptions.scope_included,
      scope_excluded: serviceDescriptions.scope_excluded,
      compliance_tags: serviceDescriptions.compliance_tags,
      version: serviceDescriptions.version,
      status: serviceDescriptions.status,
      created_at: serviceDescriptions.created_at,
      updated_at: serviceDescriptions.updated_at,
    })
    .from(serviceDescriptions)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return {
    serviceDescriptions: rows.map(shapeServiceDescription),
    total,
  };
}

/**
 * Get a single service description by ID.
 */
export async function getServiceDescription(
  tenantId: string,
  id: string,
): Promise<unknown> {
  const d = db();

  const rows = await d
    .select({
      id: serviceDescriptions.id,
      tenant_id: serviceDescriptions.tenant_id,
      code: serviceDescriptions.code,
      title: serviceDescriptions.title,
      description: serviceDescriptions.description,
      scope_included: serviceDescriptions.scope_included,
      scope_excluded: serviceDescriptions.scope_excluded,
      compliance_tags: serviceDescriptions.compliance_tags,
      version: serviceDescriptions.version,
      status: serviceDescriptions.status,
      created_at: serviceDescriptions.created_at,
      updated_at: serviceDescriptions.updated_at,
    })
    .from(serviceDescriptions)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.id, id),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Service description not found');
  }

  return shapeServiceDescription(row);
}

/**
 * Create a new service description.
 */
export async function createServiceDescription(
  tenantId: string,
  data: CreateServiceDescriptionInput,
  _userId: string,
): Promise<unknown> {
  const d = db();

  // Check for duplicate code within tenant
  const [existing] = await d
    .select({ id: serviceDescriptions.id })
    .from(serviceDescriptions)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.code, data.code),
      ),
    )
    .limit(1);

  if (existing) {
    throw new ConflictError(
      `A service description with code '${data.code}' already exists in this tenant.`,
    );
  }

  const now = new Date().toISOString();
  const id = uuidv4();

  await d.insert(serviceDescriptions).values({
    id,
    tenant_id: tenantId,
    code: data.code,
    title: data.title,
    description: data.description ?? '',
    scope_included: data.scope_included ?? null,
    scope_excluded: data.scope_excluded ?? null,
    compliance_tags: JSON.stringify(data.compliance_tags ?? []),
    version: 1,
    status: data.status ?? 'draft',
    created_at: now,
    updated_at: now,
  });

  return getServiceDescription(tenantId, id);
}

/**
 * Update an existing service description.
 * Increments version when status changes to 'published'.
 */
export async function updateServiceDescription(
  tenantId: string,
  id: string,
  data: UpdateServiceDescriptionInput,
  _userId: string,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select({
      id: serviceDescriptions.id,
      status: serviceDescriptions.status,
      version: serviceDescriptions.version,
    })
    .from(serviceDescriptions)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.id, id),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Service description not found');
  }

  // Check for code uniqueness if code is being changed
  if (data.code !== undefined && data.code !== existing.id) {
    const [codeConflict] = await d
      .select({ id: serviceDescriptions.id })
      .from(serviceDescriptions)
      .where(
        and(
          eq(serviceDescriptions.tenant_id, tenantId),
          eq(serviceDescriptions.code, data.code),
        ),
      )
      .limit(1);

    if (codeConflict && codeConflict.id !== id) {
      throw new ConflictError(
        `A service description with code '${data.code}' already exists in this tenant.`,
      );
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.code !== undefined) updateData.code = data.code;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.scope_included !== undefined) updateData.scope_included = data.scope_included;
  if (data.scope_excluded !== undefined) updateData.scope_excluded = data.scope_excluded;
  if (data.compliance_tags !== undefined) updateData.compliance_tags = JSON.stringify(data.compliance_tags);

  if (data.status !== undefined) {
    updateData.status = data.status;
    // Increment version when publishing for the first time or re-publishing
    if (data.status === 'published' && existing.status !== 'published') {
      updateData.version = existing.version + 1;
    }
  }

  await d
    .update(serviceDescriptions)
    .set(updateData)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.id, id),
      ),
    );

  return getServiceDescription(tenantId, id);
}

/**
 * Delete a service description.
 * Fails if the description is referenced by any catalog item.
 */
export async function deleteServiceDescription(
  tenantId: string,
  id: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ id: serviceDescriptions.id })
    .from(serviceDescriptions)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.id, id),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Service description not found');
  }

  // Check for references in horizontal catalog items
  const [itemCount] = await d
    .select({ count: count() })
    .from(horizontalCatalogItems)
    .where(eq(horizontalCatalogItems.service_desc_id, id));

  if ((itemCount?.count ?? 0) > 0) {
    throw new ConflictError(
      'Cannot delete service description — it is referenced by one or more catalog items. Remove those items first.',
    );
  }

  await d
    .delete(serviceDescriptions)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.id, id),
      ),
    );
}

// ─── Horizontal Catalogs ──────────────────────────────────

/**
 * List horizontal catalogs with optional status filter and pagination.
 * Includes item count per catalog.
 */
export async function listHorizontalCatalogs(
  tenantId: string,
  params: CatalogFilterParams,
): Promise<{ catalogs: unknown[]; total: number }> {
  const d = db();
  const { page, limit, sort, order, status } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(horizontalCatalog.tenant_id, tenantId)];
  if (status) conditions.push(eq(horizontalCatalog.status, status));

  const [totalResult] = await d
    .select({ count: count() })
    .from(horizontalCatalog)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn =
    sort === 'name' ? horizontalCatalog.name
    : sort === 'status' ? horizontalCatalog.status
    : horizontalCatalog.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select({
      id: horizontalCatalog.id,
      tenant_id: horizontalCatalog.tenant_id,
      name: horizontalCatalog.name,
      description: horizontalCatalog.description,
      status: horizontalCatalog.status,
      created_at: horizontalCatalog.created_at,
    })
    .from(horizontalCatalog)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  // Get item counts for each catalog
  const catalogIds = rows.map((r) => r.id);
  const itemCountMap = new Map<string, number>();

  if (catalogIds.length > 0) {
    const countRows = await d
      .select({
        catalog_id: horizontalCatalogItems.catalog_id,
        count: count(),
      })
      .from(horizontalCatalogItems)
      .where(inArray(horizontalCatalogItems.catalog_id, catalogIds))
      .groupBy(horizontalCatalogItems.catalog_id);

    for (const cr of countRows) {
      itemCountMap.set(cr.catalog_id, cr.count);
    }
  }

  const catalogs = rows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    item_count: itemCountMap.get(row.id) ?? 0,
  }));

  return { catalogs, total };
}

/**
 * Get a single horizontal catalog with its items (joined service descriptions).
 */
export async function getHorizontalCatalog(
  tenantId: string,
  id: string,
): Promise<unknown> {
  const d = db();

  const rows = await d
    .select({
      id: horizontalCatalog.id,
      tenant_id: horizontalCatalog.tenant_id,
      name: horizontalCatalog.name,
      description: horizontalCatalog.description,
      status: horizontalCatalog.status,
      created_at: horizontalCatalog.created_at,
    })
    .from(horizontalCatalog)
    .where(
      and(
        eq(horizontalCatalog.tenant_id, tenantId),
        eq(horizontalCatalog.id, id),
      ),
    )
    .limit(1);

  const catalog = rows[0];
  if (!catalog) {
    throw new NotFoundError('Horizontal catalog not found');
  }

  // Fetch items with joined service description details
  const itemRows = await d
    .select({
      catalog_id: horizontalCatalogItems.catalog_id,
      service_desc_id: horizontalCatalogItems.service_desc_id,
      sd_code: serviceDescriptions.code,
      sd_title: serviceDescriptions.title,
      sd_status: serviceDescriptions.status,
      sd_version: serviceDescriptions.version,
      sd_compliance_tags: serviceDescriptions.compliance_tags,
    })
    .from(horizontalCatalogItems)
    .leftJoin(
      serviceDescriptions,
      eq(horizontalCatalogItems.service_desc_id, serviceDescriptions.id),
    )
    .where(eq(horizontalCatalogItems.catalog_id, id));

  const items = itemRows.map((item) => ({
    service_desc_id: item.service_desc_id,
    code: item.sd_code ?? '',
    title: item.sd_title ?? '',
    status: item.sd_status ?? '',
    version: item.sd_version ?? 1,
    compliance_tags: parseComplianceTags(item.sd_compliance_tags),
  }));

  return {
    id: catalog.id,
    tenant_id: catalog.tenant_id,
    name: catalog.name,
    description: catalog.description,
    status: catalog.status,
    created_at: catalog.created_at,
    items,
  };
}

/**
 * Create a new horizontal catalog.
 */
export async function createHorizontalCatalog(
  tenantId: string,
  data: CreateHorizontalCatalogInput,
  _userId: string,
): Promise<unknown> {
  const d = db();

  const now = new Date().toISOString();
  const id = uuidv4();

  await d.insert(horizontalCatalog).values({
    id,
    tenant_id: tenantId,
    name: data.name,
    description: data.description ?? null,
    status: data.status ?? 'active',
    created_at: now,
  });

  return getHorizontalCatalog(tenantId, id);
}

/**
 * Update a horizontal catalog.
 */
export async function updateHorizontalCatalog(
  tenantId: string,
  id: string,
  data: UpdateHorizontalCatalogInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select({ id: horizontalCatalog.id })
    .from(horizontalCatalog)
    .where(
      and(
        eq(horizontalCatalog.tenant_id, tenantId),
        eq(horizontalCatalog.id, id),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Horizontal catalog not found');
  }

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;

  if (Object.keys(updateData).length > 0) {
    await d
      .update(horizontalCatalog)
      .set(updateData)
      .where(
        and(
          eq(horizontalCatalog.tenant_id, tenantId),
          eq(horizontalCatalog.id, id),
        ),
      );
  }

  return getHorizontalCatalog(tenantId, id);
}

/**
 * Delete a horizontal catalog.
 * Fails if the catalog still has items.
 */
export async function deleteHorizontalCatalog(
  tenantId: string,
  id: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ id: horizontalCatalog.id })
    .from(horizontalCatalog)
    .where(
      and(
        eq(horizontalCatalog.tenant_id, tenantId),
        eq(horizontalCatalog.id, id),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Horizontal catalog not found');
  }

  // Check for items still in this catalog
  const [itemCount] = await d
    .select({ count: count() })
    .from(horizontalCatalogItems)
    .where(eq(horizontalCatalogItems.catalog_id, id));

  if ((itemCount?.count ?? 0) > 0) {
    throw new ConflictError(
      'Cannot delete catalog — it still contains items. Remove all items first.',
    );
  }

  await d
    .delete(horizontalCatalog)
    .where(
      and(
        eq(horizontalCatalog.tenant_id, tenantId),
        eq(horizontalCatalog.id, id),
      ),
    );
}

/**
 * Add a service description to a horizontal catalog.
 */
export async function addCatalogItem(
  tenantId: string,
  catalogId: string,
  serviceDescId: string,
): Promise<unknown> {
  const d = db();

  // Verify catalog exists and belongs to tenant
  const [catalog] = await d
    .select({ id: horizontalCatalog.id })
    .from(horizontalCatalog)
    .where(
      and(
        eq(horizontalCatalog.tenant_id, tenantId),
        eq(horizontalCatalog.id, catalogId),
      ),
    )
    .limit(1);

  if (!catalog) {
    throw new NotFoundError('Horizontal catalog not found');
  }

  // Verify service description exists and belongs to tenant
  const [svcDesc] = await d
    .select({ id: serviceDescriptions.id })
    .from(serviceDescriptions)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.id, serviceDescId),
      ),
    )
    .limit(1);

  if (!svcDesc) {
    throw new NotFoundError('Service description not found');
  }

  // Check if already in catalog
  const [existingItem] = await d
    .select({ catalog_id: horizontalCatalogItems.catalog_id })
    .from(horizontalCatalogItems)
    .where(
      and(
        eq(horizontalCatalogItems.catalog_id, catalogId),
        eq(horizontalCatalogItems.service_desc_id, serviceDescId),
      ),
    )
    .limit(1);

  if (existingItem) {
    throw new ConflictError('Service description is already in this catalog.');
  }

  await d.insert(horizontalCatalogItems).values({
    catalog_id: catalogId,
    service_desc_id: serviceDescId,
  });

  return getHorizontalCatalog(tenantId, catalogId);
}

/**
 * Remove a service description from a horizontal catalog.
 */
export async function removeCatalogItem(
  tenantId: string,
  catalogId: string,
  serviceDescId: string,
): Promise<void> {
  const d = db();

  // Verify catalog exists and belongs to tenant
  const [catalog] = await d
    .select({ id: horizontalCatalog.id })
    .from(horizontalCatalog)
    .where(
      and(
        eq(horizontalCatalog.tenant_id, tenantId),
        eq(horizontalCatalog.id, catalogId),
      ),
    )
    .limit(1);

  if (!catalog) {
    throw new NotFoundError('Horizontal catalog not found');
  }

  // Verify item exists in catalog
  const [existingItem] = await d
    .select({ catalog_id: horizontalCatalogItems.catalog_id })
    .from(horizontalCatalogItems)
    .where(
      and(
        eq(horizontalCatalogItems.catalog_id, catalogId),
        eq(horizontalCatalogItems.service_desc_id, serviceDescId),
      ),
    )
    .limit(1);

  if (!existingItem) {
    throw new NotFoundError('Service description not found in this catalog.');
  }

  await d
    .delete(horizontalCatalogItems)
    .where(
      and(
        eq(horizontalCatalogItems.catalog_id, catalogId),
        eq(horizontalCatalogItems.service_desc_id, serviceDescId),
      ),
    );
}

// ─── Vertical Catalogs (Enterprise) ─────────────────────

/**
 * List vertical catalogs with customer and base catalog names.
 */
export async function listVerticalCatalogs(
  tenantId: string,
): Promise<unknown[]> {
  const d = db();

  const rows = await d
    .select({
      id: verticalCatalogs.id,
      tenant_id: verticalCatalogs.tenant_id,
      name: verticalCatalogs.name,
      base_catalog_id: verticalCatalogs.base_catalog_id,
      customer_id: verticalCatalogs.customer_id,
      industry: verticalCatalogs.industry,
      description: verticalCatalogs.description,
      status: verticalCatalogs.status,
      created_at: verticalCatalogs.created_at,
      base_catalog_name: horizontalCatalog.name,
      customer_name: customers.name,
    })
    .from(verticalCatalogs)
    .leftJoin(horizontalCatalog, eq(verticalCatalogs.base_catalog_id, horizontalCatalog.id))
    .leftJoin(customers, eq(verticalCatalogs.customer_id, customers.id))
    .where(eq(verticalCatalogs.tenant_id, tenantId))
    .orderBy(asc(verticalCatalogs.name));

  // Count overrides per catalog
  const catalogIds = rows.map((r) => r.id);
  const overrideCountMap = new Map<string, number>();

  if (catalogIds.length > 0) {
    const countRows = await d
      .select({
        vertical_id: verticalCatalogOverrides.vertical_id,
        count: count(),
      })
      .from(verticalCatalogOverrides)
      .where(inArray(verticalCatalogOverrides.vertical_id, catalogIds))
      .groupBy(verticalCatalogOverrides.vertical_id);

    for (const cr of countRows) {
      overrideCountMap.set(cr.vertical_id, cr.count);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    base_catalog_id: row.base_catalog_id,
    base_catalog_name: row.base_catalog_name ?? null,
    customer_id: row.customer_id,
    customer_name: row.customer_name ?? null,
    industry: row.industry,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    override_count: overrideCountMap.get(row.id) ?? 0,
  }));
}

/**
 * Get a single vertical catalog with its overrides and effective services.
 */
export async function getVerticalCatalog(
  tenantId: string,
  id: string,
): Promise<unknown> {
  const d = db();

  const [row] = await d
    .select({
      id: verticalCatalogs.id,
      tenant_id: verticalCatalogs.tenant_id,
      name: verticalCatalogs.name,
      base_catalog_id: verticalCatalogs.base_catalog_id,
      customer_id: verticalCatalogs.customer_id,
      industry: verticalCatalogs.industry,
      description: verticalCatalogs.description,
      status: verticalCatalogs.status,
      created_at: verticalCatalogs.created_at,
      base_catalog_name: horizontalCatalog.name,
      customer_name: customers.name,
    })
    .from(verticalCatalogs)
    .leftJoin(horizontalCatalog, eq(verticalCatalogs.base_catalog_id, horizontalCatalog.id))
    .leftJoin(customers, eq(verticalCatalogs.customer_id, customers.id))
    .where(and(eq(verticalCatalogs.id, id), eq(verticalCatalogs.tenant_id, tenantId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Vertical catalog not found');
  }

  // Get overrides
  const overrides = await d
    .select({
      id: verticalCatalogOverrides.id,
      vertical_id: verticalCatalogOverrides.vertical_id,
      original_desc_id: verticalCatalogOverrides.original_desc_id,
      override_desc_id: verticalCatalogOverrides.override_desc_id,
      override_type: verticalCatalogOverrides.override_type,
      reason: verticalCatalogOverrides.reason,
    })
    .from(verticalCatalogOverrides)
    .where(eq(verticalCatalogOverrides.vertical_id, id));

  // Enrich overrides with service description details
  const enrichedOverrides: Array<typeof overrides[number] & { original_code: string; original_title: string; override_code: string; override_title: string }> = [];
  for (const ov of overrides) {
    const [origSvc] = await d
      .select({ code: serviceDescriptions.code, title: serviceDescriptions.title })
      .from(serviceDescriptions)
      .where(eq(serviceDescriptions.id, ov.original_desc_id))
      .limit(1);
    const [overrideSvc] = await d
      .select({ code: serviceDescriptions.code, title: serviceDescriptions.title })
      .from(serviceDescriptions)
      .where(eq(serviceDescriptions.id, ov.override_desc_id))
      .limit(1);

    enrichedOverrides.push({
      ...ov,
      original_code: origSvc?.code ?? '',
      original_title: origSvc?.title ?? '',
      override_code: overrideSvc?.code ?? '',
      override_title: overrideSvc?.title ?? '',
    });
  }

  // Get base catalog items to build effective service list
  const baseItems = await d
    .select({
      service_desc_id: horizontalCatalogItems.service_desc_id,
      sd_code: serviceDescriptions.code,
      sd_title: serviceDescriptions.title,
      sd_status: serviceDescriptions.status,
    })
    .from(horizontalCatalogItems)
    .leftJoin(serviceDescriptions, eq(horizontalCatalogItems.service_desc_id, serviceDescriptions.id))
    .where(eq(horizontalCatalogItems.catalog_id, row.base_catalog_id));

  // Build effective services: apply overrides
  const overrideMap = new Map(overrides.map((o) => [o.original_desc_id, o]));
  const effectiveServices = baseItems.map((item) => {
    const override = overrideMap.get(item.service_desc_id);
    if (override) {
      const ovSvc = enrichedOverrides.find((e) => e.id === override.id);
      return {
        service_desc_id: override.override_desc_id,
        code: ovSvc?.override_code ?? '',
        title: ovSvc?.override_title ?? '',
        status: item.sd_status ?? '',
        is_override: true,
        override_type: override.override_type,
        original_code: ovSvc?.original_code ?? '',
      };
    }
    return {
      service_desc_id: item.service_desc_id,
      code: item.sd_code ?? '',
      title: item.sd_title ?? '',
      status: item.sd_status ?? '',
      is_override: false,
      override_type: null,
      original_code: null,
    };
  });

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    base_catalog_id: row.base_catalog_id,
    base_catalog_name: row.base_catalog_name ?? null,
    customer_id: row.customer_id,
    customer_name: row.customer_name ?? null,
    industry: row.industry,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    overrides: enrichedOverrides,
    effective_services: effectiveServices,
  };
}

/**
 * Create a new vertical catalog.
 */
export async function createVerticalCatalog(
  tenantId: string,
  data: {
    name: string;
    base_catalog_id: string;
    customer_id?: string | null;
    industry?: string | null;
    description?: string | null;
    status?: string;
  },
): Promise<unknown> {
  const d = db();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Verify base catalog exists
  const [baseCatalog] = await d
    .select({ id: horizontalCatalog.id })
    .from(horizontalCatalog)
    .where(and(eq(horizontalCatalog.id, data.base_catalog_id), eq(horizontalCatalog.tenant_id, tenantId)))
    .limit(1);

  if (!baseCatalog) {
    throw new NotFoundError('Base horizontal catalog not found');
  }

  await d.insert(verticalCatalogs).values({
    id,
    tenant_id: tenantId,
    name: data.name,
    base_catalog_id: data.base_catalog_id,
    customer_id: data.customer_id ?? null,
    industry: data.industry ?? null,
    description: data.description ?? null,
    status: data.status ?? 'active',
    created_at: now,
  });

  return getVerticalCatalog(tenantId, id);
}

/**
 * Update a vertical catalog.
 */
export async function updateVerticalCatalog(
  tenantId: string,
  id: string,
  data: {
    name?: string;
    customer_id?: string | null;
    industry?: string | null;
    description?: string | null;
    status?: string;
  },
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select({ id: verticalCatalogs.id })
    .from(verticalCatalogs)
    .where(and(eq(verticalCatalogs.id, id), eq(verticalCatalogs.tenant_id, tenantId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Vertical catalog not found');
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.customer_id !== undefined) updateData.customer_id = data.customer_id;
  if (data.industry !== undefined) updateData.industry = data.industry;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;

  if (Object.keys(updateData).length > 0) {
    await d
      .update(verticalCatalogs)
      .set(updateData)
      .where(and(eq(verticalCatalogs.id, id), eq(verticalCatalogs.tenant_id, tenantId)));
  }

  return getVerticalCatalog(tenantId, id);
}

/**
 * Delete a vertical catalog and its overrides.
 */
export async function deleteVerticalCatalog(
  tenantId: string,
  id: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ id: verticalCatalogs.id })
    .from(verticalCatalogs)
    .where(and(eq(verticalCatalogs.id, id), eq(verticalCatalogs.tenant_id, tenantId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Vertical catalog not found');
  }

  // Delete overrides first
  await d.delete(verticalCatalogOverrides).where(eq(verticalCatalogOverrides.vertical_id, id));
  // Delete the catalog
  await d.delete(verticalCatalogs).where(and(eq(verticalCatalogs.id, id), eq(verticalCatalogs.tenant_id, tenantId)));
}

/**
 * Add an override to a vertical catalog.
 */
export async function addVerticalOverride(
  tenantId: string,
  verticalId: string,
  data: {
    original_desc_id: string;
    override_desc_id: string;
    override_type: string;
    reason?: string | null;
  },
): Promise<unknown> {
  const d = db();

  // Verify vertical catalog exists
  const [vc] = await d
    .select({ id: verticalCatalogs.id })
    .from(verticalCatalogs)
    .where(and(eq(verticalCatalogs.id, verticalId), eq(verticalCatalogs.tenant_id, tenantId)))
    .limit(1);

  if (!vc) {
    throw new NotFoundError('Vertical catalog not found');
  }

  const id = uuidv4();
  await d.insert(verticalCatalogOverrides).values({
    id,
    vertical_id: verticalId,
    original_desc_id: data.original_desc_id,
    override_desc_id: data.override_desc_id,
    override_type: data.override_type,
    reason: data.reason ?? null,
  });

  return getVerticalCatalog(tenantId, verticalId);
}

/**
 * Remove an override from a vertical catalog.
 */
export async function removeVerticalOverride(
  tenantId: string,
  verticalId: string,
  overrideId: string,
): Promise<void> {
  const d = db();

  // Verify vertical catalog exists
  const [vc] = await d
    .select({ id: verticalCatalogs.id })
    .from(verticalCatalogs)
    .where(and(eq(verticalCatalogs.id, verticalId), eq(verticalCatalogs.tenant_id, tenantId)))
    .limit(1);

  if (!vc) {
    throw new NotFoundError('Vertical catalog not found');
  }

  const [existing] = await d
    .select({ id: verticalCatalogOverrides.id })
    .from(verticalCatalogOverrides)
    .where(and(eq(verticalCatalogOverrides.id, overrideId), eq(verticalCatalogOverrides.vertical_id, verticalId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Override not found');
  }

  await d.delete(verticalCatalogOverrides).where(eq(verticalCatalogOverrides.id, overrideId));
}
