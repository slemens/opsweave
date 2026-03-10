import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../../config/index.js';
import { getDb, type TypedDb } from '../../config/database.js';
import { users, tenants, tenantUserMemberships } from '../../db/schema/index.js';
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../lib/errors.js';
import type { RequestUser } from '../../lib/context.js';
import {
  validatePassword,
  isPasswordInHistory,
  isPasswordExpired,
  parsePolicyFromSettings,
} from '../../lib/password-policy.js';

// ─── Constants ──────────────────────────────────────────────

const BCRYPT_SALT_ROUNDS = 12;

// ─── JWT Payload ────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
  activeTenantId: string;
  role: RequestUser['role'];
  isSuperAdmin: boolean;
}

// ─── Response Types ─────────────────────────────────────────

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  isDefault: boolean;
}

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  language: string;
  isSuperAdmin: boolean;
  activeTenantId: string;
  role: string;
}

interface LoginResult {
  user: UserInfo;
  token: string;
  tenants: TenantInfo[];
  passwordExpired: boolean;
}

interface SwitchTenantResult {
  token: string;
  activeTenantId: string;
  role: string;
}

interface GetMeResult {
  user: UserInfo;
  tenants: TenantInfo[];
}

// ─── DB Helper ──────────────────────────────────────────────

/**
 * Returns the Drizzle instance cast to TypedDb.
 * Both PG and SQLite drivers share the same query-builder API at runtime;
 * the cast resolves the TypeScript union-type ambiguity for method calls.
 */
function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Password Helpers ───────────────────────────────────────

/**
 * Hash a plaintext password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Token Helpers ──────────────────────────────────────────

/**
 * Generate a signed JWT with the given payload.
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

// ─── Internal Helpers ───────────────────────────────────────

/**
 * Get all tenant memberships for a user, with tenant details.
 */
async function getUserTenants(userId: string): Promise<TenantInfo[]> {
  const rows = await db()
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      role: tenantUserMemberships.role,
      isDefault: tenantUserMemberships.is_default,
    })
    .from(tenantUserMemberships)
    .innerJoin(tenants, eq(tenantUserMemberships.tenant_id, tenants.id))
    .where(
      and(
        eq(tenantUserMemberships.user_id, userId),
        eq(tenants.is_active, 1),
      ),
    );

  return rows.map((r) => ({
    id: r.tenantId,
    name: r.tenantName,
    slug: r.tenantSlug,
    role: r.role,
    isDefault: r.isDefault === 1,
  }));
}

/**
 * Find the default tenant for a user, or the first available one.
 */
function resolveDefaultTenant(
  tenantList: TenantInfo[],
): { tenantId: string; role: string } | null {
  if (tenantList.length === 0) return null;

  // Prefer the explicitly marked default
  const defaultTenant = tenantList.find((t) => t.isDefault);
  if (defaultTenant) {
    return { tenantId: defaultTenant.id, role: defaultTenant.role };
  }

  // Fall back to first tenant
  const first = tenantList[0];
  if (!first) return null;
  return { tenantId: first.id, role: first.role };
}

// ─── Service Functions ──────────────────────────────────────

/**
 * Authenticate a user by email and password.
 * Returns user info, JWT token, and list of tenants.
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  // Find user by email
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check account is active
  if (user.is_active !== 1) {
    throw new UnauthorizedError('Account is deactivated');
  }

  // Verify password (only for local auth)
  if (user.auth_provider !== 'local') {
    throw new UnauthorizedError(
      'This account uses external authentication. Please use the SSO login.',
    );
  }

  if (!user.password_hash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Get tenant memberships
  const tenantList = await getUserTenants(user.id);
  const defaultTenant = resolveDefaultTenant(tenantList);

  if (!defaultTenant) {
    throw new UnauthorizedError(
      'User is not a member of any active tenant',
    );
  }

  // Check password expiry against tenant's policy
  const [tenantRow] = await db()
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, defaultTenant.tenantId))
    .limit(1);

  let passwordExpired = false;
  if (tenantRow) {
    let tenantSettings: Record<string, unknown> = {};
    try { tenantSettings = JSON.parse(tenantRow.settings) as Record<string, unknown>; } catch { /* empty */ }
    const policy = parsePolicyFromSettings(tenantSettings);
    passwordExpired = isPasswordExpired(user.password_changed_at, policy);
  }

  // Update last_login timestamp
  const now = new Date().toISOString();
  await db()
    .update(users)
    .set({ last_login: now })
    .where(eq(users.id, user.id));

  // Generate JWT
  const token = generateToken({
    sub: user.id,
    email: user.email,
    displayName: user.display_name,
    activeTenantId: defaultTenant.tenantId,
    role: defaultTenant.role as RequestUser['role'],
    isSuperAdmin: user.is_superadmin === 1,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      language: user.language,
      isSuperAdmin: user.is_superadmin === 1,
      activeTenantId: defaultTenant.tenantId,
      role: defaultTenant.role,
    },
    token,
    tenants: tenantList,
    passwordExpired,
  };
}

/**
 * Get the current authenticated user with their tenant list.
 */
export async function getMe(userId: string): Promise<GetMeResult> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const tenantList = await getUserTenants(user.id);
  const defaultTenant = resolveDefaultTenant(tenantList);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      language: user.language,
      isSuperAdmin: user.is_superadmin === 1,
      activeTenantId: defaultTenant?.tenantId ?? '',
      role: defaultTenant?.role ?? 'viewer',
    },
    tenants: tenantList,
  };
}

/**
 * Switch the active tenant for a user.
 * Verifies the user is a member of the target tenant,
 * then returns a new JWT with the updated activeTenantId and role.
 */
export async function switchTenant(
  userId: string,
  targetTenantId: string,
): Promise<SwitchTenantResult> {
  // Verify user exists
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify membership in target tenant
  const [membership] = await db()
    .select()
    .from(tenantUserMemberships)
    .where(
      and(
        eq(tenantUserMemberships.user_id, userId),
        eq(tenantUserMemberships.tenant_id, targetTenantId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new ForbiddenError('User is not a member of the target tenant');
  }

  // Verify the tenant is active
  const [tenant] = await db()
    .select()
    .from(tenants)
    .where(
      and(
        eq(tenants.id, targetTenantId),
        eq(tenants.is_active, 1),
      ),
    )
    .limit(1);

  if (!tenant) {
    throw new NotFoundError('Tenant not found or inactive');
  }

  // Generate new JWT with updated tenant context
  const role = membership.role as RequestUser['role'];

  const token = generateToken({
    sub: user.id,
    email: user.email,
    displayName: user.display_name,
    activeTenantId: targetTenantId,
    role,
    isSuperAdmin: user.is_superadmin === 1,
  });

  return {
    token,
    activeTenantId: targetTenantId,
    role: membership.role,
  };
}

/**
 * Change a user's password.
 * Validates against the tenant's password policy, checks history,
 * and updates password_hash, password_changed_at, password_history.
 */
export async function changePassword(
  userId: string,
  tenantId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.password_hash) {
    throw new ForbiddenError('Cannot change password for external auth accounts');
  }

  // Verify current password
  const currentValid = await verifyPassword(currentPassword, user.password_hash);
  if (!currentValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Load tenant's password policy
  const [tenantRow] = await db()
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  let tenantSettings: Record<string, unknown> = {};
  if (tenantRow) {
    try { tenantSettings = JSON.parse(tenantRow.settings) as Record<string, unknown>; } catch { /* empty */ }
  }
  const policy = parsePolicyFromSettings(tenantSettings);

  // Validate new password against policy
  const violations = validatePassword(newPassword, policy);
  if (violations.length > 0) {
    throw new ValidationError(violations[0]!.message, {
      violations: violations as unknown as Record<string, unknown>,
    });
  }

  // Check password history
  if (policy.history_count > 0) {
    let historyHashes: string[] = [];
    try {
      historyHashes = JSON.parse(user.password_history) as string[];
    } catch { /* empty */ }

    const inHistory = await isPasswordInHistory(newPassword, historyHashes);
    if (inHistory) {
      throw new ValidationError(
        `Password was used recently. Choose a password not used in the last ${policy.history_count} changes.`,
      );
    }
  }

  // Hash new password
  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  // Update password history
  let historyHashes: string[] = [];
  try {
    historyHashes = JSON.parse(user.password_history) as string[];
  } catch { /* empty */ }

  // Add current hash to history (before replacing it)
  historyHashes.unshift(user.password_hash);
  // Trim to policy limit
  if (policy.history_count > 0) {
    historyHashes = historyHashes.slice(0, policy.history_count);
  } else {
    historyHashes = [];
  }

  await db()
    .update(users)
    .set({
      password_hash: newHash,
      password_changed_at: now,
      password_history: JSON.stringify(historyHashes),
    })
    .where(eq(users.id, userId));
}

/**
 * Get the password policy for a tenant (parsed from settings).
 */
export async function getPasswordPolicy(tenantId: string) {
  const [tenantRow] = await db()
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  let tenantSettings: Record<string, unknown> = {};
  if (tenantRow) {
    try { tenantSettings = JSON.parse(tenantRow.settings) as Record<string, unknown>; } catch { /* empty */ }
  }

  return parsePolicyFromSettings(tenantSettings);
}

// Re-export uuidv4 for use in other modules (e.g., seed)
export { uuidv4 };
