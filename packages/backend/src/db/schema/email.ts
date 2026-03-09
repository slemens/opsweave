import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { assigneeGroups } from './users.js';
import { tickets } from './tickets.js';

// =============================================================================
// email_inbound_configs
// =============================================================================

export const emailInboundConfigs = sqliteTable(
  'email_inbound_configs',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    provider: text('provider').notNull(),
    config: text('config').notNull().default('{}'),
    target_group_id: text('target_group_id').references(() => assigneeGroups.id),
    default_ticket_type: text('default_ticket_type').notNull().default('incident'),
    is_active: integer('is_active').notNull().default(1),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_eic_tenant').on(t.tenant_id),
    index('idx_eic_tenant_active').on(t.tenant_id, t.is_active),
  ],
);

// =============================================================================
// email_messages
// =============================================================================

export const emailMessages = sqliteTable(
  'email_messages',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    config_id: text('config_id')
      .notNull()
      .references(() => emailInboundConfigs.id),
    message_id: text('message_id').notNull(),
    from_address: text('from_address').notNull(),
    from_name: text('from_name'),
    to_address: text('to_address').notNull(),
    subject: text('subject').notNull(),
    body_text: text('body_text'),
    body_html: text('body_html'),
    headers: text('headers').notNull().default('{}'),
    ticket_id: text('ticket_id').references(() => tickets.id),
    is_reply: integer('is_reply').notNull().default(0),
    thread_reference: text('thread_reference'),
    processed: integer('processed').notNull().default(0),
    received_at: text('received_at').notNull(),
    processed_at: text('processed_at'),
  },
  (t) => [
    index('idx_em_tenant').on(t.tenant_id),
    index('idx_em_tenant_config').on(t.tenant_id, t.config_id),
    index('idx_em_message_id').on(t.message_id),
    index('idx_em_tenant_processed').on(t.tenant_id, t.processed),
    index('idx_em_thread_ref').on(t.thread_reference),
    index('idx_em_tenant_ticket').on(t.tenant_id, t.ticket_id),
  ],
);
