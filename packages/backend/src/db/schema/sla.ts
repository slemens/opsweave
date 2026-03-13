import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { customers } from './customers.js';
import { serviceDescriptions } from './services.js';
import { assets } from './assets.js';

// =============================================================================
// sla_definitions — What an SLA actually means (response/resolution times)
// =============================================================================

export const slaDefinitions = sqliteTable(
  'sla_definitions',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(), // e.g. "Platinum 24/7", "Gold Business Hours"
    description: text('description'),
    // Response & Resolution targets in MINUTES
    response_time_minutes: integer('response_time_minutes').notNull(), // e.g. 15, 60, 240
    resolution_time_minutes: integer('resolution_time_minutes').notNull(), // e.g. 60, 240, 1440
    // Business hours definition
    business_hours: text('business_hours').notNull().default('24/7'), // '24/7' | 'business' | 'extended'
    business_hours_start: text('business_hours_start'), // e.g. '08:00' (only if business_hours != '24/7')
    business_hours_end: text('business_hours_end'), // e.g. '18:00'
    business_days: text('business_days').notNull().default('1,2,3,4,5'), // comma-separated: 1=Mon ... 7=Sun
    // Priority overrides (JSON): { "critical": { "response": 15, "resolution": 60 }, ... }
    priority_overrides: text('priority_overrides').notNull().default('{}'),
    // Evo-2A: Extended SLA fields
    rpo_minutes: integer('rpo_minutes'), // Recovery Point Objective
    rto_minutes: integer('rto_minutes'), // Recovery Time Objective
    service_window: text('service_window').default('{}'), // JSON: { maintenance_window, change_window }
    escalation_matrix: text('escalation_matrix').default('[]'), // JSON: escalation levels with contacts/timeouts
    // Evo-2.2a: Extended SLA fields
    availability_pct: text('availability_pct'), // e.g. "99.9"
    support_level: text('support_level'), // "8x5" | "24x7" | "best-effort"
    recovery_class: text('recovery_class'),
    business_criticality: text('business_criticality'), // "low" | "medium" | "high" | "critical"
    penalty_clause: text('penalty_clause'), // markdown
    contract_reference: text('contract_reference'),
    valid_from: text('valid_from'), // ISO date
    valid_until: text('valid_until'), // ISO date
    is_default: integer('is_default').notNull().default(0), // 0|1 — tenant-wide default SLA
    is_active: integer('is_active').notNull().default(1),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_sladef_tenant').on(t.tenant_id),
    index('idx_sladef_tenant_active').on(t.tenant_id, t.is_active),
  ],
);

// =============================================================================
// sla_assignments — Links an SLA definition to a scope (service, customer, asset)
// =============================================================================
// Resolution order (highest priority first):
//   1. Asset-specific assignment
//   2. Customer + Service combination
//   3. Customer-wide assignment
//   4. Service-wide assignment
//   5. Tenant default (is_default on sla_definitions)

export const slaAssignments = sqliteTable(
  'sla_assignments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sla_definition_id: text('sla_definition_id')
      .notNull()
      .references(() => slaDefinitions.id),
    // Scope — at least one must be set
    service_id: text('service_id').references(() => serviceDescriptions.id),
    customer_id: text('customer_id').references(() => customers.id),
    asset_id: text('asset_id').references(() => assets.id),
    // Priority (higher = more specific, checked first)
    // Auto-calculated: asset=100, customer+service=75, customer=50, service=25
    priority: integer('priority').notNull().default(0),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_slaassign_tenant').on(t.tenant_id),
    index('idx_slaassign_tenant_asset').on(t.tenant_id, t.asset_id),
    index('idx_slaassign_tenant_customer').on(t.tenant_id, t.customer_id),
    index('idx_slaassign_tenant_service').on(t.tenant_id, t.service_id),
    unique('uq_sla_assignment').on(t.tenant_id, t.sla_definition_id, t.service_id, t.customer_id, t.asset_id),
  ],
);

// =============================================================================
// service_profiles (Evo-2A) — Reusable service tier definitions
// =============================================================================

export const serviceProfiles = sqliteTable(
  'service_profiles',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description'),
    dimensions: text('dimensions').notNull().default('{}'), // JSON: service dimensions/features
    sla_definition_id: text('sla_definition_id').references(() => slaDefinitions.id),
    is_active: integer('is_active').notNull().default(1),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_svcprofile_tenant').on(t.tenant_id),
    unique('uq_svcprofile_name').on(t.tenant_id, t.name),
  ],
);

// =============================================================================
// service_entitlements (Evo-2A) — Customer-specific service entitlements
// =============================================================================

export const serviceEntitlements = sqliteTable(
  'service_entitlements',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    customer_id: text('customer_id')
      .notNull()
      .references(() => customers.id),
    service_id: text('service_id')
      .notNull()
      .references(() => serviceDescriptions.id),
    profile_id: text('profile_id').references(() => serviceProfiles.id),
    scope: text('scope').notNull().default('{}'), // JSON: { included, excluded, addon }
    effective_from: text('effective_from').notNull(),
    effective_until: text('effective_until'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_svcent_tenant').on(t.tenant_id),
    index('idx_svcent_customer').on(t.tenant_id, t.customer_id),
    index('idx_svcent_service').on(t.tenant_id, t.service_id),
  ],
);
