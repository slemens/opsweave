import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { assigneeGroups } from './users.js';
import { customers } from './customers.js';

// =============================================================================
// asset_types — Extensible Asset Type Registry (Evo-1A)
// =============================================================================

export const assetTypes = sqliteTable(
  'asset_types',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull().default('other'),
    icon: text('icon'),
    color: text('color'),
    is_system: integer('is_system').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    attribute_schema: text('attribute_schema').notNull().default('[]'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    unique('uq_asset_type_slug').on(t.tenant_id, t.slug),
    index('idx_at_tenant').on(t.tenant_id),
    index('idx_at_tenant_active').on(t.tenant_id, t.is_active),
    index('idx_at_tenant_category').on(t.tenant_id, t.category),
  ],
);

// =============================================================================
// relation_types — Extensible Relation Type Registry (Evo-3A)
// =============================================================================

export const relationTypes = sqliteTable(
  'relation_types',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    is_directional: integer('is_directional').notNull().default(1),
    source_types: text('source_types').notNull().default('[]'),
    target_types: text('target_types').notNull().default('[]'),
    properties_schema: text('properties_schema').notNull().default('[]'),
    is_system: integer('is_system').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    color: text('color'),
    capacity_mappings: text('capacity_mappings').notNull().default('[]'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    unique('uq_relation_type_slug').on(t.tenant_id, t.slug),
    index('idx_rt_tenant').on(t.tenant_id),
    index('idx_rt_tenant_active').on(t.tenant_id, t.is_active),
  ],
);

// =============================================================================
// classification_models — Classification System (Evo-1C)
// =============================================================================

export const classificationModels = sqliteTable(
  'classification_models',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description'),
    is_system: integer('is_system').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    unique('uq_class_model_name').on(t.tenant_id, t.name),
    index('idx_cm_tenant').on(t.tenant_id),
  ],
);

export const classificationValues = sqliteTable(
  'classification_values',
  {
    id: text('id').primaryKey(),
    model_id: text('model_id')
      .notNull()
      .references(() => classificationModels.id),
    value: text('value').notNull(),
    label: text('label').notNull().default('{}'),
    color: text('color'),
    sort_order: integer('sort_order').notNull().default(0),
  },
  (t) => [
    unique('uq_class_value').on(t.model_id, t.value),
    index('idx_cv_model').on(t.model_id),
  ],
);

export const assetClassifications = sqliteTable(
  'asset_classifications',
  {
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    value_id: text('value_id')
      .notNull()
      .references(() => classificationValues.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    justification: text('justification'),
    classified_by: text('classified_by'),
    classified_at: text('classified_at').notNull(),
  },
  (t) => [
    unique('uq_asset_class').on(t.asset_id, t.value_id),
    index('idx_ac_tenant').on(t.tenant_id),
    index('idx_ac_asset').on(t.asset_id),
    index('idx_ac_value').on(t.value_id),
  ],
);

// =============================================================================
// capacity_types + asset_capacities — Capacity System (Evo-3C)
// =============================================================================

export const capacityTypes = sqliteTable(
  'capacity_types',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    unit: text('unit').notNull(),
    category: text('category'),
    is_system: integer('is_system').notNull().default(0),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    unique('uq_cap_type_slug').on(t.tenant_id, t.slug),
    index('idx_capt_tenant').on(t.tenant_id),
  ],
);

export const assetCapacities = sqliteTable(
  'asset_capacities',
  {
    id: text('id').primaryKey(),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    capacity_type_id: text('capacity_type_id')
      .notNull()
      .references(() => capacityTypes.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    direction: text('direction').notNull(),
    total: text('total').notNull().default('0'),
    allocated: text('allocated').notNull().default('0'),
    reserved: text('reserved').notNull().default('0'),
    source_relation_id: text('source_relation_id'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    unique('uq_asset_cap').on(t.asset_id, t.capacity_type_id, t.direction),
    index('idx_acap_tenant').on(t.tenant_id),
    index('idx_acap_asset').on(t.asset_id),
    index('idx_acap_source_rel').on(t.source_relation_id),
  ],
);

// =============================================================================
// asset_tenant_assignments — Multi-Tenant Asset Assignment (REQ-2.1)
// =============================================================================

export const assetTenantAssignments = sqliteTable(
  'asset_tenant_assignments',
  {
    id: text('id').primaryKey(),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    assignment_type: text('assignment_type').notNull().default('dedicated'),
    inherited_from_asset_id: text('inherited_from_asset_id').references(() => assets.id),
    notes: text('notes'),
    created_at: text('created_at').notNull(),
    created_by: text('created_by'),
  },
  (t) => [
    unique('uq_asset_tenant_assign').on(t.asset_id, t.tenant_id),
    index('idx_ata_tenant').on(t.tenant_id),
    index('idx_ata_asset').on(t.asset_id),
  ],
);

// =============================================================================
// asset_relation_history — History of relation changes (REQ-3.3b)
// =============================================================================

export const assetRelationHistory = sqliteTable(
  'asset_relation_history',
  {
    id: text('id').primaryKey(),
    relation_id: text('relation_id')
      .notNull(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    action: text('action').notNull(), // 'created' | 'modified' | 'deleted'
    changed_by: text('changed_by'),
    changed_at: text('changed_at').notNull(),
    old_values: text('old_values'), // JSON
    new_values: text('new_values'), // JSON
  },
  (t) => [
    index('idx_arh_relation').on(t.relation_id),
    index('idx_arh_tenant_changed').on(t.tenant_id, t.changed_at),
  ],
);

// =============================================================================
// asset_capacity_history — History of capacity changes (REQ-3.3b)
// =============================================================================

export const assetCapacityHistory = sqliteTable(
  'asset_capacity_history',
  {
    id: text('id').primaryKey(),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    capacity_type_id: text('capacity_type_id').notNull(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    old_total: integer('old_total'),
    old_allocated: integer('old_allocated'),
    new_total: integer('new_total'),
    new_allocated: integer('new_allocated'),
    changed_by: text('changed_by'),
    changed_at: text('changed_at').notNull(),
    reason: text('reason'),
  },
  (t) => [
    index('idx_ach_asset_type').on(t.asset_id, t.capacity_type_id),
    index('idx_ach_tenant_changed').on(t.tenant_id, t.changed_at),
  ],
);

// =============================================================================
// asset_history — Field-level change tracking for assets
// =============================================================================

export const assetHistory = sqliteTable(
  'asset_history',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    field_changed: text('field_changed').notNull(),
    old_value: text('old_value'),
    new_value: text('new_value'),
    changed_by: text('changed_by').notNull(),
    changed_at: text('changed_at').notNull(),
  },
  (t) => [
    index('idx_ah_tenant').on(t.tenant_id),
    index('idx_ah_tenant_asset').on(t.tenant_id, t.asset_id),
  ],
);

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
    valid_from: text('valid_from'),
    valid_until: text('valid_until'),
    metadata: text('metadata').notNull().default('{}'),
    created_at: text('created_at').notNull(),
    created_by: text('created_by').notNull(),
  },
  (t) => [
    unique('uq_asset_rel').on(t.tenant_id, t.source_asset_id, t.target_asset_id, t.relation_type),
    index('idx_arel_tenant').on(t.tenant_id),
    index('idx_arel_source').on(t.tenant_id, t.source_asset_id),
    index('idx_arel_target').on(t.tenant_id, t.target_asset_id),
    index('idx_arel_temporal').on(t.tenant_id, t.valid_from, t.valid_until),
  ],
);
