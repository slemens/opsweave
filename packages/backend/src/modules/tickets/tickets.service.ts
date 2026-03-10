import { eq, ne, and, count, like, or, asc, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { slaEngine } from '../../lib/sla-engine.js';
// AUDIT-FIX: H-11 — Structured logging
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
} from '../../db/schema/index.js';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors.js';
import { TICKET_NUMBER_PREFIXES, TICKET_STATUSES, calculatePriority } from '@opsweave/shared';
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

// ─── Service ──────────────────────────────────────────────

/**
 * List tickets with filtering, pagination, and sorting.
 */
export async function listTickets(
  tenantId: string,
  params: TicketFilterParams,
): Promise<{ tickets: unknown[]; total: number }> {
  const d = db();
  const { page, limit, sort, order, q, status, ticket_type, priority, assignee_id, assignee_group_id, asset_id, customer_id, category_id } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(tickets.tenant_id, tenantId)];

  // AUDIT-FIX: H-05 — Exclude archived tickets from standard queries.
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

  // SLA-Vererbung: falls asset_id gesetzt → effektives SLA-Tier aus Asset-Hierarchie ableiten.
  // Das Ticket hat kein eigenes sla_tier-Eingabefeld; der Wert wird immer vom Asset geerbt.
  let effectiveSlaTier: string | null = null;

  if (data.asset_id) {
    try {
      effectiveSlaTier = await slaEngine.resolveSlaTier(tenantId, data.asset_id);
    } catch (err) {
      // AUDIT-FIX: H-11 — Structured logging
      logger.warn({ err, assetId: data.asset_id }, 'SLA resolution failed for asset');
    }
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
      parent_ticket_id: data.parent_ticket_id ?? null,
      sla_tier: effectiveSlaTier ?? null,
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

  const history = await d
    .select({
      id: ticketHistory.id,
      tenant_id: ticketHistory.tenant_id,
      ticket_id: ticketHistory.ticket_id,
      field_changed: ticketHistory.field_changed,
      old_value: ticketHistory.old_value,
      new_value: ticketHistory.new_value,
      changed_by: ticketHistory.changed_by,
      changed_at: ticketHistory.changed_at,
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

  return history;
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

// AUDIT-FIX: H-06 — Delete a ticket category (hard delete).
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

// AUDIT-FIX: H-05 — Archive a ticket (soft status transition).
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
