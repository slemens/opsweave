import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { users } from './users.js';

// =============================================================================
// notification_preferences
// =============================================================================

export const notificationPreferences = sqliteTable(
  'notification_preferences',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id),
    event_type: text('event_type').notNull(), // ticket_assigned, ticket_status_changed, etc.
    channel: text('channel').notNull().default('email'), // email (later: push, slack)
    enabled: integer('enabled').notNull().default(1), // 0 | 1
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_np_tenant').on(t.tenant_id),
    index('idx_np_tenant_user').on(t.tenant_id, t.user_id),
    index('idx_np_tenant_user_event').on(t.tenant_id, t.user_id, t.event_type, t.channel),
  ],
);
