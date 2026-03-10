import crypto from 'node:crypto';
import { eq, and, count, like, or, asc, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  users,
  tenantUserMemberships,
  assigneeGroups,
  userGroupMemberships,
} from '../../db/schema/index.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../lib/errors.js';
import logger from '../../lib/logger.js';
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

// ─── CSV Bulk Import ─────────────────────────────────────

/** Result of a single row import attempt. */
interface ImportRowError {
  row: number;
  email: string;
  message: string;
}

/** Successfully imported user (with temporary password). */
interface ImportedUser {
  email: string;
  display_name: string;
  role: string;
  temporaryPassword: string;
}

/** Overall result of a bulk import operation. */
export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: ImportRowError[];
  users: ImportedUser[];
}

/** Validated CSV row. */
interface ParsedCsvRow {
  email: string;
  display_name: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  group?: string;
}

/**
 * Parse a CSV string into rows of field arrays.
 * Handles basic quoting: fields wrapped in double quotes can contain commas.
 * Double-double-quotes ("") inside quoted fields are unescaped to a single quote.
 */
function parseCsv(raw: string): string[][] {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  return lines.map((line) => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;

      if (inQuotes) {
        if (ch === '"') {
          // Check for escaped quote ("")
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // skip next quote
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }

    fields.push(current.trim());
    return fields;
  });
}

const VALID_ROLES = new Set(['admin', 'manager', 'agent', 'viewer']);

/**
 * Validate a parsed CSV row.
 * Returns the parsed row or a string error message.
 */
function validateRow(
  fields: string[],
  headerMap: Map<string, number>,
): ParsedCsvRow | string {
  const emailIdx = headerMap.get('email');
  const nameIdx = headerMap.get('display_name');
  const roleIdx = headerMap.get('role');
  const groupIdx = headerMap.get('group');

  if (emailIdx === undefined || nameIdx === undefined) {
    return 'Missing required columns: email, display_name';
  }

  const email = fields[emailIdx]?.trim() ?? '';
  const displayName = fields[nameIdx]?.trim() ?? '';
  const roleRaw = (roleIdx !== undefined ? fields[roleIdx]?.trim() : '') ?? '';
  const group = (groupIdx !== undefined ? fields[groupIdx]?.trim() : '') ?? '';

  // Validate email (basic pattern)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return `Invalid email: "${email}"`;
  }

  if (!displayName || displayName.length < 2) {
    return `Display name must be at least 2 characters: "${displayName}"`;
  }

  const role = roleRaw || 'agent';
  if (!VALID_ROLES.has(role)) {
    return `Invalid role: "${role}" (must be admin, manager, agent, or viewer)`;
  }

  return {
    email,
    display_name: displayName,
    role: role as ParsedCsvRow['role'],
    group: group || undefined,
  };
}

/**
 * Generate a cryptographically random password.
 */
function generatePassword(length: number = 16): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

/**
 * Bulk-import users from a parsed CSV string.
 *
 * - Validates each row with Zod-like checks
 * - Checks email uniqueness
 * - Resolves group names to IDs (tenant-scoped)
 * - Generates random passwords and hashes them
 * - Aborts if more than 5 errors are encountered
 * - All inserts happen in a single transaction
 */
export async function importUsers(
  tenantId: string,
  csvRaw: string,
): Promise<BulkImportResult> {
  const d = db();

  // Parse CSV
  const rows = parseCsv(csvRaw);

  if (rows.length < 2) {
    throw new ValidationError('CSV must contain a header row and at least one data row');
  }

  // Build header map from first row
  const headerRow = rows[0]!;
  const headerMap = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const col = headerRow[i]!.toLowerCase().trim();
    headerMap.set(col, i);
  }

  if (!headerMap.has('email') || !headerMap.has('display_name')) {
    throw new ValidationError(
      'CSV header must include at least "email" and "display_name" columns',
    );
  }

  const dataRows = rows.slice(1);
  const errors: ImportRowError[] = [];
  const validRows: { row: number; data: ParsedCsvRow }[] = [];

  // Validate all rows first
  for (let i = 0; i < dataRows.length; i++) {
    const fields = dataRows[i]!;
    const result = validateRow(fields, headerMap);

    if (typeof result === 'string') {
      errors.push({ row: i + 2, email: fields[headerMap.get('email') ?? 0] ?? '', message: result });
    } else {
      validRows.push({ row: i + 2, data: result });
    }

    if (errors.length > 5) {
      throw new ValidationError(
        `Too many errors in CSV (${errors.length}), aborting import`,
        { errors: errors as unknown as Record<string, unknown> },
      );
    }
  }

  if (errors.length > 5) {
    throw new ValidationError(
      `Too many errors in CSV (${errors.length}), aborting import`,
      { errors: errors as unknown as Record<string, unknown> },
    );
  }

  // Pre-fetch existing emails to check uniqueness
  const existingEmails = new Set<string>();
  const existingUsers = await d
    .select({ email: users.email })
    .from(users);
  for (const row of existingUsers) {
    existingEmails.add(row.email.toLowerCase());
  }

  // Pre-fetch groups in this tenant for name-based lookup
  const tenantGroups = await d
    .select({ id: assigneeGroups.id, name: assigneeGroups.name })
    .from(assigneeGroups)
    .where(eq(assigneeGroups.tenant_id, tenantId));

  const groupNameMap = new Map<string, string>();
  for (const g of tenantGroups) {
    groupNameMap.set(g.name.toLowerCase(), g.id);
  }

  // Process valid rows — check uniqueness, resolve groups
  const toInsert: {
    row: number;
    data: ParsedCsvRow;
    password: string;
    groupId: string | null;
  }[] = [];

  for (const { row, data } of validRows) {
    if (existingEmails.has(data.email.toLowerCase())) {
      errors.push({ row, email: data.email, message: 'Email already exists' });
      if (errors.length > 5) {
        throw new ValidationError(
          `Too many errors in CSV (${errors.length}), aborting import`,
          { errors: errors as unknown as Record<string, unknown> },
        );
      }
      continue;
    }

    let groupId: string | null = null;
    if (data.group) {
      groupId = groupNameMap.get(data.group.toLowerCase()) ?? null;
      if (!groupId) {
        errors.push({
          row,
          email: data.email,
          message: `Group not found: "${data.group}"`,
        });
        if (errors.length > 5) {
          throw new ValidationError(
            `Too many errors in CSV (${errors.length}), aborting import`,
            { errors: errors as unknown as Record<string, unknown> },
          );
        }
        continue;
      }
    }

    // Mark email as taken (to catch duplicates within the CSV itself)
    existingEmails.add(data.email.toLowerCase());

    toInsert.push({
      row,
      data,
      password: generatePassword(),
      groupId,
    });
  }

  if (errors.length > 5) {
    throw new ValidationError(
      `Too many errors in CSV (${errors.length}), aborting import`,
      { errors: errors as unknown as Record<string, unknown> },
    );
  }

  if (toInsert.length === 0) {
    return { imported: 0, skipped: errors.length, errors, users: [] };
  }

  // Hash all passwords in parallel
  const hashedPasswords = await Promise.all(
    toInsert.map((item) => bcrypt.hash(item.password, BCRYPT_ROUNDS)),
  );

  const now = new Date().toISOString();
  const importedUsers: ImportedUser[] = [];

  // Insert all users in a transaction
  await d.transaction(async (tx) => {
    for (let i = 0; i < toInsert.length; i++) {
      const item = toInsert[i]!;
      const passwordHash = hashedPasswords[i]!;
      const userId = uuidv4();

      await tx.insert(users).values({
        id: userId,
        email: item.data.email,
        display_name: item.data.display_name,
        password_hash: passwordHash,
        auth_provider: 'local',
        language: 'de',
        is_active: 1,
        is_superadmin: 0,
        created_at: now,
      });

      await tx.insert(tenantUserMemberships).values({
        tenant_id: tenantId,
        user_id: userId,
        role: item.data.role,
        is_default: 1,
      });

      if (item.groupId) {
        await tx.insert(userGroupMemberships).values({
          user_id: userId,
          group_id: item.groupId,
          tenant_id: tenantId,
          role_in_group: 'member',
        });
      }

      importedUsers.push({
        email: item.data.email,
        display_name: item.data.display_name,
        role: item.data.role,
        temporaryPassword: item.password,
      });
    }
  });

  logger.info(
    { tenantId, imported: importedUsers.length, skipped: errors.length },
    'Bulk user import completed',
  );

  return {
    imported: importedUsers.length,
    skipped: errors.length,
    errors,
    users: importedUsers,
  };
}
