import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';

// =============================================================================
// users — NO tenant_id (tenant association via tenant_user_memberships)
// =============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  display_name: text('display_name').notNull(),
  password_hash: text('password_hash'),
  auth_provider: text('auth_provider').notNull().default('local'),
  external_id: text('external_id'),
  language: text('language').notNull().default('de'),
  is_active: integer('is_active').notNull().default(1),
  is_superadmin: integer('is_superadmin').notNull().default(0),
  last_login: text('last_login'),
  password_changed_at: text('password_changed_at'),
  password_history: text('password_history').notNull().default('[]'),
  created_at: text('created_at').notNull(),
});

// =============================================================================
// tenant_user_memberships
// =============================================================================

export const tenantUserMemberships = sqliteTable(
  'tenant_user_memberships',
  {
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').notNull().default('viewer'),
    is_default: integer('is_default').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.tenant_id, t.user_id] }),
    index('idx_tum_tenant').on(t.tenant_id),
    index('idx_tum_user').on(t.user_id),
  ],
);

// =============================================================================
// assignee_groups
// =============================================================================

export const assigneeGroups = sqliteTable(
  'assignee_groups',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description'),
    group_type: text('group_type').notNull().default('support'),
    parent_group_id: text('parent_group_id'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_ag_tenant').on(t.tenant_id),
    index('idx_ag_tenant_type').on(t.tenant_id, t.group_type),
  ],
);

// =============================================================================
// user_group_memberships
// =============================================================================

export const userGroupMemberships = sqliteTable(
  'user_group_memberships',
  {
    user_id: text('user_id')
      .notNull()
      .references(() => users.id),
    group_id: text('group_id')
      .notNull()
      .references(() => assigneeGroups.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    role_in_group: text('role_in_group').notNull().default('member'),
  },
  (t) => [
    primaryKey({ columns: [t.user_id, t.group_id] }),
    index('idx_ugm_tenant').on(t.tenant_id),
    index('idx_ugm_user').on(t.user_id),
    index('idx_ugm_group').on(t.group_id),
  ],
);
