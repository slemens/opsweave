import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { tenants, tenantUserMemberships, users } from '../../db/schema/index.js';
import {
  NotFoundError,
  ConflictError,
} from '../../lib/errors.js';
import type { Tenant, TenantRole } from '@opsweave/shared';

// ─── Response Types ─────────────────────────────────────────

interface TenantMemberInfo {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  isDefault: boolean;
}

// ─── DB Helper ──────────────────────────────────────────────

/**
 * Returns the Drizzle instance cast to TypedDb.
 * Resolves the TypeScript union-type ambiguity for method calls.
 */
function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from a name.
 * Converts to lowercase, replaces spaces/special chars with hyphens,
 * removes consecutive hyphens.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Map a raw DB tenant row to the API response shape.
 * Parses the JSON settings field.
 */
function mapTenantRow(row: typeof tenants.$inferSelect): Tenant {
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(row.settings) as Record<string, unknown>;
  } catch {
    // Invalid JSON — keep empty object
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    settings,
    license_key: row.license_key,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── Service Functions ──────────────────────────────────────

/**
 * List all tenants. Only accessible by super-admins.
 */
export function listTenants(): Tenant[] {
  const rows = db().select().from(tenants).all();
  return rows.map(mapTenantRow);
}

/**
 * Get a single tenant by ID.
 */
export function getTenant(id: string): Tenant {
  const tenant = db()
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1)
    .get();

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  return mapTenantRow(tenant);
}

/**
 * Create a new tenant.
 * Generates slug from name if not explicitly provided.
 */
export function createTenant(data: {
  name: string;
  slug?: string;
  settings?: Record<string, unknown>;
}): Tenant {
  const id = uuidv4();
  const now = new Date().toISOString();
  const slug = data.slug ?? slugify(data.name);

  // Check slug uniqueness
  const existing = db()
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1)
    .get();

  if (existing) {
    throw new ConflictError('A tenant with this slug already exists', {
      slug,
    });
  }

  const settingsJson = JSON.stringify(data.settings ?? {});

  const result = db()
    .insert(tenants)
    .values({
      id,
      name: data.name,
      slug,
      settings: settingsJson,
      is_active: 1,
      created_at: now,
      updated_at: now,
    })
    .returning()
    .get();

  if (!result) {
    throw new Error('Failed to create tenant');
  }

  return mapTenantRow(result);
}

/**
 * Update a tenant.
 */
export function updateTenant(
  id: string,
  data: {
    name?: string;
    slug?: string;
    settings?: Record<string, unknown>;
    is_active?: boolean;
  },
): Tenant {
  // Verify tenant exists
  const existing = db()
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1)
    .get();

  if (!existing) {
    throw new NotFoundError('Tenant not found');
  }

  // If slug is changing, check uniqueness
  if (data.slug) {
    const slugConflict = db()
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, data.slug))
      .limit(1)
      .get();

    if (slugConflict && slugConflict.id !== id) {
      throw new ConflictError('A tenant with this slug already exists', {
        slug: data.slug,
      });
    }
  }

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    updated_at: now,
  };

  if (data.name !== undefined) {
    updateData['name'] = data.name;
  }
  if (data.slug !== undefined) {
    updateData['slug'] = data.slug;
  }
  if (data.settings !== undefined) {
    updateData['settings'] = JSON.stringify(data.settings);
  }
  if (data.is_active !== undefined) {
    updateData['is_active'] = data.is_active ? 1 : 0;
  }

  const result = db()
    .update(tenants)
    .set(updateData)
    .where(eq(tenants.id, id))
    .returning()
    .get();

  if (!result) {
    throw new Error('Failed to update tenant');
  }

  return mapTenantRow(result);
}

/**
 * List all members of a tenant with their user details and roles.
 */
export function listTenantMembers(
  tenantId: string,
): TenantMemberInfo[] {
  // Verify tenant exists
  const tenant = db()
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)
    .get();

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  const rows = db()
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.display_name,
      role: tenantUserMemberships.role,
      isDefault: tenantUserMemberships.is_default,
    })
    .from(tenantUserMemberships)
    .innerJoin(users, eq(tenantUserMemberships.user_id, users.id))
    .where(eq(tenantUserMemberships.tenant_id, tenantId))
    .all();

  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    displayName: r.displayName,
    role: r.role,
    isDefault: r.isDefault === 1,
  }));
}

/**
 * Add a user to a tenant with a specific role.
 */
export function addTenantMember(
  tenantId: string,
  userId: string,
  role: TenantRole,
): void {
  // Verify tenant exists
  const tenant = db()
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)
    .get();

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // Verify user exists
  const user = db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .get();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if already a member
  const existingMembership = db()
    .select()
    .from(tenantUserMemberships)
    .where(
      and(
        eq(tenantUserMemberships.tenant_id, tenantId),
        eq(tenantUserMemberships.user_id, userId),
      ),
    )
    .limit(1)
    .get();

  if (existingMembership) {
    throw new ConflictError('User is already a member of this tenant');
  }

  // Check if this is the user's first tenant membership — make it default
  const anyExisting = db()
    .select()
    .from(tenantUserMemberships)
    .where(eq(tenantUserMemberships.user_id, userId))
    .limit(1)
    .get();

  const isDefault = anyExisting ? 0 : 1;

  db()
    .insert(tenantUserMemberships)
    .values({
      tenant_id: tenantId,
      user_id: userId,
      role,
      is_default: isDefault,
    })
    .run();
}

/**
 * Return the raw license_key string for a tenant.
 * Returns null when the tenant has no Enterprise license set.
 * Used by the license middleware via licenseKeyFn callbacks.
 */
export async function getTenantLicenseKey(tenantId: string): Promise<string | null> {
  const row = db()
    .select({ license_key: tenants.license_key })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)
    .get();

  return row?.license_key ?? null;
}

/**
 * Remove a user from a tenant.
 */
export function removeTenantMember(
  tenantId: string,
  userId: string,
): void {
  // Verify the membership exists
  const membership = db()
    .select()
    .from(tenantUserMemberships)
    .where(
      and(
        eq(tenantUserMemberships.tenant_id, tenantId),
        eq(tenantUserMemberships.user_id, userId),
      ),
    )
    .limit(1)
    .get();

  if (!membership) {
    throw new NotFoundError(
      'User is not a member of this tenant',
    );
  }

  const wasDefault = membership.is_default === 1;

  // Delete the membership
  db()
    .delete(tenantUserMemberships)
    .where(
      and(
        eq(tenantUserMemberships.tenant_id, tenantId),
        eq(tenantUserMemberships.user_id, userId),
      ),
    )
    .run();

  // If the removed membership was the default, promote another one
  if (wasDefault) {
    const remaining = db()
      .select()
      .from(tenantUserMemberships)
      .where(eq(tenantUserMemberships.user_id, userId))
      .limit(1)
      .get();

    if (remaining) {
      db()
        .update(tenantUserMemberships)
        .set({ is_default: 1 })
        .where(
          and(
            eq(tenantUserMemberships.tenant_id, remaining.tenant_id),
            eq(tenantUserMemberships.user_id, userId),
          ),
        )
        .run();
    }
  }
}
