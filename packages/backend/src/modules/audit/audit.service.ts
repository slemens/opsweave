import { eq, and, desc, like, or, count, gte, lte, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'node:crypto';

import { getDb, type TypedDb } from '../../config/database.js';
import { auditLogs, users } from '../../db/schema/index.js';
import logger from '../../lib/logger.js';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── State ────────────────────────────────────────────────

/**
 * In-memory cache of the last integrity hash per tenant.
 * Avoids a DB read on every audit log write for hash chaining.
 */
const lastHashCache = new Map<string, string>();

// ─── Types ────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  actor_id: string;
  actor_email: string;
  event_type: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  integrity_hash: string | null;
  created_at: string;
}

export interface AuditLogParams {
  page: number;
  limit: number;
  event_type?: string;
  resource_type?: string;
  actor_id?: string;
  q?: string;
  from?: string;
  to?: string;
}

// ─── Hash Chain ───────────────────────────────────────────

/**
 * Compute SHA-256 integrity hash for an audit log entry.
 * Hash = SHA-256(previousHash + tenantId + actorId + eventType + resourceType + resourceId + details + createdAt)
 */
function computeHash(
  previousHash: string,
  tenantId: string,
  actorId: string,
  eventType: string,
  resourceType: string,
  resourceId: string | null,
  details: string,
  createdAt: string,
): string {
  const payload = [
    previousHash,
    tenantId,
    actorId,
    eventType,
    resourceType,
    resourceId ?? '',
    details,
    createdAt,
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Get the last integrity hash for a tenant (from cache or DB).
 */
async function getLastHash(tenantId: string): Promise<string> {
  const cached = lastHashCache.get(tenantId);
  if (cached) return cached;

  try {
    const d = db();
    const [last] = await d
      .select({ integrity_hash: auditLogs.integrity_hash })
      .from(auditLogs)
      .where(eq(auditLogs.tenant_id, tenantId))
      .orderBy(desc(auditLogs.created_at))
      .limit(1);

    const hash = last?.integrity_hash ?? 'genesis';
    lastHashCache.set(tenantId, hash);
    return hash;
  } catch {
    return 'genesis';
  }
}

// ─── Service ──────────────────────────────────────────────

/**
 * Write an audit log entry with integrity hash chain.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function writeAuditLog(
  tenantId: string,
  actorId: string,
  actorEmail: string,
  eventType: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, unknown>,
  ipAddress?: string | null,
  userAgent?: string | null,
): Promise<void> {
  try {
    const d = db();
    const now = new Date().toISOString();
    const detailsStr = JSON.stringify(details);

    const previousHash = await getLastHash(tenantId);
    const hash = computeHash(previousHash, tenantId, actorId, eventType, resourceType, resourceId, detailsStr, now);

    await d.insert(auditLogs).values({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      actor_email: actorEmail,
      event_type: eventType,
      resource_type: resourceType,
      resource_id: resourceId,
      details: detailsStr,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      integrity_hash: hash,
      created_at: now,
    });

    lastHashCache.set(tenantId, hash);
  } catch (err) {
    logger.error({ err, tenantId, eventType, resourceType }, 'Failed to write audit log');
  }
}

/**
 * List audit log entries with pagination and filters.
 */
export async function listAuditLogs(
  tenantId: string,
  params: AuditLogParams,
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const d = db();
  const { page, limit, event_type, resource_type, actor_id, q, from, to } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(auditLogs.tenant_id, tenantId)];

  if (event_type) {
    conditions.push(eq(auditLogs.event_type, event_type));
  }
  if (resource_type) {
    conditions.push(eq(auditLogs.resource_type, resource_type));
  }
  if (actor_id) {
    conditions.push(eq(auditLogs.actor_id, actor_id));
  }
  if (from) {
    conditions.push(gte(auditLogs.created_at, from));
  }
  if (to) {
    conditions.push(lte(auditLogs.created_at, to));
  }
  if (q) {
    conditions.push(
      or(
        like(auditLogs.actor_email, `%${q}%`),
        like(auditLogs.details, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(auditLogs)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const rows = await d
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.created_at))
    .limit(limit)
    .offset(offset);

  const logs = rows.map((row) => ({
    ...row,
    details: parseJson(row.details),
  }));

  return { logs, total };
}

/**
 * Verify integrity of the audit log hash chain for a tenant.
 * Returns { valid, totalChecked, firstInvalidIndex } where firstInvalidIndex is -1 if all valid.
 */
export async function verifyIntegrity(
  tenantId: string,
): Promise<{ valid: boolean; totalChecked: number; firstInvalidIndex: number }> {
  const d = db();

  const rows = await d
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tenant_id, tenantId))
    .orderBy(asc(auditLogs.created_at));

  let previousHash = 'genesis';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;

    // Skip entries without integrity hash (pre-migration)
    if (!row.integrity_hash) continue;

    const expected = computeHash(
      previousHash,
      row.tenant_id,
      row.actor_id,
      row.event_type,
      row.resource_type,
      row.resource_id,
      row.details,
      row.created_at,
    );

    if (expected !== row.integrity_hash) {
      return { valid: false, totalChecked: i + 1, firstInvalidIndex: i };
    }

    previousHash = row.integrity_hash;
  }

  return { valid: true, totalChecked: rows.length, firstInvalidIndex: -1 };
}

/**
 * Get distinct event types for filtering.
 */
export async function getEventTypes(tenantId: string): Promise<string[]> {
  const d = db();
  const rows = await d
    .selectDistinct({ event_type: auditLogs.event_type })
    .from(auditLogs)
    .where(eq(auditLogs.tenant_id, tenantId));

  return rows.map((r) => r.event_type);
}

/**
 * Get distinct resource types for filtering.
 */
export async function getResourceTypes(tenantId: string): Promise<string[]> {
  const d = db();
  const rows = await d
    .selectDistinct({ resource_type: auditLogs.resource_type })
    .from(auditLogs)
    .where(eq(auditLogs.tenant_id, tenantId));

  return rows.map((r) => r.resource_type);
}

// ─── Helpers ──────────────────────────────────────────────

function parseJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Resolve actor email from user ID.
 * Falls back to "system" for automated actions.
 */
export async function resolveActorEmail(actorId: string): Promise<string> {
  if (actorId === '00000000-0000-0000-0000-000000000000') return 'system';

  try {
    const d = db();
    const [row] = await d
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1);

    return row?.email ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
