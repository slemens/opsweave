import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';

// =============================================================================
// customers
// =============================================================================

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    industry: text('industry'),
    contact_email: text('contact_email'),
    is_active: integer('is_active').notNull().default(1),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_cust_tenant').on(t.tenant_id),
  ],
);

// =============================================================================
// customer_portal_users — Separate user table for portal customers
// =============================================================================

export const customerPortalUsers = sqliteTable(
  'customer_portal_users',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    customer_id: text('customer_id')
      .notNull()
      .references(() => customers.id),
    email: text('email').notNull(),
    display_name: text('display_name').notNull(),
    password_hash: text('password_hash').notNull(),
    is_active: integer('is_active').notNull().default(1),
    last_login: text('last_login'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_cpu_tenant').on(t.tenant_id),
    index('idx_cpu_customer').on(t.tenant_id, t.customer_id),
    index('idx_cpu_email').on(t.email),
  ],
);
