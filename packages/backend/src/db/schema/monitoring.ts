import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { assets } from './assets.js';
import { tickets } from './tickets.js';

// =============================================================================
// monitoring_sources
// =============================================================================

export const monitoringSources = sqliteTable(
  'monitoring_sources',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    type: text('type').notNull(),
    config: text('config').notNull().default('{}'),
    webhook_secret: text('webhook_secret'),
    is_active: integer('is_active').notNull().default(1),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_ms_tenant').on(t.tenant_id),
    index('idx_ms_tenant_active').on(t.tenant_id, t.is_active),
  ],
);

// =============================================================================
// monitoring_events
// =============================================================================

export const monitoringEvents = sqliteTable(
  'monitoring_events',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    source_id: text('source_id')
      .notNull()
      .references(() => monitoringSources.id),
    external_id: text('external_id'),
    hostname: text('hostname').notNull(),
    service_name: text('service_name'),
    state: text('state').notNull(),
    output: text('output'),
    matched_asset_id: text('matched_asset_id').references(() => assets.id),
    ticket_id: text('ticket_id').references(() => tickets.id),
    processed: integer('processed').notNull().default(0),
    received_at: text('received_at').notNull(),
    processed_at: text('processed_at'),
  },
  (t) => [
    index('idx_me_tenant').on(t.tenant_id),
    index('idx_me_tenant_source').on(t.tenant_id, t.source_id),
    index('idx_me_tenant_processed').on(t.tenant_id, t.processed),
    index('idx_me_tenant_hostname').on(t.tenant_id, t.hostname),
    index('idx_me_external').on(t.external_id),
  ],
);
