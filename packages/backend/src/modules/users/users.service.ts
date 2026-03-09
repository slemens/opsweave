import { eq, and, count, like, or, asc, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  users,
  tenantUserMemberships,
} from '../../db/schema/index.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../lib/errors.js';
import type { PaginationParams } from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  auth_provider: string;
  external_id: string | null;
  language: string;
  is_active: number;
  is_superadmin: number;
  last_login: string | null;
  created_at: string;
}

interface UserWithRole extends UserRow {
  role: string;
}

interface CreateUserData {
  email: string;
  display_name: string;
  password?: string;
  language?: string;
  role?: string;
}

interface UpdateUserData {
  display_name?: string;
  email?: string;
  language?: string;
  is_active?: boolean;
}

// ─── Service ──────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

/**
 * List users that belong to a specific tenant.
 */
export async function listUsers(
  tenantId: string,
  params: PaginationParams,
): Promise<{ users: UserWithRole[]; total: number }> {
  const d = db();
  const { page, limit, q, sort, order } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(tenantUserMemberships.tenant_id, tenantId)];

  if (q) {
    conditions.push(
      or(
        like(users.display_name, `%${q}%`),
        like(users.email, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(users)
    .innerJoin(
      tenantUserMemberships,
      eq(users.id, tenantUserMemberships.user_id),
    )
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn = sort === 'email' ? users.email
    : sort === 'display_name' ? users.display_name
    : users.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select({
      id: users.id,
      email: users.email,
      display_name: users.display_name,
      auth_provider: users.auth_provider,
      external_id: users.external_id,
      language: users.language,
      is_active: users.is_active,
      is_superadmin: users.is_superadmin,
      last_login: users.last_login,
      created_at: users.created_at,
      role: tenantUserMemberships.role,
    })
    .from(users)
    .innerJoin(
      tenantUserMemberships,
      eq(users.id, tenantUserMemberships.user_id),
    )
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return { users: rows, total };
}

/**
 * Get a single user with their role in the specified tenant.
 */
export async function getUser(
  tenantId: string,
  userId: string,
): Promise<UserWithRole> {
  const d = db();

  const rows = await d
    .select({
      id: users.id,
      email: users.email,
      display_name: users.display_name,
      auth_provider: users.auth_provider,
      external_id: users.external_id,
      language: users.language,
      is_active: users.is_active,
      is_superadmin: users.is_superadmin,
      last_login: users.last_login,
      created_at: users.created_at,
      role: tenantUserMemberships.role,
    })
    .from(users)
    .innerJoin(
      tenantUserMemberships,
      eq(users.id, tenantUserMemberships.user_id),
    )
    .where(
      and(
        eq(users.id, userId),
        eq(tenantUserMemberships.tenant_id, tenantId),
      ),
    );

  const user = rows[0];
  if (!user) {
    throw new NotFoundError('User not found in this tenant');
  }

  return user;
}

/**
 * Create a new user and add them to the specified tenant.
 */
export async function createUser(
  tenantId: string,
  data: CreateUserData,
  _creatorId: string,
): Promise<UserWithRole> {
  const d = db();

  // Check for duplicate email
  const existing = await d
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('A user with this email already exists');
  }

  const now = new Date().toISOString();
  const userId = uuidv4();
  const role = data.role ?? 'agent';

  const passwordHash = data.password
    ? await bcrypt.hash(data.password, BCRYPT_ROUNDS)
    : null;

  await d.insert(users).values({
    id: userId,
    email: data.email,
    display_name: data.display_name,
    password_hash: passwordHash,
    auth_provider: 'local',
    language: data.language ?? 'de',
    is_active: 1,
    is_superadmin: 0,
    created_at: now,
  });

  await d.insert(tenantUserMemberships).values({
    tenant_id: tenantId,
    user_id: userId,
    role,
    is_default: 1,
  });

  return {
    id: userId,
    email: data.email,
    display_name: data.display_name,
    auth_provider: 'local',
    external_id: null,
    language: data.language ?? 'de',
    is_active: 1,
    is_superadmin: 0,
    last_login: null,
    created_at: now,
    role,
  };
}

/**
 * Update a user's profile fields.
 */
export async function updateUser(
  userId: string,
  data: UpdateUserData,
): Promise<UserRow> {
  const d = db();

  const updateSet: Record<string, unknown> = {};

  if (data.display_name !== undefined) {
    updateSet['display_name'] = data.display_name;
  }
  if (data.email !== undefined) {
    const existing = await d
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing.length > 0 && existing[0]!.id !== userId) {
      throw new ConflictError('A user with this email already exists');
    }

    updateSet['email'] = data.email;
  }
  if (data.language !== undefined) {
    updateSet['language'] = data.language;
  }
  if (data.is_active !== undefined) {
    updateSet['is_active'] = data.is_active ? 1 : 0;
  }

  if (Object.keys(updateSet).length === 0) {
    const existing = await d
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError('User not found');
    }
    return existing[0];
  }

  const updated = await d
    .update(users)
    .set(updateSet)
    .where(eq(users.id, userId))
    .returning();

  if (!updated[0]) {
    throw new NotFoundError('User not found');
  }

  return updated[0];
}

/**
 * Remove a user from a tenant (does NOT delete the user row).
 */
export async function deleteUser(
  tenantId: string,
  userId: string,
): Promise<void> {
  const d = db();

  const membership = await d
    .select({ user_id: tenantUserMemberships.user_id })
    .from(tenantUserMemberships)
    .where(
      and(
        eq(tenantUserMemberships.tenant_id, tenantId),
        eq(tenantUserMemberships.user_id, userId),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    throw new NotFoundError('User is not a member of this tenant');
  }

  await d
    .delete(tenantUserMemberships)
    .where(
      and(
        eq(tenantUserMemberships.tenant_id, tenantId),
        eq(tenantUserMemberships.user_id, userId),
      ),
    );
}

/**
 * Update a user's language preference.
 */
export async function updateLanguage(
  userId: string,
  language: string,
): Promise<void> {
  const d = db();

  const updated = await d
    .update(users)
    .set({ language })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (updated.length === 0) {
    throw new NotFoundError('User not found');
  }
}

/**
 * Count users in a tenant. Used for license limit checks.
 */
export async function countUsersInTenant(tenantId: string): Promise<number> {
  const d = db();

  const [result] = await d
    .select({ count: count() })
    .from(tenantUserMemberships)
    .where(eq(tenantUserMemberships.tenant_id, tenantId));

  return result?.count ?? 0;
}

/**
 * Check whether a user can perform self-edit operations.
 */
export function assertCanEditUser(
  requestUserId: string,
  targetUserId: string,
  requestUserRole: string,
): void {
  if (requestUserId !== targetUserId && requestUserRole !== 'admin') {
    throw new ForbiddenError('You can only edit your own profile');
  }
}
