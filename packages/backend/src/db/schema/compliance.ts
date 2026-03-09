import { sqliteTable, text, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { serviceDescriptions } from './services.js';
import { assets } from './assets.js';

// =============================================================================
// regulatory_frameworks
// =============================================================================

export const regulatoryFrameworks = sqliteTable(
  'regulatory_frameworks',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    version: text('version'),
    description: text('description'),
    effective_date: text('effective_date'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_rf_tenant').on(t.tenant_id),
  ],
);

// =============================================================================
// regulatory_requirements
// =============================================================================

export const regulatoryRequirements = sqliteTable(
  'regulatory_requirements',
  {
    id: text('id').primaryKey(),
    framework_id: text('framework_id')
      .notNull()
      .references(() => regulatoryFrameworks.id),
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_rr_framework').on(t.framework_id),
    index('idx_rr_framework_category').on(t.framework_id, t.category),
  ],
);

// =============================================================================
// requirement_service_mappings — Junction: requirement <-> service_description
// =============================================================================

export const requirementServiceMappings = sqliteTable(
  'requirement_service_mappings',
  {
    requirement_id: text('requirement_id')
      .notNull()
      .references(() => regulatoryRequirements.id),
    service_desc_id: text('service_desc_id')
      .notNull()
      .references(() => serviceDescriptions.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    coverage_level: text('coverage_level').notNull().default('none'),
    evidence_notes: text('evidence_notes'),
    reviewed_at: text('reviewed_at'),
    reviewed_by: text('reviewed_by'),
  },
  (t) => [
    primaryKey({ columns: [t.requirement_id, t.service_desc_id] }),
    index('idx_rsm_tenant').on(t.tenant_id),
    index('idx_rsm_requirement').on(t.requirement_id),
    index('idx_rsm_service').on(t.service_desc_id),
  ],
);

// =============================================================================
// asset_regulatory_flags — Junction: asset <-> framework
// =============================================================================

export const assetRegulatoryFlags = sqliteTable(
  'asset_regulatory_flags',
  {
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    framework_id: text('framework_id')
      .notNull()
      .references(() => regulatoryFrameworks.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    reason: text('reason'),
    flagged_at: text('flagged_at').notNull(),
    flagged_by: text('flagged_by').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.asset_id, t.framework_id] }),
    index('idx_arf_tenant').on(t.tenant_id),
    index('idx_arf_asset').on(t.tenant_id, t.asset_id),
    index('idx_arf_framework').on(t.tenant_id, t.framework_id),
  ],
);
