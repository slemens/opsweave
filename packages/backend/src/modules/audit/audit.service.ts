import { eq, and, desc, like, or, count, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { auditLogs, users } from '../../db/schema/index.js';
import logger from '../../lib/logger.js';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

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

// ─── Service ──────────────────────────────────────────────

/**
 * Write an audit log entry.
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

    await d.insert(auditLogs).values({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      actor_email: actorEmail,
      event_type: eventType,
      resource_type: resourceType,
      resource_id: resourceId,
      details: JSON.stringify(details),
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      created_at: now,
    });
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
