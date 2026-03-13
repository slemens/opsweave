import { eq, ne, and, count, like, or, asc, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { slaEngine } from '../../lib/sla-engine.js';
import { resolveEffectiveSla, type SlaDefinitionRow } from '../sla/sla.service.js';
import logger from '../../lib/logger.js';
import {
  tickets,
  ticketCategories,
  ticketComments,
  ticketHistory,
  users,
  assigneeGroups,
  assets,
  customers,
  knownErrors,
} from '../../db/schema/index.js';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors.js';
import { notify, getAffectedUsers, type NotificationPayload } from '../notifications/notification.service.js';
import { TICKET_NUMBER_PREFIXES, TICKET_STATUSES, calculatePriority, calculateChangeRisk } from '@opsweave/shared';
import type { TicketFilterParams, CreateTicketInput, UpdateTicketInput } from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

interface CreateCommentData {
  content: string;
  is_internal?: boolean;
  source?: string;
}

// ─── Internal Helpers ─────────────────────────────────────

/**
 * Generate a ticket number: {PREFIX}-{YYYY}-{NNNNN}
 * Sequence is scoped per tenant and ticket type.
 */
async function generateTicketNumber(
  tenantId: string,
  ticketType: string,
): Promise<string> {
  const d = db();
  const prefix = TICKET_NUMBER_PREFIXES[ticketType] ?? 'TKT';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;

  const rows = await d
    .select({ ticket_number: tickets.ticket_number })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        eq(tickets.ticket_type, ticketType),
        like(tickets.ticket_number, pattern),
      ),
    )
    .orderBy(desc(tickets.ticket_number))
    .limit(1);

  let nextNum = 1;
  if (rows.length > 0 && rows[0]) {
    const parts = rows[0].ticket_number.split('-');
    const numStr = parts[parts.length - 1];
    if (numStr) {
      const parsed = parseInt(numStr, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
  }

  const paddedNum = String(nextNum).padStart(5, '0');
  return `${prefix}-${year}-${paddedNum}`;
}

/**
 * Record a change in ticket_history.
 */
async function recordHistory(
  tenantId: string,
  ticketId: string,
  fieldChanged: string,
  oldValue: string | null,
  newValue: string | null,
  changedBy: string,
): Promise<void> {
  const d = db();

  await d.insert(ticketHistory).values({
    id: uuidv4(),
    tenant_id: tenantId,
    ticket_id: ticketId,
    field_changed: fieldChanged,
    old_value: oldValue,
    new_value: newValue,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
  });
}

// ─── SLA Due-Date Calculation ─────────────────────────────

/**
 * Calculate SLA response and resolution due dates from an SLA definition.
 * Uses priority-specific overrides if available.
 */
function calculateSlaDueDates(
  slaDef: SlaDefinitionRow,
  priority: string,
  now: Date,
): { responseDue: string; resolveDue: string } {
  let responseMinutes = slaDef.response_time_minutes;
  let resolutionMinutes = slaDef.resolution_time_minutes;

  // Check for priority-specific overrides
  try {
    const overrides = JSON.parse(slaDef.priority_overrides || '{}') as Record<string, { response?: number; resolution?: number }>;
    const pOverride = overrides[priority];
    if (pOverride) {
      if (pOverride.response) responseMinutes = pOverride.response;
      if (pOverride.resolution) resolutionMinutes = pOverride.resolution;
    }
  } catch {
    // Invalid JSON in overrides — use defaults
  }

  const responseDue = new Date(now.getTime() + responseMinutes * 60_000);
  const resolveDue = new Date(now.getTime() + resolutionMinutes * 60_000);

  return {
    responseDue: responseDue.toISOString(),
    resolveDue: resolveDue.toISOString(),
  };
}

// ─── Service ──────────────────────────────────────────────

/**
 * List tickets with filtering, pagination, and sorting.
 */
export async function listTickets(
  tenantId: string,
  params: TicketFilterParams,
): Promise<{ tickets: unknown[]; total: number }> {
  const d = db();
  const { page, limit, sort, order, q, status, ticket_type, priority, assignee_id, assignee_group_id, asset_id, customer_id, category_id, project_id } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(tickets.tenant_id, tenantId)];

  // When an explicit status filter is set, respect it (even 'archived').
  // When no status filter → hide archived.
  if (status) {
    conditions.push(eq(tickets.status, status));
  } else {
    conditions.push(ne(tickets.status, 'archived'));
  }
  if (ticket_type) conditions.push(eq(tickets.ticket_type, ticket_type));
  if (priority) conditions.push(eq(tickets.priority, priority));
  if (assignee_id) conditions.push(eq(tickets.assignee_id, assignee_id));
  if (assignee_group_id) conditions.push(eq(tickets.assignee_group_id, assignee_group_id));
  if (asset_id) conditions.push(eq(tickets.asset_id, asset_id));
  if (customer_id) conditions.push(eq(tickets.customer_id, customer_id));
  if (category_id) conditions.push(eq(tickets.category_id, category_id));
  if (project_id) conditions.push(eq(tickets.project_id, project_id));

  if (q) {
    conditions.push(
      or(
        like(tickets.title, `%${q}%`),
        like(tickets.description, `%${q}%`),
        like(tickets.ticket_number, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(tickets)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn = sort === 'priority' ? tickets.priority
    : sort === 'status' ? tickets.status
    : sort === 'title' ? tickets.title
    : sort === 'ticket_number' ? tickets.ticket_number
    : sort === 'updated_at' ? tickets.updated_at
    : sort === 'ticket_type' ? tickets.ticket_type
    : tickets.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select({
      id: tickets.id,
      tenant_id: tickets.tenant_id,
      ticket_number: tickets.ticket_number,
      ticket_type: tickets.ticket_type,
      subtype: tickets.subtype,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      impact: tickets.impact,
      urgency: tickets.urgency,
      asset_id: tickets.asset_id,
      assignee_id: tickets.assignee_id,
      assignee_group_id: tickets.assignee_group_id,
      reporter_id: tickets.reporter_id,
      customer_id: tickets.customer_id,
      sla_tier: tickets.sla_tier,
      sla_response_due: tickets.sla_response_due,
      sla_resolve_due: tickets.sla_resolve_due,
      sla_breached: tickets.sla_breached,
      sla_paused_at: tickets.sla_paused_at,
      sla_paused_total: tickets.sla_paused_total,
      root_cause: tickets.root_cause,
      known_error_id: tickets.known_error_id,
      change_justification: tickets.change_justification,
      change_risk_level: tickets.change_risk_level,
      change_risk_likelihood: tickets.change_risk_likelihood,
      change_risk_impact: tickets.change_risk_impact,
      change_implementation: tickets.change_implementation,
      change_rollback_plan: tickets.change_rollback_plan,
      change_planned_start: tickets.change_planned_start,
      change_planned_end: tickets.change_planned_end,
      change_actual_start: tickets.change_actual_start,
      change_actual_end: tickets.change_actual_end,
      cab_required: tickets.cab_required,
      cab_decision: tickets.cab_decision,
      cab_decision_by: tickets.cab_decision_by,
      cab_decision_at: tickets.cab_decision_at,
      cab_notes: tickets.cab_notes,
      incident_commander_id: tickets.incident_commander_id,
      escalation_level: tickets.escalation_level,
      escalated_at: tickets.escalated_at,
      is_major_incident: tickets.is_major_incident,
      major_declared_at: tickets.major_declared_at,
      major_declared_by: tickets.major_declared_by,
      bridge_call_url: tickets.bridge_call_url,
      project_id: tickets.project_id,
      parent_ticket_id: tickets.parent_ticket_id,
      source: tickets.source,
      created_at: tickets.created_at,
      updated_at: tickets.updated_at,
      resolved_at: tickets.resolved_at,
      closed_at: tickets.closed_at,
      created_by: tickets.created_by,
      assignee_name: users.display_name,
      assignee_email: users.email,
      group_name: assigneeGroups.name,
      customer_name: customers.name,
      category_id: tickets.category_id,
      category_name: ticketCategories.name,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assignee_id, users.id))
    .leftJoin(assigneeGroups, eq(tickets.assignee_group_id, assigneeGroups.id))
    .leftJoin(customers, eq(tickets.customer_id, customers.id))
    .leftJoin(ticketCategories, eq(tickets.category_id, ticketCategories.id))
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  // Reshape flat rows into nested objects for frontend compatibility
  const shaped = rows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    ticket_number: row.ticket_number,
    ticket_type: row.ticket_type,
    subtype: row.subtype,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    impact: row.impact,
    urgency: row.urgency,
    asset_id: row.asset_id,
    assignee_id: row.assignee_id,
    assignee_group_id: row.assignee_group_id,
    reporter_id: row.reporter_id,
    customer_id: row.customer_id,
    category_id: row.category_id,
    sla_tier: row.sla_tier,
    sla_response_due: row.sla_response_due,
    sla_resolve_due: row.sla_resolve_due,
    sla_breached: row.sla_breached,
    sla_paused_at: row.sla_paused_at,
    sla_paused_total: row.sla_paused_total,
    root_cause: row.root_cause,
    known_error_id: row.known_error_id,
    change_justification: row.change_justification,
    change_risk_level: row.change_risk_level,
    change_risk_likelihood: row.change_risk_likelihood,
    change_risk_impact: row.change_risk_impact,
    change_implementation: row.change_implementation,
    change_rollback_plan: row.change_rollback_plan,
    change_planned_start: row.change_planned_start,
    change_planned_end: row.change_planned_end,
    change_actual_start: row.change_actual_start,
    change_actual_end: row.change_actual_end,
    cab_required: row.cab_required,
    cab_decision: row.cab_decision,
    cab_decision_by: row.cab_decision_by,
    cab_decision_at: row.cab_decision_at,
    cab_notes: row.cab_notes,
    incident_commander_id: row.incident_commander_id,
    escalation_level: row.escalation_level,
    escalated_at: row.escalated_at,
    is_major_incident: row.is_major_incident,
    major_declared_at: row.major_declared_at,
    major_declared_by: row.major_declared_by,
    bridge_call_url: row.bridge_call_url,
    project_id: row.project_id,
    parent_ticket_id: row.parent_ticket_id,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_at: row.resolved_at,
    closed_at: row.closed_at,
    created_by: row.created_by,
    assignee: row.assignee_id ? { id: row.assignee_id, display_name: row.assignee_name ?? '', email: row.assignee_email ?? '' } : null,
    assignee_group: row.assignee_group_id ? { id: row.assignee_group_id, name: row.group_name ?? '' } : null,
    customer: row.customer_id ? { id: row.customer_id, name: row.customer_name ?? '' } : null,
    category: row.category_id ? { id: row.category_id, name: row.category_name ?? '' } : null,
  }));

  return { tickets: shaped, total };
}

/**
 * Get a single ticket with related entity information.
 */
export async function getTicket(
  tenantId: string,
  ticketId: string,
): Promise<unknown> {
  const d = db();

  const rows = await d
    .select({
      id: tickets.id,
      tenant_id: tickets.tenant_id,
      ticket_number: tickets.ticket_number,
      ticket_type: tickets.ticket_type,
      subtype: tickets.subtype,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      impact: tickets.impact,
      urgency: tickets.urgency,
      asset_id: tickets.asset_id,
      assignee_id: tickets.assignee_id,
      assignee_group_id: tickets.assignee_group_id,
      reporter_id: tickets.reporter_id,
      customer_id: tickets.customer_id,
      workflow_instance_id: tickets.workflow_instance_id,
      current_step_id: tickets.current_step_id,
      sla_tier: tickets.sla_tier,
      sla_response_due: tickets.sla_response_due,
      sla_resolve_due: tickets.sla_resolve_due,
      sla_breached: tickets.sla_breached,
      sla_paused_at: tickets.sla_paused_at,
      sla_paused_total: tickets.sla_paused_total,
      root_cause: tickets.root_cause,
      known_error_id: tickets.known_error_id,
      change_justification: tickets.change_justification,
      change_risk_level: tickets.change_risk_level,
      change_risk_likelihood: tickets.change_risk_likelihood,
      change_risk_impact: tickets.change_risk_impact,
      change_implementation: tickets.change_implementation,
      change_rollback_plan: tickets.change_rollback_plan,
      change_planned_start: tickets.change_planned_start,
      change_planned_end: tickets.change_planned_end,
      change_actual_start: tickets.change_actual_start,
      change_actual_end: tickets.change_actual_end,
      cab_required: tickets.cab_required,
      cab_decision: tickets.cab_decision,
      cab_decision_by: tickets.cab_decision_by,
      cab_decision_at: tickets.cab_decision_at,
      cab_notes: tickets.cab_notes,
      incident_commander_id: tickets.incident_commander_id,
      escalation_level: tickets.escalation_level,
      escalated_at: tickets.escalated_at,
      is_major_incident: tickets.is_major_incident,
      major_declared_at: tickets.major_declared_at,
      major_declared_by: tickets.major_declared_by,
      bridge_call_url: tickets.bridge_call_url,
      project_id: tickets.project_id,
      parent_ticket_id: tickets.parent_ticket_id,
      source: tickets.source,
      created_at: tickets.created_at,
      updated_at: tickets.updated_at,
      resolved_at: tickets.resolved_at,
      closed_at: tickets.closed_at,
      created_by: tickets.created_by,
      assignee_name: users.display_name,
      assignee_email: users.email,
      group_name: assigneeGroups.name,
      asset_name: assets.display_name,
      customer_name: customers.name,
      category_id: tickets.category_id,
      category_name: ticketCategories.name,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assignee_id, users.id))
    .leftJoin(assigneeGroups, eq(tickets.assignee_group_id, assigneeGroups.id))
    .leftJoin(assets, eq(tickets.asset_id, assets.id))
    .leftJoin(customers, eq(tickets.customer_id, customers.id))
    .leftJoin(ticketCategories, eq(tickets.category_id, ticketCategories.id))
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Ticket not found');
  }

  // If ticket has a parent, fetch parent info
  let parentTicket: { id: string; ticket_number: string; title: string } | null = null;
  if (row.parent_ticket_id) {
    const parentRows = await d
      .select({ id: tickets.id, ticket_number: tickets.ticket_number, title: tickets.title })
      .from(tickets)
      .where(and(eq(tickets.id, row.parent_ticket_id), eq(tickets.tenant_id, tenantId)))
      .limit(1);
    if (parentRows[0]) {
      parentTicket = parentRows[0];
    }
  }

  // If ticket has a known error, fetch known error info
  let knownError: { id: string; title: string; workaround: string | null } | null = null;
  if (row.known_error_id) {
    const keRows = await d
      .select({ id: knownErrors.id, title: knownErrors.title, workaround: knownErrors.workaround })
      .from(knownErrors)
      .where(and(eq(knownErrors.id, row.known_error_id), eq(knownErrors.tenant_id, tenantId)))
      .limit(1);
    if (keRows[0]) {
      knownError = keRows[0];
    }
  }

  // Count child tickets
  const [childCountResult] = await d
    .select({ count: count() })
    .from(tickets)
    .where(and(eq(tickets.parent_ticket_id, ticketId), eq(tickets.tenant_id, tenantId)));

  // Reshape flat row into nested objects
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    ticket_number: row.ticket_number,
    ticket_type: row.ticket_type,
    subtype: row.subtype,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    impact: row.impact,
    urgency: row.urgency,
    asset_id: row.asset_id,
    assignee_id: row.assignee_id,
    assignee_group_id: row.assignee_group_id,
    reporter_id: row.reporter_id,
    customer_id: row.customer_id,
    category_id: row.category_id,
    workflow_instance_id: row.workflow_instance_id,
    current_step_id: row.current_step_id,
    sla_tier: row.sla_tier,
    sla_response_due: row.sla_response_due,
    sla_resolve_due: row.sla_resolve_due,
    sla_breached: row.sla_breached,
    sla_paused_at: row.sla_paused_at,
    sla_paused_total: row.sla_paused_total,
    root_cause: row.root_cause,
    known_error_id: row.known_error_id,
    change_justification: row.change_justification,
    change_risk_level: row.change_risk_level,
    change_risk_likelihood: row.change_risk_likelihood,
    change_risk_impact: row.change_risk_impact,
    change_implementation: row.change_implementation,
    change_rollback_plan: row.change_rollback_plan,
    change_planned_start: row.change_planned_start,
    change_planned_end: row.change_planned_end,
    change_actual_start: row.change_actual_start,
    change_actual_end: row.change_actual_end,
    cab_required: row.cab_required,
    cab_decision: row.cab_decision,
    cab_decision_by: row.cab_decision_by,
    cab_decision_at: row.cab_decision_at,
    cab_notes: row.cab_notes,
    incident_commander_id: row.incident_commander_id,
    escalation_level: row.escalation_level,
    escalated_at: row.escalated_at,
    is_major_incident: row.is_major_incident,
    major_declared_at: row.major_declared_at,
    major_declared_by: row.major_declared_by,
    bridge_call_url: row.bridge_call_url,
    project_id: row.project_id,
    parent_ticket_id: row.parent_ticket_id,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_at: row.resolved_at,
    closed_at: row.closed_at,
    created_by: row.created_by,
    assignee: row.assignee_id ? { id: row.assignee_id, display_name: row.assignee_name ?? '', email: row.assignee_email ?? '' } : null,
    assignee_group: row.assignee_group_id ? { id: row.assignee_group_id, name: row.group_name ?? '' } : null,
    asset: row.asset_id ? { id: row.asset_id, name: row.asset_name ?? '', display_name: row.asset_name ?? '' } : null,
    customer: row.customer_id ? { id: row.customer_id, name: row.customer_name ?? '' } : null,
    category: row.category_id ? { id: row.category_id, name: row.category_name ?? '' } : null,
    known_error: knownError,
    parent_ticket: parentTicket,
    child_ticket_count: childCountResult?.count ?? 0,
  };
}

/**
 * Create a new ticket.
 */
export async function createTicket(
  tenantId: string,
  data: CreateTicketInput,
  creatorId: string,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const ticketId = uuidv4();

  const ticketNumber = await generateTicketNumber(tenantId, data.ticket_type);

  // Validate parent ticket if provided
  if (data.parent_ticket_id) {
    const parentRows = await d
      .select({ id: tickets.id, ticket_type: tickets.ticket_type, tenant_id: tickets.tenant_id })
      .from(tickets)
      .where(
        and(
          eq(tickets.id, data.parent_ticket_id),
          eq(tickets.tenant_id, tenantId),
        ),
      )
      .limit(1);

    const parent = parentRows[0];
    if (!parent) {
      throw new NotFoundError('Parent ticket not found');
    }
    if (parent.ticket_type !== data.ticket_type) {
      throw new ValidationError('Parent ticket must be of the same type');
    }
  }

  // Auto-calculate priority from Impact × Urgency matrix (ITIL)
  const impact = data.impact ?? null;
  const urgency = data.urgency ?? null;
  const priority = (impact && urgency)
    ? calculatePriority(impact, urgency)
    : (data.priority ?? 'medium');

  // Auto-calculate change risk level
  let changeRiskLevel = data.change_risk_level ?? null;
  if (data.ticket_type === 'change' && data.change_risk_likelihood && data.change_risk_impact) {
    changeRiskLevel = calculateChangeRisk(data.change_risk_likelihood, data.change_risk_impact);
  }

  // Validate change planned dates
  if (data.change_planned_start && data.change_planned_end) {
    if (new Date(data.change_planned_end) <= new Date(data.change_planned_start)) {
      throw new ValidationError('change_planned_end must be after change_planned_start');
    }
  }

  // SLA-Vererbung: falls asset_id gesetzt → effektives SLA-Tier aus Asset-Hierarchie ableiten.
  // Das Ticket hat kein eigenes sla_tier-Eingabefeld; der Wert wird immer vom Asset geerbt.
  let effectiveSlaTier: string | null = null;

  if (data.asset_id) {
    try {
      effectiveSlaTier = await slaEngine.resolveSlaTier(tenantId, data.asset_id);
    } catch (err) {
      logger.warn({ err, assetId: data.asset_id }, 'SLA resolution failed for asset');
    }
  }

  // SLA Due-Date Calculation: resolve SLA definition and calculate deadlines
  let slaResponseDue: string | null = null;
  let slaResolveDue: string | null = null;

  try {
    const slaDef = await resolveEffectiveSla(tenantId, {
      asset_id: data.asset_id ?? null,
      customer_id: data.customer_id ?? null,
    });
    if (slaDef) {
      const dueDates = calculateSlaDueDates(slaDef, priority, new Date(now));
      slaResponseDue = dueDates.responseDue;
      slaResolveDue = dueDates.resolveDue;
      // If we got an SLA definition but no tier from asset hierarchy, use definition name as tier hint
      if (!effectiveSlaTier && slaDef.name) {
        // Map well-known SLA names to tiers
        const nameLower = slaDef.name.toLowerCase();
        if (nameLower.includes('platinum')) effectiveSlaTier = 'platinum';
        else if (nameLower.includes('gold')) effectiveSlaTier = 'gold';
        else if (nameLower.includes('silver')) effectiveSlaTier = 'silver';
        else if (nameLower.includes('bronze')) effectiveSlaTier = 'bronze';
      }
    }
  } catch (err) {
    logger.warn({ err }, 'SLA due-date calculation failed');
  }

  const [created] = await d
    .insert(tickets)
    .values({
      id: ticketId,
      tenant_id: tenantId,
      ticket_number: ticketNumber,
      ticket_type: data.ticket_type,
      subtype: data.subtype ?? null,
      title: data.title,
      description: data.description,
      status: 'open',
      priority,
      impact,
      urgency,
      asset_id: data.asset_id ?? null,
      assignee_id: data.assignee_id ?? null,
      assignee_group_id: data.assignee_group_id ?? null,
      reporter_id: creatorId,
      customer_id: data.customer_id ?? null,
      category_id: data.category_id ?? null,
      project_id: data.project_id ?? null,
      parent_ticket_id: data.parent_ticket_id ?? null,
      root_cause: data.ticket_type === 'problem' ? (data.root_cause ?? null) : null,
      // Change-specific RFC fields
      change_justification: data.ticket_type === 'change' ? (data.change_justification ?? null) : null,
      change_risk_level: data.ticket_type === 'change' ? (changeRiskLevel ?? null) : null,
      change_risk_likelihood: data.ticket_type === 'change' ? (data.change_risk_likelihood ?? null) : null,
      change_risk_impact: data.ticket_type === 'change' ? (data.change_risk_impact ?? null) : null,
      change_implementation: data.ticket_type === 'change' ? (data.change_implementation ?? null) : null,
      change_rollback_plan: data.ticket_type === 'change' ? (data.change_rollback_plan ?? null) : null,
      change_planned_start: data.ticket_type === 'change' ? (data.change_planned_start ?? null) : null,
      change_planned_end: data.ticket_type === 'change' ? (data.change_planned_end ?? null) : null,
      cab_required: data.ticket_type === 'change' && data.cab_required ? 1 : 0,
      sla_tier: effectiveSlaTier ?? null,
      sla_response_due: slaResponseDue,
      sla_resolve_due: slaResolveDue,
      sla_breached: 0,
      source: data.source ?? 'manual',
      created_at: now,
      updated_at: now,
      created_by: creatorId,
    })
    .returning();

  await recordHistory(
    tenantId,
    ticketId,
    'created',
    null,
    'Ticket created',
    creatorId,
  );

  // Auto-trigger matching workflows (fire-and-forget, don't fail ticket creation)
  void import('../workflows/workflows.service.js').then(({ triggerWorkflowsForTicket }) =>
    triggerWorkflowsForTicket(tenantId, ticketId, 'ticket_created', data.ticket_type, creatorId),
  );

  return created;
}

/**
 * Update a ticket. Tracks changes in ticket_history.
 */
export async function updateTicket(
  tenantId: string,
  ticketId: string,
  data: UpdateTicketInput,
  userId: string,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();

  const existingRows = await d
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    throw new NotFoundError('Ticket not found');
  }

  const updateSet: Record<string, unknown> = {
    updated_at: now,
  };

  const fieldsToTrack: Array<{ key: keyof UpdateTicketInput; dbKey: string }> = [
    { key: 'title', dbKey: 'title' },
    { key: 'description', dbKey: 'description' },
    { key: 'status', dbKey: 'status' },
    { key: 'priority', dbKey: 'priority' },
    { key: 'impact', dbKey: 'impact' },
    { key: 'urgency', dbKey: 'urgency' },
    { key: 'subtype', dbKey: 'subtype' },
    { key: 'asset_id', dbKey: 'asset_id' },
    { key: 'assignee_id', dbKey: 'assignee_id' },
    { key: 'assignee_group_id', dbKey: 'assignee_group_id' },
    { key: 'customer_id', dbKey: 'customer_id' },
    { key: 'category_id', dbKey: 'category_id' },
    { key: 'sla_tier', dbKey: 'sla_tier' },
    { key: 'root_cause', dbKey: 'root_cause' },
    { key: 'known_error_id', dbKey: 'known_error_id' },
    { key: 'change_justification', dbKey: 'change_justification' },
    { key: 'change_risk_level', dbKey: 'change_risk_level' },
    { key: 'change_risk_likelihood', dbKey: 'change_risk_likelihood' },
    { key: 'change_risk_impact', dbKey: 'change_risk_impact' },
    { key: 'change_implementation', dbKey: 'change_implementation' },
    { key: 'change_rollback_plan', dbKey: 'change_rollback_plan' },
    { key: 'change_planned_start', dbKey: 'change_planned_start' },
    { key: 'change_planned_end', dbKey: 'change_planned_end' },
    { key: 'change_actual_start', dbKey: 'change_actual_start' },
    { key: 'change_actual_end', dbKey: 'change_actual_end' },
    { key: 'cab_required', dbKey: 'cab_required' },
    { key: 'project_id', dbKey: 'project_id' },
    { key: 'incident_commander_id', dbKey: 'incident_commander_id' },
    { key: 'bridge_call_url', dbKey: 'bridge_call_url' },
  ];

  const historyPromises: Promise<void>[] = [];

  for (const { key, dbKey } of fieldsToTrack) {
    if (data[key] !== undefined) {
      const oldVal = existing[dbKey as keyof typeof existing];
      const newVal = data[key];

      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        updateSet[dbKey] = newVal;
        historyPromises.push(
          recordHistory(
            tenantId,
            ticketId,
            dbKey,
            oldVal != null ? String(oldVal) : null,
            newVal != null ? String(newVal) : null,
            userId,
          ),
        );
      }
    }
  }

  // Convert booleans to integers for SQLite compatibility
  if (updateSet['cab_required'] !== undefined) {
    updateSet['cab_required'] = updateSet['cab_required'] ? 1 : 0;
  }

  // Auto-calculate priority from Impact × Urgency matrix (ITIL)
  if (data.impact !== undefined || data.urgency !== undefined) {
    const newImpact = (data.impact !== undefined ? data.impact : existing.impact) as string | null;
    const newUrgency = (data.urgency !== undefined ? data.urgency : existing.urgency) as string | null;
    if (newImpact && newUrgency) {
      const calculatedPriority = calculatePriority(newImpact, newUrgency);
      const oldPriority = updateSet['priority'] ?? existing.priority;
      if (String(oldPriority) !== calculatedPriority) {
        updateSet['priority'] = calculatedPriority;
        historyPromises.push(
          recordHistory(
            tenantId,
            ticketId,
            'priority',
            existing.priority != null ? String(existing.priority) : null,
            calculatedPriority,
            userId,
          ),
        );
      }
    }
  }

  // Auto-calculate change risk level from Likelihood × Impact
  if (data.change_risk_likelihood !== undefined || data.change_risk_impact !== undefined) {
    const newLikelihood = (data.change_risk_likelihood !== undefined ? data.change_risk_likelihood : existing.change_risk_likelihood) as string | null;
    const newImpact = (data.change_risk_impact !== undefined ? data.change_risk_impact : existing.change_risk_impact) as string | null;
    if (newLikelihood && newImpact) {
      const calculatedRisk = calculateChangeRisk(newLikelihood, newImpact);
      const oldRisk = updateSet['change_risk_level'] ?? existing.change_risk_level;
      if (String(oldRisk ?? '') !== calculatedRisk) {
        updateSet['change_risk_level'] = calculatedRisk;
        historyPromises.push(
          recordHistory(tenantId, ticketId, 'change_risk_level', oldRisk != null ? String(oldRisk) : null, calculatedRisk, userId),
        );
      }
    }
  }

  // Validate change planned dates
  if (data.change_planned_start || data.change_planned_end) {
    const startStr = (data.change_planned_start ?? existing.change_planned_start) as string | null;
    const endStr = (data.change_planned_end ?? existing.change_planned_end) as string | null;
    if (startStr && endStr && new Date(endStr) <= new Date(startStr)) {
      throw new ValidationError('change_planned_end must be after change_planned_start');
    }
  }

  // Handle status transitions
  if (data.status) {
    // Closing rules: check for unresolved children
    if (data.status === 'resolved' || data.status === 'closed') {
      const unresolvedChildren = await d
        .select({ count: count() })
        .from(tickets)
        .where(
          and(
            eq(tickets.parent_ticket_id, ticketId),
            eq(tickets.tenant_id, tenantId),
            or(
              eq(tickets.status, 'open'),
              eq(tickets.status, 'in_progress'),
              eq(tickets.status, 'pending'),
            ),
          ),
        );

      const unresolvedCount = unresolvedChildren[0]?.count ?? 0;
      if (unresolvedCount > 0) {
        throw new ValidationError(
          'Cannot close — there are unresolved child tickets',
        );
      }
    }

    if (data.status === 'resolved' && existing.status !== 'resolved') {
      updateSet['resolved_at'] = now;
    }
    if (data.status === 'closed' && existing.status !== 'closed') {
      updateSet['closed_at'] = now;
    }

    // SLA Pause/Unpause: pause timer when entering pending, unpause when leaving
    const oldStatus = existing.status as string;
    const newStatus = data.status as string;

    if (newStatus === 'pending' && oldStatus !== 'pending') {
      // Entering pending → pause SLA timer
      updateSet['sla_paused_at'] = now;
      historyPromises.push(
        recordHistory(tenantId, ticketId, 'sla_paused', null, 'paused', userId),
      );
    } else if (oldStatus === 'pending' && newStatus !== 'pending') {
      // Leaving pending → unpause SLA timer, shift due dates
      const pausedAt = existing.sla_paused_at as string | null;
      if (pausedAt) {
        const pauseStart = new Date(pausedAt).getTime();
        const pauseEnd = new Date(now).getTime();
        const pauseDurationMs = pauseEnd - pauseStart;
        const pauseDurationSec = Math.floor(pauseDurationMs / 1000);
        const existingPausedTotal = (existing.sla_paused_total as number) ?? 0;

        updateSet['sla_paused_at'] = null;
        updateSet['sla_paused_total'] = existingPausedTotal + pauseDurationSec;

        // Shift SLA due dates forward by pause duration
        const responseDue = existing.sla_response_due as string | null;
        const resolveDue = existing.sla_resolve_due as string | null;

        if (responseDue) {
          const shifted = new Date(new Date(responseDue).getTime() + pauseDurationMs);
          updateSet['sla_response_due'] = shifted.toISOString();
        }
        if (resolveDue) {
          const shifted = new Date(new Date(resolveDue).getTime() + pauseDurationMs);
          updateSet['sla_resolve_due'] = shifted.toISOString();
        }

        historyPromises.push(
          recordHistory(tenantId, ticketId, 'sla_paused', 'paused', `unpaused (+${pauseDurationSec}s)`, userId),
        );
      }
    }
  }

  await Promise.all(historyPromises);

  const [updated] = await d
    .update(tickets)
    .set(updateSet)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .returning();

  // ── Fire-and-forget notifications ──
  const notifPayload: NotificationPayload = {
    ticket_id: ticketId,
    ticket_number: existing.ticket_number as string,
    ticket_title: existing.title as string,
    ticket_type: existing.ticket_type as string,
  };

  const affectedUsers = await getAffectedUsers(
    tenantId,
    (updated?.assignee_id ?? existing.assignee_id) as string | null,
    existing.reporter_id as string,
    userId,
  );

  if (data.status && data.status !== existing.status) {
    void notify(tenantId, 'ticket_status_changed', {
      ...notifPayload,
      old_value: existing.status as string,
      new_value: data.status,
    }, affectedUsers);
  }

  if (data.assignee_id !== undefined && data.assignee_id !== existing.assignee_id) {
    // Notify the newly assigned user
    if (data.assignee_id) {
      void notify(tenantId, 'ticket_assigned', notifPayload, [data.assignee_id]);
    }
  }

  return updated;
}

/**
 * Update only the status of a ticket.
 */
export async function updateTicketStatus(
  tenantId: string,
  ticketId: string,
  status: string,
  userId: string,
): Promise<unknown> {
  return updateTicket(tenantId, ticketId, { status: status as UpdateTicketInput['status'] }, userId);
}

/**
 * Assign a ticket to a user and/or group.
 */
export async function assignTicket(
  tenantId: string,
  ticketId: string,
  assigneeId: string | null,
  groupId: string | null,
  userId: string,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();

  const existingRows = await d
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    throw new NotFoundError('Ticket not found');
  }

  const updateSet: Record<string, unknown> = {
    updated_at: now,
  };

  const historyPromises: Promise<void>[] = [];

  if (assigneeId !== undefined) {
    updateSet['assignee_id'] = assigneeId;
    if (String(existing.assignee_id ?? '') !== String(assigneeId ?? '')) {
      historyPromises.push(
        recordHistory(
          tenantId,
          ticketId,
          'assignee_id',
          existing.assignee_id,
          assigneeId,
          userId,
        ),
      );
    }
  }

  if (groupId !== undefined) {
    updateSet['assignee_group_id'] = groupId;
    if (String(existing.assignee_group_id ?? '') !== String(groupId ?? '')) {
      historyPromises.push(
        recordHistory(
          tenantId,
          ticketId,
          'assignee_group_id',
          existing.assignee_group_id,
          groupId,
          userId,
        ),
      );
    }
  }

  await Promise.all(historyPromises);

  const [updated] = await d
    .update(tickets)
    .set(updateSet)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .returning();

  return updated;
}

/**
 * Update only the priority of a ticket.
 */
export async function updateTicketPriority(
  tenantId: string,
  ticketId: string,
  priority: string,
  userId: string,
): Promise<unknown> {
  return updateTicket(
    tenantId,
    ticketId,
    { priority: priority as UpdateTicketInput['priority'] },
    userId,
  );
}

/**
 * Get comments for a ticket with author display names.
 */
export async function getTicketComments(
  tenantId: string,
  ticketId: string,
): Promise<unknown[]> {
  const d = db();

  const ticketRows = await d
    .select({ id: tickets.id })
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (ticketRows.length === 0) {
    throw new NotFoundError('Ticket not found');
  }

  const comments = await d
    .select({
      id: ticketComments.id,
      tenant_id: ticketComments.tenant_id,
      ticket_id: ticketComments.ticket_id,
      author_id: ticketComments.author_id,
      content: ticketComments.content,
      is_internal: ticketComments.is_internal,
      source: ticketComments.source,
      created_at: ticketComments.created_at,
      author_name: users.display_name,
      author_email: users.email,
    })
    .from(ticketComments)
    .leftJoin(users, eq(ticketComments.author_id, users.id))
    .where(
      and(
        eq(ticketComments.ticket_id, ticketId),
        eq(ticketComments.tenant_id, tenantId),
      ),
    )
    .orderBy(asc(ticketComments.created_at));

  return comments.map(({ author_name, author_email, ...c }) => ({
    ...c,
    author: author_name ? { id: c.author_id, display_name: author_name, email: author_email ?? '' } : null,
  }));
}

/**
 * Add a comment to a ticket.
 */
export async function addTicketComment(
  tenantId: string,
  ticketId: string,
  data: CreateCommentData,
  authorId: string,
): Promise<unknown> {
  const d = db();

  const ticketRows = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      ticket_type: tickets.ticket_type,
      assignee_id: tickets.assignee_id,
      reporter_id: tickets.reporter_id,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (ticketRows.length === 0) {
    throw new NotFoundError('Ticket not found');
  }

  const ticketInfo = ticketRows[0]!;
  const now = new Date().toISOString();
  const commentId = uuidv4();

  const [created] = await d
    .insert(ticketComments)
    .values({
      id: commentId,
      tenant_id: tenantId,
      ticket_id: ticketId,
      author_id: authorId,
      content: data.content,
      is_internal: data.is_internal ? 1 : 0,
      source: data.source ?? 'agent',
      created_at: now,
    })
    .returning();

  await d
    .update(tickets)
    .set({ updated_at: now })
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    );

  // Re-fetch with author JOIN so the response includes display_name + email
  const [withAuthor] = await d
    .select({
      id: ticketComments.id,
      tenant_id: ticketComments.tenant_id,
      ticket_id: ticketComments.ticket_id,
      author_id: ticketComments.author_id,
      content: ticketComments.content,
      is_internal: ticketComments.is_internal,
      source: ticketComments.source,
      created_at: ticketComments.created_at,
      author_name: users.display_name,
      author_email: users.email,
    })
    .from(ticketComments)
    .leftJoin(users, eq(ticketComments.author_id, users.id))
    .where(eq(ticketComments.id, commentId))
    .limit(1);

  // Notify on external comments (not internal)
  if (!data.is_internal && data.source !== 'system') {
    const affectedUsers = await getAffectedUsers(
      tenantId,
      ticketInfo.assignee_id,
      ticketInfo.reporter_id,
      authorId,
    );
    void notify(tenantId, 'ticket_commented', {
      ticket_id: ticketId,
      ticket_number: ticketInfo.ticket_number,
      ticket_title: ticketInfo.title,
      ticket_type: ticketInfo.ticket_type,
      comment_content: data.content,
    }, affectedUsers);
  }

  if (withAuthor) {
    const { author_name, author_email, ...rest } = withAuthor;
    return {
      ...rest,
      author: author_name ? { id: rest.author_id, display_name: author_name, email: author_email ?? '' } : null,
    };
  }
  return created;
}

/**
 * Get the change history for a ticket.
 */
export async function getTicketHistory(
  tenantId: string,
  ticketId: string,
): Promise<unknown[]> {
  const d = db();

  const ticketRows = await d
    .select({ id: tickets.id })
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (ticketRows.length === 0) {
    throw new NotFoundError('Ticket not found');
  }

  const rows = await d
    .select({
      id: ticketHistory.id,
      tenant_id: ticketHistory.tenant_id,
      ticket_id: ticketHistory.ticket_id,
      field_changed: ticketHistory.field_changed,
      old_value: ticketHistory.old_value,
      new_value: ticketHistory.new_value,
      changed_by: ticketHistory.changed_by,
      changed_at: ticketHistory.changed_at,
      changed_by_id: users.id,
      changed_by_name: users.display_name,
    })
    .from(ticketHistory)
    .leftJoin(users, eq(ticketHistory.changed_by, users.id))
    .where(
      and(
        eq(ticketHistory.ticket_id, ticketId),
        eq(ticketHistory.tenant_id, tenantId),
      ),
    )
    .orderBy(desc(ticketHistory.changed_at));

  return rows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    ticket_id: row.ticket_id,
    field_changed: row.field_changed,
    old_value: row.old_value,
    new_value: row.new_value,
    changed_by: row.changed_by,
    changed_at: row.changed_at,
    changed_by_user: row.changed_by_id
      ? { id: row.changed_by_id, display_name: row.changed_by_name ?? '' }
      : null,
  }));
}

/**
 * Get ticket statistics for the tenant.
 */
export async function getTicketStats(
  tenantId: string,
): Promise<{
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  sla_breached: number;
  total: number;
}> {
  const d = db();

  const statusCounts = await d
    .select({
      status: tickets.status,
      count: count(),
    })
    .from(tickets)
    .where(eq(tickets.tenant_id, tenantId))
    .groupBy(tickets.status);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of statusCounts) {
    byStatus[row.status] = row.count;
    total += row.count;
  }

  for (const s of TICKET_STATUSES) {
    if (!(s in byStatus)) {
      byStatus[s] = 0;
    }
  }

  const typeCounts = await d
    .select({
      ticket_type: tickets.ticket_type,
      count: count(),
    })
    .from(tickets)
    .where(eq(tickets.tenant_id, tenantId))
    .groupBy(tickets.ticket_type);

  const byType: Record<string, number> = {};
  for (const row of typeCounts) {
    byType[row.ticket_type] = row.count;
  }

  const [breachResult] = await d
    .select({ count: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        eq(tickets.sla_breached, 1),
      ),
    );

  return {
    by_status: byStatus,
    by_type: byType,
    sla_breached: breachResult?.count ?? 0,
    total,
  };
}

/**
 * Get board data: tickets grouped by status for Kanban view.
 */
export async function getBoardData(
  tenantId: string,
  params: TicketFilterParams,
): Promise<{
  columns: Array<{
    status: string;
    tickets: unknown[];
    count: number;
  }>;
}> {
  const d = db();
  const { ticket_type, priority, assignee_id, assignee_group_id, asset_id, q } = params;

  const conditions = [eq(tickets.tenant_id, tenantId)];

  if (ticket_type) conditions.push(eq(tickets.ticket_type, ticket_type));
  if (priority) conditions.push(eq(tickets.priority, priority));
  if (assignee_id) conditions.push(eq(tickets.assignee_id, assignee_id));
  if (assignee_group_id) conditions.push(eq(tickets.assignee_group_id, assignee_group_id));
  if (asset_id) conditions.push(eq(tickets.asset_id, asset_id));

  if (q) {
    conditions.push(
      or(
        like(tickets.title, `%${q}%`),
        like(tickets.ticket_number, `%${q}%`),
      )!,
    );
  }

  const rows = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      ticket_type: tickets.ticket_type,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      assignee_id: tickets.assignee_id,
      assignee_group_id: tickets.assignee_group_id,
      sla_breached: tickets.sla_breached,
      sla_resolve_due: tickets.sla_resolve_due,
      parent_ticket_id: tickets.parent_ticket_id,
      created_at: tickets.created_at,
      updated_at: tickets.updated_at,
      assignee_name: users.display_name,
      assignee_email: users.email,
      group_name: assigneeGroups.name,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assignee_id, users.id))
    .leftJoin(assigneeGroups, eq(tickets.assignee_group_id, assigneeGroups.id))
    .where(and(...conditions))
    .orderBy(desc(tickets.updated_at));

  const columnsMap = new Map<string, unknown[]>();

  for (const s of TICKET_STATUSES) {
    columnsMap.set(s, []);
  }

  for (const row of rows) {
    // Reshape to nested objects
    const shaped = {
      id: row.id,
      ticket_number: row.ticket_number,
      ticket_type: row.ticket_type,
      title: row.title,
      status: row.status,
      priority: row.priority,
      assignee_id: row.assignee_id,
      assignee_group_id: row.assignee_group_id,
      sla_breached: row.sla_breached,
      sla_resolve_due: row.sla_resolve_due,
      parent_ticket_id: row.parent_ticket_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      assignee: row.assignee_id ? { id: row.assignee_id, display_name: row.assignee_name ?? '', email: row.assignee_email ?? '' } : null,
      assignee_group: row.assignee_group_id ? { id: row.assignee_group_id, name: row.group_name ?? '' } : null,
    };
    const col = columnsMap.get(row.status);
    if (col) {
      col.push(shaped);
    }
  }

  const columns = TICKET_STATUSES.map((status) => {
    const ticketList = columnsMap.get(status) ?? [];
    return {
      status,
      tickets: ticketList,
      count: ticketList.length,
    };
  });

  return { columns };
}

/**
 * Get child tickets of a parent ticket.
 */
export async function getChildTickets(
  tenantId: string,
  ticketId: string,
): Promise<unknown[]> {
  const d = db();

  // Verify parent ticket exists
  const parentRows = await d
    .select({ id: tickets.id })
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenant_id, tenantId)))
    .limit(1);

  if (parentRows.length === 0) {
    throw new NotFoundError('Ticket not found');
  }

  const rows = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      ticket_type: tickets.ticket_type,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      assignee_id: tickets.assignee_id,
      assignee_group_id: tickets.assignee_group_id,
      created_at: tickets.created_at,
      updated_at: tickets.updated_at,
      assignee_name: users.display_name,
      group_name: assigneeGroups.name,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assignee_id, users.id))
    .leftJoin(assigneeGroups, eq(tickets.assignee_group_id, assigneeGroups.id))
    .where(
      and(
        eq(tickets.parent_ticket_id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .orderBy(asc(tickets.created_at));

  return rows.map((row) => ({
    id: row.id,
    ticket_number: row.ticket_number,
    ticket_type: row.ticket_type,
    title: row.title,
    status: row.status,
    priority: row.priority,
    assignee_id: row.assignee_id,
    assignee_group_id: row.assignee_group_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    assignee: row.assignee_id ? { id: row.assignee_id, display_name: row.assignee_name ?? '' } : null,
    assignee_group: row.assignee_group_id ? { id: row.assignee_group_id, name: row.group_name ?? '' } : null,
  }));
}

// ─── Ticket Timeline Stats ──────────────────────────────────────────

/**
 * Get ticket creation counts grouped by day for the last N days.
 */
export async function getTicketTimeline(
  tenantId: string,
  days: number,
): Promise<{ date: string; count: number }[]> {
  const d = db();
  const safeDays = Math.abs(Math.floor(days));

  // Use Drizzle's sql tag for SQLite strftime date grouping
  const rows = await d.all<{ date: string; count: number }>(
    sql`SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count
        FROM tickets
        WHERE tenant_id = ${tenantId}
          AND created_at >= datetime('now', ${`-${safeDays} days`})
        GROUP BY strftime('%Y-%m-%d', created_at)
        ORDER BY date ASC`,
  );

  return rows.map((r) => ({
    date: String(r.date),
    count: Number(r.count),
  }));
}

/**
 * Get ticket counts grouped by customer (top N).
 */
export async function getTicketsByCustomer(
  tenantId: string,
  limit: number,
): Promise<{ customer_name: string; count: number }[]> {
  const d = db();
  const safeLimit = Math.abs(Math.floor(limit));

  const rows = await d.all<{ customer_name: string; count: number }>(
    sql`SELECT COALESCE(c.name, 'Kein Kunde') as customer_name, COUNT(t.id) as count
        FROM tickets t
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.tenant_id = ${tenantId}
        GROUP BY t.customer_id, c.name
        ORDER BY count DESC
        LIMIT ${safeLimit}`,
  );

  return rows.map((r) => ({
    customer_name: String(r.customer_name),
    count: Number(r.count),
  }));
}

// ─── Ticket Categories CRUD ─────────────────────────────────────────

export async function listCategories(tenantId: string) {
  const d = db();
  return d
    .select()
    .from(ticketCategories)
    .where(eq(ticketCategories.tenant_id, tenantId))
    .orderBy(asc(ticketCategories.name));
}

export async function createCategory(
  tenantId: string,
  data: { name: string; applies_to?: string },
) {
  const d = db();
  const id = uuidv4();
  const now = new Date().toISOString();

  const [created] = await d
    .insert(ticketCategories)
    .values({
      id,
      tenant_id: tenantId,
      name: data.name,
      applies_to: data.applies_to ?? 'all',
      is_active: 1,
      created_at: now,
    })
    .returning();

  return created;
}

export async function updateCategory(
  tenantId: string,
  categoryId: string,
  data: { name?: string; applies_to?: string; is_active?: number },
) {
  const d = db();

  const existing = await d
    .select()
    .from(ticketCategories)
    .where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.tenant_id, tenantId)))
    .limit(1);

  if (!existing[0]) {
    throw new NotFoundError('Category not found');
  }

  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.applies_to !== undefined) updateSet.applies_to = data.applies_to;
  if (data.is_active !== undefined) updateSet.is_active = data.is_active;

  if (Object.keys(updateSet).length === 0) return existing[0];

  const [updated] = await d
    .update(ticketCategories)
    .set(updateSet)
    .where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.tenant_id, tenantId)))
    .returning();

  return updated;
}

// Returns 409 Conflict if tickets are still assigned to this category.
export async function deleteCategory(
  tenantId: string,
  categoryId: string,
): Promise<void> {
  const d = db();

  const existing = await d
    .select()
    .from(ticketCategories)
    .where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.tenant_id, tenantId)))
    .limit(1);

  if (!existing[0]) {
    throw new NotFoundError('Category not found');
  }

  // Check if any tickets use this category
  const [ticketCount] = await d
    .select({ cnt: count() })
    .from(tickets)
    .where(and(eq(tickets.tenant_id, tenantId), eq(tickets.category_id, categoryId)));

  const cnt = ticketCount?.cnt ?? 0;
  if (cnt > 0) {
    throw new ConflictError(
      `Category is assigned to ${cnt} ticket(s). Reassign them before deleting.`,
      { count: cnt },
    );
  }

  await d
    .delete(ticketCategories)
    .where(and(eq(ticketCategories.id, categoryId), eq(ticketCategories.tenant_id, tenantId)));
}

// ─── Batch Update ───────────────────────────────────────────────────

interface BatchUpdateFields {
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  assigned_group?: string | null;
  category_id?: string | null;
}

interface BatchUpdateResult {
  updated: number;
  errors: Array<{ ticket_id: string; message: string }>;
}

/**
 * Batch update multiple tickets within a transaction.
 * Each ticket is validated individually; failures are collected, not thrown.
 */
export async function batchUpdateTickets(
  tenantId: string,
  ticketIds: string[],
  updates: BatchUpdateFields,
  userId: string,
): Promise<BatchUpdateResult> {
  const d = db();
  const now = new Date().toISOString();
  const result: BatchUpdateResult = { updated: 0, errors: [] };

  await d.transaction(async (tx) => {
    for (const ticketId of ticketIds) {
      try {
        // Verify ticket exists and belongs to tenant
        const existingRows = await tx
          .select()
          .from(tickets)
          .where(
            and(
              eq(tickets.id, ticketId),
              eq(tickets.tenant_id, tenantId),
            ),
          )
          .limit(1);

        const existing = existingRows[0];
        if (!existing) {
          result.errors.push({ ticket_id: ticketId, message: 'Ticket not found' });
          continue;
        }

        const updateSet: Record<string, unknown> = { updated_at: now };
        const historyEntries: Array<{
          field: string;
          oldVal: string | null;
          newVal: string | null;
        }> = [];

        // Status
        if (updates.status !== undefined && updates.status !== existing.status) {
          updateSet['status'] = updates.status;
          historyEntries.push({
            field: 'status',
            oldVal: existing.status,
            newVal: updates.status,
          });

          if (updates.status === 'resolved' && existing.status !== 'resolved') {
            updateSet['resolved_at'] = now;
          }
          if (updates.status === 'closed' && existing.status !== 'closed') {
            updateSet['closed_at'] = now;
          }
        }

        // Priority
        if (updates.priority !== undefined && updates.priority !== existing.priority) {
          updateSet['priority'] = updates.priority;
          historyEntries.push({
            field: 'priority',
            oldVal: existing.priority,
            newVal: updates.priority,
          });
        }

        // Assignee
        if (updates.assigned_to !== undefined) {
          const newVal = updates.assigned_to;
          if (String(existing.assignee_id ?? '') !== String(newVal ?? '')) {
            updateSet['assignee_id'] = newVal;
            historyEntries.push({
              field: 'assignee_id',
              oldVal: existing.assignee_id,
              newVal,
            });
          }
        }

        // Assignee group
        if (updates.assigned_group !== undefined) {
          const newVal = updates.assigned_group;
          if (String(existing.assignee_group_id ?? '') !== String(newVal ?? '')) {
            updateSet['assignee_group_id'] = newVal;
            historyEntries.push({
              field: 'assignee_group_id',
              oldVal: existing.assignee_group_id,
              newVal,
            });
          }
        }

        // Category
        if (updates.category_id !== undefined) {
          const newVal = updates.category_id;
          if (String(existing.category_id ?? '') !== String(newVal ?? '')) {
            updateSet['category_id'] = newVal;
            historyEntries.push({
              field: 'category_id',
              oldVal: existing.category_id,
              newVal,
            });
          }
        }

        // Only update if there are actual changes beyond updated_at
        if (Object.keys(updateSet).length <= 1) {
          // No actual field changes — skip but don't count as error
          continue;
        }

        // Apply update
        await tx
          .update(tickets)
          .set(updateSet)
          .where(
            and(
              eq(tickets.id, ticketId),
              eq(tickets.tenant_id, tenantId),
            ),
          );

        // Record history entries
        for (const entry of historyEntries) {
          await tx.insert(ticketHistory).values({
            id: uuidv4(),
            tenant_id: tenantId,
            ticket_id: ticketId,
            field_changed: entry.field,
            old_value: entry.oldVal,
            new_value: entry.newVal,
            changed_by: userId,
            changed_at: now,
          });
        }

        result.updated++;
      } catch (err) {
        logger.warn({ err, ticketId }, 'Batch update failed for ticket');
        result.errors.push({
          ticket_id: ticketId,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  });

  logger.info(
    { tenantId, updated: result.updated, errors: result.errors.length, userId },
    'Batch ticket update completed',
  );

  return result;
}

// Only tickets with status 'closed' or 'resolved' may be archived.
export async function archiveTicket(
  tenantId: string,
  ticketId: string,
  userId: string,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();

  const existingRows = await d
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenant_id, tenantId)))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    throw new NotFoundError('Ticket not found');
  }

  if (existing.status !== 'closed' && existing.status !== 'resolved') {
    throw new ConflictError(
      'Only closed or resolved tickets can be archived',
      { current_status: existing.status },
    );
  }

  await recordHistory(tenantId, ticketId, 'status', existing.status, 'archived', userId);

  const [updated] = await d
    .update(tickets)
    .set({
      status: 'archived',
      updated_at: now,
    })
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenant_id, tenantId)))
    .returning();

  return updated;
}

// =============================================================================
// CAB (Change Advisory Board)
// =============================================================================

/**
 * List change tickets pending CAB approval.
 */
export async function listCabPending(tenantId: string) {
  const d = db();

  const rows = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      change_risk_level: tickets.change_risk_level,
      change_planned_start: tickets.change_planned_start,
      change_planned_end: tickets.change_planned_end,
      cab_required: tickets.cab_required,
      cab_decision: tickets.cab_decision,
      created_at: tickets.created_at,
      reporter_name: users.display_name,
    })
    .from(tickets)
    .leftJoin(users, eq(users.id, tickets.reporter_id))
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        eq(tickets.ticket_type, 'change'),
        eq(tickets.cab_required, 1),
        sql`(${tickets.cab_decision} IS NULL OR ${tickets.cab_decision} = 'deferred')`,
      ),
    )
    .orderBy(desc(tickets.created_at));

  return rows;
}

/**
 * List all CAB items (including decided) for the board view.
 */
export async function listCabAll(tenantId: string) {
  const d = db();

  const rows = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      change_risk_level: tickets.change_risk_level,
      change_planned_start: tickets.change_planned_start,
      change_planned_end: tickets.change_planned_end,
      cab_required: tickets.cab_required,
      cab_decision: tickets.cab_decision,
      cab_decision_at: tickets.cab_decision_at,
      cab_notes: tickets.cab_notes,
      created_at: tickets.created_at,
      reporter_name: users.display_name,
    })
    .from(tickets)
    .leftJoin(users, eq(users.id, tickets.reporter_id))
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        eq(tickets.ticket_type, 'change'),
        eq(tickets.cab_required, 1),
      ),
    )
    .orderBy(desc(tickets.created_at));

  return rows;
}

/**
 * Submit a CAB decision (approve/reject/defer).
 */
export async function setCabDecision(
  tenantId: string,
  ticketId: string,
  decision: string,
  notes: string | null,
  userId: string,
) {
  const d = db();
  const now = new Date().toISOString();

  const [existing] = await d
    .select({ id: tickets.id, cab_required: tickets.cab_required, cab_decision: tickets.cab_decision })
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenant_id, tenantId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Ticket not found');
  if (existing.cab_required !== 1) throw new ValidationError('This change does not require CAB approval');

  const [updated] = await d
    .update(tickets)
    .set({
      cab_decision: decision,
      cab_decision_by: userId,
      cab_decision_at: now,
      cab_notes: notes,
      updated_at: now,
    })
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenant_id, tenantId)))
    .returning();

  await recordHistory(tenantId, ticketId, 'cab_decision', existing.cab_decision ?? '', decision, userId);

  return updated;
}
