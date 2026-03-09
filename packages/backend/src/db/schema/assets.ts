import { sqliteTable, text, index, unique } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { assigneeGroups } from './users.js';
import { customers } from './customers.js';

// =============================================================================
// assets — Central CMDB entity
// =============================================================================

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    asset_type: text('asset_type').notNull(),
    name: text('name').notNull(),
    display_name: text('display_name').notNull(),
    status: text('status').notNull().default('active'),
    ip_address: text('ip_address'),
    location: text('location'),
    sla_tier: text('sla_tier').notNull().default('none'),
    environment: text('environment'),
    owner_group_id: text('owner_group_id').references(() => assigneeGroups.id),
    customer_id: text('customer_id').references(() => customers.id),
    attributes: text('attributes').notNull().default('{}'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
    created_by: text('created_by').notNull(),
  },
  (t) => [
    index('idx_asset_tenant').on(t.tenant_id),
    index('idx_asset_tenant_type').on(t.tenant_id, t.asset_type),
    index('idx_asset_tenant_status').on(t.tenant_id, t.status),
    index('idx_asset_tenant_sla').on(t.tenant_id, t.sla_tier),
    index('idx_asset_tenant_customer').on(t.tenant_id, t.customer_id),
  ],
);

// =============================================================================
// asset_relations — DAG edges
// =============================================================================

export const assetRelations = sqliteTable(
  'asset_relations',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    source_asset_id: text('source_asset_id')
      .notNull()
      .references(() => assets.id),
    target_asset_id: text('target_asset_id')
      .notNull()
      .references(() => assets.id),
    relation_type: text('relation_type').notNull(),
    properties: text('properties').notNull().default('{}'),
    created_at: text('created_at').notNull(),
    created_by: text('created_by').notNull(),
  },
  (t) => [
    unique('uq_asset_rel').on(t.tenant_id, t.source_asset_id, t.target_asset_id, t.relation_type),
    index('idx_arel_tenant').on(t.tenant_id),
    index('idx_arel_source').on(t.tenant_id, t.source_asset_id),
    index('idx_arel_target').on(t.tenant_id, t.target_asset_id),
  ],
);
