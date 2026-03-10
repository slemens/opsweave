import { eq, and, count, desc, isNull, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  slaDefinitions,
  slaAssignments,
  serviceDescriptions,
  customers,
  assets,
  tickets,
} from '../../db/schema/index.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

export interface SlaDefinitionRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours: string;
  business_hours_start: string | null;
  business_hours_end: string | null;
  business_days: string;
  priority_overrides: string;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SlaAssignmentRow {
  id: string;
  tenant_id: string;
  sla_definition_id: string;
  service_id: string | null;
  customer_id: string | null;
  asset_id: string | null;
  priority: number;
  created_at: string;
  sla_definition?: SlaDefinitionRow;
  service_name?: string | null;
  customer_name?: string | null;
  asset_name?: string | null;
}

// ─── SLA Definitions CRUD ─────────────────────────────────

export function listSlaDefinitions(tenantId: string): SlaDefinitionRow[] {
  return db()
    .select()
    .from(slaDefinitions)
    .where(eq(slaDefinitions.tenant_id, tenantId))
    .orderBy(desc(slaDefinitions.is_default), slaDefinitions.name)
    .all();
}

export function getSlaDefinition(tenantId: string, id: string): SlaDefinitionRow {
  const row = db()
    .select()
    .from(slaDefinitions)
    .where(and(eq(slaDefinitions.id, id), eq(slaDefinitions.tenant_id, tenantId)))
    .get();
  if (!row) throw new NotFoundError('SLA definition not found');
  return row;
}

export interface CreateSlaDefinitionInput {
  name: string;
  description?: string | null;
  response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours?: string;
  business_hours_start?: string | null;
  business_hours_end?: string | null;
  business_days?: string;
  priority_overrides?: Record<string, unknown>;
  is_default?: boolean;
}

export function createSlaDefinition(
  tenantId: string,
  data: CreateSlaDefinitionInput,
): SlaDefinitionRow {
  const id = uuidv4();
  const now = new Date().toISOString();

  // If marking as default, clear existing default
  if (data.is_default) {
    db()
      .update(slaDefinitions)
      .set({ is_default: 0, updated_at: now })
      .where(and(eq(slaDefinitions.tenant_id, tenantId), eq(slaDefinitions.is_default, 1)))
      .run();
  }

  db()
    .insert(slaDefinitions)
    .values({
      id,
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      response_time_minutes: data.response_time_minutes,
      resolution_time_minutes: data.resolution_time_minutes,
      business_hours: data.business_hours ?? '24/7',
      business_hours_start: data.business_hours_start ?? null,
      business_hours_end: data.business_hours_end ?? null,
      business_days: data.business_days ?? '1,2,3,4,5',
      priority_overrides: JSON.stringify(data.priority_overrides ?? {}),
      is_default: data.is_default ? 1 : 0,
      is_active: 1,
      created_at: now,
      updated_at: now,
    })
    .run();

  return getSlaDefinition(tenantId, id);
}

export interface UpdateSlaDefinitionInput {
  name?: string;
  description?: string | null;
  response_time_minutes?: number;
  resolution_time_minutes?: number;
  business_hours?: string;
  business_hours_start?: string | null;
  business_hours_end?: string | null;
  business_days?: string;
  priority_overrides?: Record<string, unknown>;
  is_default?: boolean;
  is_active?: boolean;
}

export function updateSlaDefinition(
  tenantId: string,
  id: string,
  data: UpdateSlaDefinitionInput,
): SlaDefinitionRow {
  const existing = getSlaDefinition(tenantId, id);
  const now = new Date().toISOString();

  // If marking as default, clear existing default
  if (data.is_default && !existing.is_default) {
    db()
      .update(slaDefinitions)
      .set({ is_default: 0, updated_at: now })
      .where(and(eq(slaDefinitions.tenant_id, tenantId), eq(slaDefinitions.is_default, 1)))
      .run();
  }

  const updateData: Record<string, unknown> = { updated_at: now };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.response_time_minutes !== undefined) updateData.response_time_minutes = data.response_time_minutes;
  if (data.resolution_time_minutes !== undefined) updateData.resolution_time_minutes = data.resolution_time_minutes;
  if (data.business_hours !== undefined) updateData.business_hours = data.business_hours;
  if (data.business_hours_start !== undefined) updateData.business_hours_start = data.business_hours_start;
  if (data.business_hours_end !== undefined) updateData.business_hours_end = data.business_hours_end;
  if (data.business_days !== undefined) updateData.business_days = data.business_days;
  if (data.priority_overrides !== undefined) updateData.priority_overrides = JSON.stringify(data.priority_overrides);
  if (data.is_default !== undefined) updateData.is_default = data.is_default ? 1 : 0;
  if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;

  db()
    .update(slaDefinitions)
    .set(updateData)
    .where(and(eq(slaDefinitions.id, id), eq(slaDefinitions.tenant_id, tenantId)))
    .run();

  return getSlaDefinition(tenantId, id);
}

export function deleteSlaDefinition(tenantId: string, id: string): void {
  getSlaDefinition(tenantId, id); // throws if not found

  // Check for assignments
  const assignmentCount = db()
    .select({ cnt: count() })
    .from(slaAssignments)
    .where(and(eq(slaAssignments.sla_definition_id, id), eq(slaAssignments.tenant_id, tenantId)))
    .get();

  if (assignmentCount && assignmentCount.cnt > 0) {
    throw new ValidationError('Cannot delete SLA definition with active assignments. Remove assignments first.');
  }

  db()
    .delete(slaDefinitions)
    .where(and(eq(slaDefinitions.id, id), eq(slaDefinitions.tenant_id, tenantId)))
    .run();
}

// ─── SLA Assignments CRUD ─────────────────────────────────

export function listSlaAssignments(tenantId: string): SlaAssignmentRow[] {
  const rows = db()
    .select({
      id: slaAssignments.id,
      tenant_id: slaAssignments.tenant_id,
      sla_definition_id: slaAssignments.sla_definition_id,
      service_id: slaAssignments.service_id,
      customer_id: slaAssignments.customer_id,
      asset_id: slaAssignments.asset_id,
      priority: slaAssignments.priority,
      created_at: slaAssignments.created_at,
      sla_name: slaDefinitions.name,
      sla_response: slaDefinitions.response_time_minutes,
      sla_resolution: slaDefinitions.resolution_time_minutes,
      sla_business_hours: slaDefinitions.business_hours,
    })
    .from(slaAssignments)
    .leftJoin(slaDefinitions, eq(slaAssignments.sla_definition_id, slaDefinitions.id))
    .where(eq(slaAssignments.tenant_id, tenantId))
    .orderBy(desc(slaAssignments.priority))
    .all();

  // Enrich with names (service, customer, asset)
  return rows.map((row) => {
    const result: SlaAssignmentRow = {
      id: row.id,
      tenant_id: row.tenant_id,
      sla_definition_id: row.sla_definition_id,
      service_id: row.service_id,
      customer_id: row.customer_id,
      asset_id: row.asset_id,
      priority: row.priority,
      created_at: row.created_at,
    };

    if (row.service_id) {
      const svc = db().select({ title: serviceDescriptions.title }).from(serviceDescriptions).where(eq(serviceDescriptions.id, row.service_id)).get();
      result.service_name = svc?.title ?? null;
    }
    if (row.customer_id) {
      const cust = db().select({ name: customers.name }).from(customers).where(eq(customers.id, row.customer_id)).get();
      result.customer_name = cust?.name ?? null;
    }
    if (row.asset_id) {
      const asset = db().select({ display_name: assets.display_name }).from(assets).where(eq(assets.id, row.asset_id)).get();
      result.asset_name = asset?.display_name ?? null;
    }

    return result;
  });
}

export interface CreateSlaAssignmentInput {
  sla_definition_id: string;
  service_id?: string | null;
  customer_id?: string | null;
  asset_id?: string | null;
}

export function createSlaAssignment(
  tenantId: string,
  data: CreateSlaAssignmentInput,
): SlaAssignmentRow {
  // Validate definition exists
  getSlaDefinition(tenantId, data.sla_definition_id);

  // At least one scope must be set
  if (!data.service_id && !data.customer_id && !data.asset_id) {
    throw new ValidationError('At least one scope (service, customer, or asset) must be set');
  }

  // Calculate priority
  let priority = 0;
  if (data.asset_id) priority = 100;
  else if (data.customer_id && data.service_id) priority = 75;
  else if (data.customer_id) priority = 50;
  else if (data.service_id) priority = 25;

  const id = uuidv4();
  const now = new Date().toISOString();

  db()
    .insert(slaAssignments)
    .values({
      id,
      tenant_id: tenantId,
      sla_definition_id: data.sla_definition_id,
      service_id: data.service_id ?? null,
      customer_id: data.customer_id ?? null,
      asset_id: data.asset_id ?? null,
      priority,
      created_at: now,
    })
    .run();

  return listSlaAssignments(tenantId).find((a) => a.id === id)!;
}

export function deleteSlaAssignment(tenantId: string, id: string): void {
  const existing = db()
    .select()
    .from(slaAssignments)
    .where(and(eq(slaAssignments.id, id), eq(slaAssignments.tenant_id, tenantId)))
    .get();

  if (!existing) throw new NotFoundError('SLA assignment not found');

  db()
    .delete(slaAssignments)
    .where(and(eq(slaAssignments.id, id), eq(slaAssignments.tenant_id, tenantId)))
    .run();
}

// ─── SLA Resolution (for ticket creation) ─────────────────

/**
 * Resolve the effective SLA definition for a ticket context.
 * Priority order: asset > customer+service > customer > service > tenant default
 */
export function resolveEffectiveSla(
  tenantId: string,
  context: { asset_id?: string | null; customer_id?: string | null; service_id?: string | null },
): SlaDefinitionRow | null {
  const d = db();

  // 1. Asset-specific
  if (context.asset_id) {
    const assetSla = d
      .select({ def_id: slaAssignments.sla_definition_id })
      .from(slaAssignments)
      .where(and(
        eq(slaAssignments.tenant_id, tenantId),
        eq(slaAssignments.asset_id, context.asset_id),
      ))
      .orderBy(desc(slaAssignments.priority))
      .get();
    if (assetSla) {
      const def = d.select().from(slaDefinitions).where(and(eq(slaDefinitions.id, assetSla.def_id), eq(slaDefinitions.is_active, 1))).get();
      if (def) return def;
    }
  }

  // 2. Customer + Service
  if (context.customer_id && context.service_id) {
    const combo = d
      .select({ def_id: slaAssignments.sla_definition_id })
      .from(slaAssignments)
      .where(and(
        eq(slaAssignments.tenant_id, tenantId),
        eq(slaAssignments.customer_id, context.customer_id),
        eq(slaAssignments.service_id, context.service_id),
      ))
      .get();
    if (combo) {
      const def = d.select().from(slaDefinitions).where(and(eq(slaDefinitions.id, combo.def_id), eq(slaDefinitions.is_active, 1))).get();
      if (def) return def;
    }
  }

  // 3. Customer-wide
  if (context.customer_id) {
    const custSla = d
      .select({ def_id: slaAssignments.sla_definition_id })
      .from(slaAssignments)
      .where(and(
        eq(slaAssignments.tenant_id, tenantId),
        eq(slaAssignments.customer_id, context.customer_id),
        isNull(slaAssignments.service_id),
        isNull(slaAssignments.asset_id),
      ))
      .get();
    if (custSla) {
      const def = d.select().from(slaDefinitions).where(and(eq(slaDefinitions.id, custSla.def_id), eq(slaDefinitions.is_active, 1))).get();
      if (def) return def;
    }
  }

  // 4. Service-wide
  if (context.service_id) {
    const svcSla = d
      .select({ def_id: slaAssignments.sla_definition_id })
      .from(slaAssignments)
      .where(and(
        eq(slaAssignments.tenant_id, tenantId),
        eq(slaAssignments.service_id, context.service_id),
        isNull(slaAssignments.customer_id),
        isNull(slaAssignments.asset_id),
      ))
      .get();
    if (svcSla) {
      const def = d.select().from(slaDefinitions).where(and(eq(slaDefinitions.id, svcSla.def_id), eq(slaDefinitions.is_active, 1))).get();
      if (def) return def;
    }
  }

  // 5. Tenant default
  const defaultSla = d
    .select()
    .from(slaDefinitions)
    .where(and(
      eq(slaDefinitions.tenant_id, tenantId),
      eq(slaDefinitions.is_default, 1),
      eq(slaDefinitions.is_active, 1),
    ))
    .get();

  return defaultSla ?? null;
}

// =============================================================================
// SLA Performance Report
// =============================================================================

export interface SlaPerformanceReport {
  summary: {
    total_tickets: number;
    total_with_sla: number;
    total_breached: number;
    breach_rate: number;
    avg_resolution_hours: number | null;
  };
  by_priority: Array<{
    priority: string;
    total: number;
    breached: number;
    breach_rate: number;
    avg_resolution_hours: number | null;
  }>;
  by_type: Array<{
    ticket_type: string;
    total: number;
    breached: number;
    breach_rate: number;
  }>;
  breach_trend: Array<{
    date: string;
    total: number;
    breached: number;
  }>;
}

/**
 * Generate SLA performance report for a tenant.
 * @param days Number of days to look back (default 30)
 */
export function getSlaPerformanceReport(
  tenantId: string,
  days = 30,
): SlaPerformanceReport {
  const d = db();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  // All tickets in time window
  const allTickets = d
    .select({
      id: tickets.id,
      priority: tickets.priority,
      ticket_type: tickets.ticket_type,
      sla_breached: tickets.sla_breached,
      sla_response_due: tickets.sla_response_due,
      sla_resolve_due: tickets.sla_resolve_due,
      sla_paused_total: tickets.sla_paused_total,
      created_at: tickets.created_at,
      resolved_at: tickets.resolved_at,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        sql`${tickets.created_at} >= ${cutoffStr}`,
      ),
    )
    .all();

  // Summary
  const totalTickets = allTickets.length;
  const withSla = allTickets.filter((t) => t.sla_response_due || t.sla_resolve_due);
  const breached = allTickets.filter((t) => t.sla_breached === 1);
  const totalWithSla = withSla.length;
  const totalBreached = breached.length;
  const breachRate = totalWithSla > 0 ? Math.round((totalBreached / totalWithSla) * 10000) / 100 : 0;

  // Average resolution hours (resolved tickets only)
  const resolvedTickets = allTickets.filter((t) => t.resolved_at);
  let avgResolutionHours: number | null = null;
  if (resolvedTickets.length > 0) {
    const totalHours = resolvedTickets.reduce((sum, t) => {
      const created = new Date(t.created_at).getTime();
      const resolved = new Date(t.resolved_at!).getTime();
      const pausedMs = (t.sla_paused_total ?? 0) * 1000;
      return sum + (resolved - created - pausedMs) / 3_600_000;
    }, 0);
    avgResolutionHours = Math.round((totalHours / resolvedTickets.length) * 10) / 10;
  }

  // By priority
  const priorityMap = new Map<string, { total: number; breached: number; resHours: number[]; }>();
  for (const t of allTickets) {
    const p = t.priority ?? 'medium';
    const entry = priorityMap.get(p) ?? { total: 0, breached: 0, resHours: [] };
    entry.total++;
    if (t.sla_breached === 1) entry.breached++;
    if (t.resolved_at) {
      const created = new Date(t.created_at).getTime();
      const resolved = new Date(t.resolved_at).getTime();
      const pausedMs = (t.sla_paused_total ?? 0) * 1000;
      entry.resHours.push((resolved - created - pausedMs) / 3_600_000);
    }
    priorityMap.set(p, entry);
  }
  const byPriority = Array.from(priorityMap.entries()).map(([priority, e]) => ({
    priority,
    total: e.total,
    breached: e.breached,
    breach_rate: e.total > 0 ? Math.round((e.breached / e.total) * 10000) / 100 : 0,
    avg_resolution_hours: e.resHours.length > 0
      ? Math.round((e.resHours.reduce((a, b) => a + b, 0) / e.resHours.length) * 10) / 10
      : null,
  }));

  // By type
  const typeMap = new Map<string, { total: number; breached: number; }>();
  for (const t of allTickets) {
    const tt = t.ticket_type;
    const entry = typeMap.get(tt) ?? { total: 0, breached: 0 };
    entry.total++;
    if (t.sla_breached === 1) entry.breached++;
    typeMap.set(tt, entry);
  }
  const byType = Array.from(typeMap.entries()).map(([ticket_type, e]) => ({
    ticket_type,
    total: e.total,
    breached: e.breached,
    breach_rate: e.total > 0 ? Math.round((e.breached / e.total) * 10000) / 100 : 0,
  }));

  // Breach trend (daily)
  const dayMap = new Map<string, { total: number; breached: number; }>();
  for (const t of allTickets) {
    const date = t.created_at.slice(0, 10);
    const entry = dayMap.get(date) ?? { total: 0, breached: 0 };
    entry.total++;
    if (t.sla_breached === 1) entry.breached++;
    dayMap.set(date, entry);
  }
  const breachTrend = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, e]) => ({ date, total: e.total, breached: e.breached }));

  return {
    summary: {
      total_tickets: totalTickets,
      total_with_sla: totalWithSla,
      total_breached: totalBreached,
      breach_rate: breachRate,
      avg_resolution_hours: avgResolutionHours,
    },
    by_priority: byPriority,
    by_type: byType,
    breach_trend: breachTrend,
  };
}
