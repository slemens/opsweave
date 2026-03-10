import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { users } from './users.js';
import { tickets } from './tickets.js';

// =============================================================================
// known_errors (KEDB — Known Error Database)
// =============================================================================

export const knownErrors = sqliteTable(
  'known_errors',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    title: text('title').notNull(),
    symptom: text('symptom').notNull(),
    workaround: text('workaround'),
    root_cause: text('root_cause'),
    status: text('status').notNull().default('identified'), // identified | workaround_available | resolved
    problem_id: text('problem_id').references(() => tickets.id),
    created_by: text('created_by')
      .notNull()
      .references(() => users.id),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_ke_tenant').on(t.tenant_id),
    index('idx_ke_tenant_status').on(t.tenant_id, t.status),
    index('idx_ke_tenant_problem').on(t.tenant_id, t.problem_id),
  ],
);
