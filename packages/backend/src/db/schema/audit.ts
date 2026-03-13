import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';

// =============================================================================
// audit_logs — System-wide audit trail
// =============================================================================

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    actor_id: text('actor_id').notNull(),
    actor_email: text('actor_email').notNull(),
    event_type: text('event_type').notNull(),
    resource_type: text('resource_type').notNull(),
    resource_id: text('resource_id'),
    details: text('details').notNull().default('{}'),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    integrity_hash: text('integrity_hash'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_audit_tenant').on(t.tenant_id),
    index('idx_audit_tenant_event').on(t.tenant_id, t.event_type),
    index('idx_audit_tenant_resource').on(t.tenant_id, t.resource_type),
    index('idx_audit_tenant_actor').on(t.tenant_id, t.actor_id),
    index('idx_audit_tenant_created').on(t.tenant_id, t.created_at),
  ],
);
