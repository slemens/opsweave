import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// =============================================================================
// system_settings — Global settings, NO tenant_id
// =============================================================================

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default('{}'),
  updated_at: text('updated_at'),
  updated_by: text('updated_by'),
});
