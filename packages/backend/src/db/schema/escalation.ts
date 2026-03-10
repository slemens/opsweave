import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { assigneeGroups } from './users.js';

// =============================================================================
// escalation_rules — defines when and where to escalate tickets
// =============================================================================

export const escalationRules = sqliteTable(
  'escalation_rules',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    // Conditions
    ticket_type: text('ticket_type'), // null = all types
    priority: text('priority'),       // null = all priorities
    // Threshold: percentage of SLA time elapsed (0-100)
    sla_threshold_pct: integer('sla_threshold_pct').notNull().default(80),
    // Action: escalate to this group
    target_group_id: text('target_group_id')
      .notNull()
      .references(() => assigneeGroups.id),
    escalation_level: integer('escalation_level').notNull().default(1),
    is_active: integer('is_active').notNull().default(1),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_esc_tenant').on(t.tenant_id),
    index('idx_esc_tenant_active').on(t.tenant_id, t.is_active),
  ],
);
