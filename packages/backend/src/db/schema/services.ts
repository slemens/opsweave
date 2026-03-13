import { sqliteTable, text, integer, index, unique, primaryKey } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { customers } from './customers.js';
import { assets } from './assets.js';

// =============================================================================
// service_descriptions
// =============================================================================

export const serviceDescriptions = sqliteTable(
  'service_descriptions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    scope_included: text('scope_included'),
    scope_excluded: text('scope_excluded'),
    compliance_tags: text('compliance_tags').notNull().default('[]'),
    version: integer('version').notNull().default(1),
    status: text('status').notNull().default('draft'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    unique('uq_sd_tenant_code').on(t.tenant_id, t.code),
    index('idx_sd_tenant').on(t.tenant_id),
    index('idx_sd_tenant_status').on(t.tenant_id, t.status),
  ],
);

// =============================================================================
// horizontal_catalog
// =============================================================================

export const horizontalCatalog = sqliteTable(
  'horizontal_catalog',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('active'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_hc_tenant').on(t.tenant_id),
  ],
);

// =============================================================================
// horizontal_catalog_items — Junction table
// =============================================================================

export const horizontalCatalogItems = sqliteTable(
  'horizontal_catalog_items',
  {
    catalog_id: text('catalog_id')
      .notNull()
      .references(() => horizontalCatalog.id),
    service_desc_id: text('service_desc_id')
      .notNull()
      .references(() => serviceDescriptions.id),
  },
  (t) => [
    primaryKey({ columns: [t.catalog_id, t.service_desc_id] }),
    index('idx_hci_catalog').on(t.catalog_id),
    index('idx_hci_service').on(t.service_desc_id),
  ],
);

// =============================================================================
// vertical_catalogs (Enterprise)
// =============================================================================

export const verticalCatalogs = sqliteTable(
  'vertical_catalogs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    base_catalog_id: text('base_catalog_id')
      .notNull()
      .references(() => horizontalCatalog.id),
    customer_id: text('customer_id').references(() => customers.id),
    industry: text('industry'),
    description: text('description'),
    status: text('status').notNull().default('active'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_vc_tenant').on(t.tenant_id),
    index('idx_vc_tenant_customer').on(t.tenant_id, t.customer_id),
  ],
);

// =============================================================================
// vertical_catalog_overrides
// =============================================================================

export const verticalCatalogOverrides = sqliteTable(
  'vertical_catalog_overrides',
  {
    id: text('id').primaryKey(),
    vertical_id: text('vertical_id')
      .notNull()
      .references(() => verticalCatalogs.id),
    original_desc_id: text('original_desc_id')
      .notNull()
      .references(() => serviceDescriptions.id),
    override_desc_id: text('override_desc_id')
      .notNull()
      .references(() => serviceDescriptions.id),
    override_type: text('override_type').notNull(),
    reason: text('reason'),
  },
  (t) => [
    index('idx_vco_vertical').on(t.vertical_id),
  ],
);

// =============================================================================
// asset_service_links — Maps assets to vertical catalogs
// =============================================================================

// =============================================================================
// service_scope_items — Structured scope items per service description
// =============================================================================

export const serviceScopeItems = sqliteTable(
  'service_scope_items',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    service_id: text('service_id')
      .notNull()
      .references(() => serviceDescriptions.id),
    item_description: text('item_description').notNull(),
    scope_type: text('scope_type').notNull().default('included'),
    sort_order: integer('sort_order').notNull().default(0),
    notes: text('notes'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_ssi_tenant_service').on(t.tenant_id, t.service_id),
    index('idx_ssi_service_type').on(t.service_id, t.scope_type),
  ],
);

// =============================================================================
// asset_service_links — Maps assets to vertical catalogs
// =============================================================================

export const assetServiceLinks = sqliteTable(
  'asset_service_links',
  {
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    vertical_id: text('vertical_id')
      .notNull()
      .references(() => verticalCatalogs.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    effective_from: text('effective_from').notNull(),
    effective_until: text('effective_until'),
  },
  (t) => [
    primaryKey({ columns: [t.asset_id, t.vertical_id] }),
    index('idx_asl_tenant').on(t.tenant_id),
    index('idx_asl_asset').on(t.tenant_id, t.asset_id),
    index('idx_asl_vertical').on(t.tenant_id, t.vertical_id),
  ],
);
