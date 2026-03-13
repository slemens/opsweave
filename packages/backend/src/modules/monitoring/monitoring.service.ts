import { eq, and, desc, like, sql, count as drizzleCount } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';

import { getDb, type TypedDb } from '../../config/database.js';
import { monitoringSources, monitoringEvents } from '../../db/schema/index.js';
import { NotFoundError, ForbiddenError, LicenseLimitError } from '../../lib/errors.js';
import { COMMUNITY_LIMITS } from '@opsweave/shared';
import logger from '../../lib/logger.js';

function db(): TypedDb {
  return getDb() as TypedDb;
}

// =============================================================================
// Monitoring Sources
// =============================================================================

export interface CreateSourceInput {
  name: string;
  type: string;
  config?: Record<string, unknown>;
  webhook_secret?: string | null;
  is_active?: boolean;
}

export interface UpdateSourceInput {
  name?: string;
  type?: string;
  config?: Record<string, unknown>;
  webhook_secret?: string | null;
  is_active?: boolean;
}

export async function listSources(tenantId: string) {
  return await db()
    .select()
    .from(monitoringSources)
    .where(eq(monitoringSources.tenant_id, tenantId))
    .orderBy(desc(monitoringSources.created_at));
}

export async function getSource(tenantId: string, id: string) {
  const [row] = await db()
    .select()
    .from(monitoringSources)
    .where(and(eq(monitoringSources.id, id), eq(monitoringSources.tenant_id, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError('Monitoring source not found');
  return row;
}

export async function createSource(tenantId: string, input: CreateSourceInput) {
  // License-aware limit check
  const { validateLicenseKey } = await import('../../middleware/license.js');
  const { getTenantLicenseKey } = await import('../tenants/tenants.service.js');
  const licenseKey = await getTenantLicenseKey(tenantId);
  const licensePayload = validateLicenseKey(licenseKey);
  const maxSources = licensePayload?.limits?.maxMonitoringSources ?? COMMUNITY_LIMITS.maxMonitoringSources;

  // -1 = unlimited (Enterprise)
  if (maxSources !== -1) {
    const [countRow] = await db()
      .select({ total: drizzleCount() })
      .from(monitoringSources)
      .where(and(eq(monitoringSources.tenant_id, tenantId), eq(monitoringSources.is_active, 1)));
    const activeCount = countRow?.total ?? 0;
    if (activeCount >= maxSources) {
      throw new LicenseLimitError(
        `Monitoring source limit reached (${maxSources}). Upgrade to Enterprise for unlimited sources.`,
      );
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const webhookSecret = input.webhook_secret ?? crypto.randomBytes(32).toString('hex');

  await db()
    .insert(monitoringSources)
    .values({
      id,
      tenant_id: tenantId,
      name: input.name,
      type: input.type,
      config: JSON.stringify(input.config ?? {}),
      webhook_secret: webhookSecret,
      is_active: input.is_active === false ? 0 : 1,
      created_at: now,
    });

  return getSource(tenantId, id);
}

export async function updateSource(tenantId: string, id: string, input: UpdateSourceInput) {
  const existing = await getSource(tenantId, id);

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.type !== undefined) updates.type = input.type;
  if (input.config !== undefined) updates.config = JSON.stringify(input.config);
  if (input.webhook_secret !== undefined) updates.webhook_secret = input.webhook_secret;
  if (input.is_active !== undefined) updates.is_active = input.is_active ? 1 : 0;

  if (Object.keys(updates).length > 0) {
    await db()
      .update(monitoringSources)
      .set(updates)
      .where(and(eq(monitoringSources.id, existing.id), eq(monitoringSources.tenant_id, tenantId)));
  }

  return getSource(tenantId, id);
}

export async function deleteSource(tenantId: string, id: string) {
  const existing = await getSource(tenantId, id);
  // Soft-delete: deactivate instead of removing
  await db()
    .update(monitoringSources)
    .set({ is_active: 0 })
    .where(and(eq(monitoringSources.id, existing.id), eq(monitoringSources.tenant_id, tenantId)));
}

// =============================================================================
// Monitoring Events
// =============================================================================

export interface EventFilters {
  source_id?: string;
  state?: string;
  hostname?: string;
  from?: string;
  to?: string;
  processed?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function listEvents(tenantId: string, filters: EventFilters) {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 25, 500);
  const offset = (page - 1) * limit;

  const conditions = [eq(monitoringEvents.tenant_id, tenantId)];

  if (filters.source_id) conditions.push(eq(monitoringEvents.source_id, filters.source_id));
  if (filters.state) conditions.push(eq(monitoringEvents.state, filters.state));
  if (filters.hostname) conditions.push(like(monitoringEvents.hostname, `%${filters.hostname}%`));
  if (filters.processed !== undefined) {
    conditions.push(eq(monitoringEvents.processed, filters.processed === 'true' ? 1 : 0));
  }
  if (filters.from) conditions.push(sql`${monitoringEvents.received_at} >= ${filters.from}`);
  if (filters.to) conditions.push(sql`${monitoringEvents.received_at} <= ${filters.to}`);
  if (filters.q) {
    const q = `%${filters.q}%`;
    conditions.push(
      sql`(${monitoringEvents.hostname} LIKE ${q} OR ${monitoringEvents.service_name} LIKE ${q} OR ${monitoringEvents.output} LIKE ${q})`,
    );
  }

  const where = and(...conditions);

  const [countRow2] = await db()
    .select({ total: drizzleCount() })
    .from(monitoringEvents)
    .where(where!);
  const total = countRow2?.total ?? 0;

  const rows = await db()
    .select()
    .from(monitoringEvents)
    .where(where!)
    .orderBy(desc(monitoringEvents.received_at))
    .limit(limit)
    .offset(offset);

  return { data: rows, meta: { total, page, limit } };
}

export async function getEvent(tenantId: string, id: string) {
  const [row] = await db()
    .select()
    .from(monitoringEvents)
    .where(and(eq(monitoringEvents.id, id), eq(monitoringEvents.tenant_id, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError('Monitoring event not found');
  return row;
}

export async function acknowledgeEvent(tenantId: string, id: string) {
  const existing = await getEvent(tenantId, id);
  const now = new Date().toISOString();
  await db()
    .update(monitoringEvents)
    .set({ processed: 1, processed_at: now })
    .where(and(eq(monitoringEvents.id, existing.id), eq(monitoringEvents.tenant_id, tenantId)));
  return getEvent(tenantId, id);
}

// =============================================================================
// Webhook Ingestion
// =============================================================================

export interface WebhookPayload {
  hostname: string;
  service_name?: string;
  state: string;
  output?: string;
  external_id?: string;
}

export async function validateWebhookSecret(sourceId: string, secret: string): Promise<{ tenantId: string; source: typeof monitoringSources.$inferSelect }> {
  const [source] = await db()
    .select()
    .from(monitoringSources)
    .where(eq(monitoringSources.id, sourceId))
    .limit(1);

  if (!source) throw new NotFoundError('Monitoring source not found');
  if (!source.is_active) throw new ForbiddenError('Monitoring source is inactive');

  // Constant-time comparison
  if (!source.webhook_secret || !crypto.timingSafeEqual(
    Buffer.from(source.webhook_secret),
    Buffer.from(secret.padEnd(source.webhook_secret.length).slice(0, source.webhook_secret.length)),
  )) {
    throw new ForbiddenError('Invalid webhook secret');
  }

  return { tenantId: source.tenant_id, source };
}

export async function ingestWebhookEvent(tenantId: string, sourceId: string, payload: WebhookPayload) {
  const id = uuidv4();
  const now = new Date().toISOString();

  // Deduplicate: skip if same hostname+service+state already exists within last 5 minutes
  const [dedup] = await db()
    .select({ id: monitoringEvents.id })
    .from(monitoringEvents)
    .where(
      and(
        eq(monitoringEvents.tenant_id, tenantId),
        eq(monitoringEvents.source_id, sourceId),
        eq(monitoringEvents.hostname, payload.hostname),
        eq(monitoringEvents.state, payload.state),
        payload.service_name
          ? eq(monitoringEvents.service_name, payload.service_name)
          : sql`${monitoringEvents.service_name} IS NULL`,
        sql`${monitoringEvents.received_at} >= datetime('now', '-5 minutes')`,
      ),
    )
    .limit(1);

  if (dedup) {
    logger.debug({ hostname: payload.hostname, state: payload.state }, '[monitoring] Deduplicated event');
    return { deduplicated: true, event_id: dedup.id };
  }

  await db()
    .insert(monitoringEvents)
    .values({
      id,
      tenant_id: tenantId,
      source_id: sourceId,
      external_id: payload.external_id ?? null,
      hostname: payload.hostname,
      service_name: payload.service_name ?? null,
      state: payload.state,
      output: payload.output ?? null,
      processed: 0,
      received_at: now,
    });

  return { deduplicated: false, event_id: id };
}

// =============================================================================
// Event Statistics (for dashboard)
// =============================================================================

export async function getEventStats(tenantId: string) {
  const rows = await db()
    .select({
      state: monitoringEvents.state,
      count: drizzleCount(),
    })
    .from(monitoringEvents)
    .where(
      and(
        eq(monitoringEvents.tenant_id, tenantId),
        // Only count events from the last 24 hours
        sql`${monitoringEvents.received_at} >= datetime('now', '-24 hours')`,
      ),
    )
    .groupBy(monitoringEvents.state);

  const stats: Record<string, number> = { ok: 0, warning: 0, critical: 0, unknown: 0 };
  for (const row of rows) {
    stats[row.state] = row.count;
  }
  return stats;
}
