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
} from '../../lib/errors.js';
import type { RequestUser } from '../../lib/context.js';

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
function getUserTenants(userId: string): TenantInfo[] {
  const rows = db()
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
    )
    .all();

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
  const user = db()
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)
    .get();

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
  const tenantList = getUserTenants(user.id);
  const defaultTenant = resolveDefaultTenant(tenantList);

  if (!defaultTenant) {
    throw new UnauthorizedError(
      'User is not a member of any active tenant',
    );
  }

  // Update last_login timestamp
  const now = new Date().toISOString();
  db()
    .update(users)
    .set({ last_login: now })
    .where(eq(users.id, user.id))
    .run();

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
  };
}

/**
 * Get the current authenticated user with their tenant list.
 */
export async function getMe(userId: string): Promise<GetMeResult> {
  const user = db()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .get();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const tenantList = getUserTenants(user.id);
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
  const user = db()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .get();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify membership in target tenant
  const membership = db()
    .select()
    .from(tenantUserMemberships)
    .where(
      and(
        eq(tenantUserMemberships.user_id, userId),
        eq(tenantUserMemberships.tenant_id, targetTenantId),
      ),
    )
    .limit(1)
    .get();

  if (!membership) {
    throw new ForbiddenError('User is not a member of the target tenant');
  }

  // Verify the tenant is active
  const tenant = db()
    .select()
    .from(tenants)
    .where(
      and(
        eq(tenants.id, targetTenantId),
        eq(tenants.is_active, 1),
      ),
    )
    .limit(1)
    .get();

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

// Re-export uuidv4 for use in other modules (e.g., seed)
export { uuidv4 };
