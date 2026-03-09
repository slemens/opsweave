import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// =============================================================================
// tenants — Multi-Tenant Foundation (base table, no external FKs)
// =============================================================================

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  settings: text('settings').notNull().default('{}'),
  license_key: text('license_key'),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});
