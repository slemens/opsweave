import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { users, assigneeGroups } from './users.js';
import { assets } from './assets.js';
import { customers } from './customers.js';

// =============================================================================
// tickets
// =============================================================================

export const tickets = sqliteTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    ticket_number: text('ticket_number').notNull(),
    ticket_type: text('ticket_type').notNull(),
    subtype: text('subtype'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('open'),
    priority: text('priority').notNull().default('medium'),
    impact: text('impact'),
    urgency: text('urgency'),
    asset_id: text('asset_id').references(() => assets.id),
    assignee_id: text('assignee_id').references(() => users.id),
    assignee_group_id: text('assignee_group_id').references(() => assigneeGroups.id),
    reporter_id: text('reporter_id')
      .notNull()
      .references(() => users.id),
    customer_id: text('customer_id').references(() => customers.id),
    workflow_instance_id: text('workflow_instance_id'),
    current_step_id: text('current_step_id'),
    sla_tier: text('sla_tier'),
    sla_response_due: text('sla_response_due'),
    sla_resolve_due: text('sla_resolve_due'),
    sla_breached: integer('sla_breached').notNull().default(0),
    source: text('source').notNull().default('manual'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
    resolved_at: text('resolved_at'),
    closed_at: text('closed_at'),
    created_by: text('created_by').notNull(),
  },
  (t) => [
    index('idx_ticket_tenant').on(t.tenant_id),
    index('idx_ticket_tenant_status').on(t.tenant_id, t.status),
    index('idx_ticket_tenant_type').on(t.tenant_id, t.ticket_type),
    index('idx_ticket_tenant_group').on(t.tenant_id, t.assignee_group_id),
    index('idx_ticket_tenant_assignee').on(t.tenant_id, t.assignee_id),
    index('idx_ticket_tenant_asset').on(t.tenant_id, t.asset_id),
    index('idx_ticket_tenant_customer').on(t.tenant_id, t.customer_id),
    index('idx_ticket_tenant_priority').on(t.tenant_id, t.priority),
    index('idx_ticket_number').on(t.tenant_id, t.ticket_number),
    index('idx_ticket_sla_breached').on(t.tenant_id, t.sla_breached),
  ],
);

// =============================================================================
// ticket_comments
// =============================================================================

export const ticketComments = sqliteTable(
  'ticket_comments',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    ticket_id: text('ticket_id')
      .notNull()
      .references(() => tickets.id),
    author_id: text('author_id')
      .notNull()
      .references(() => users.id),
    content: text('content').notNull(),
    is_internal: integer('is_internal').notNull().default(0),
    source: text('source').notNull().default('agent'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_tc_tenant').on(t.tenant_id),
    index('idx_tc_tenant_ticket').on(t.tenant_id, t.ticket_id),
  ],
);

// =============================================================================
// ticket_history
// =============================================================================

export const ticketHistory = sqliteTable(
  'ticket_history',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    ticket_id: text('ticket_id')
      .notNull()
      .references(() => tickets.id),
    field_changed: text('field_changed').notNull(),
    old_value: text('old_value'),
    new_value: text('new_value'),
    changed_by: text('changed_by').notNull(),
    changed_at: text('changed_at').notNull(),
  },
  (t) => [
    index('idx_th_tenant').on(t.tenant_id),
    index('idx_th_tenant_ticket').on(t.tenant_id, t.ticket_id),
  ],
);
