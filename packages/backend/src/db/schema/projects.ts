import { sqliteTable, text, index, unique } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { customers } from './customers.js';
import { assets } from './assets.js';

// =============================================================================
// projects — Project Structures (Evo-2C)
// =============================================================================

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    customer_id: text('customer_id').references(() => customers.id),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    status: text('status').notNull().default('active'),
    start_date: text('start_date'),
    end_date: text('end_date'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    unique('uq_project_code').on(t.tenant_id, t.code),
    index('idx_proj_tenant').on(t.tenant_id),
    index('idx_proj_tenant_status').on(t.tenant_id, t.status),
    index('idx_proj_tenant_customer').on(t.tenant_id, t.customer_id),
  ],
);

// =============================================================================
// project_assets — Link table between projects and assets (Evo-2C)
// =============================================================================

export const projectAssets = sqliteTable(
  'project_assets',
  {
    project_id: text('project_id')
      .notNull()
      .references(() => projects.id),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    role: text('role'),
    added_at: text('added_at').notNull(),
  },
  (t) => [
    unique('uq_project_asset').on(t.project_id, t.asset_id),
    index('idx_pa_tenant').on(t.tenant_id),
    index('idx_pa_project').on(t.project_id),
    index('idx_pa_asset').on(t.asset_id),
  ],
);
