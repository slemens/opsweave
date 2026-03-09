import { eq, and, count, like, or, asc, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  tickets,
  ticketComments,
  ticketHistory,
  users,
  assigneeGroups,
  assets,
} from '../../db/schema/index.js';
import { NotFoundError } from '../../lib/errors.js';
import { TICKET_NUMBER_PREFIXES, TICKET_STATUSES } from '@opsweave/shared';
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
  const { page, limit, sort, order, q, status, ticket_type, priority, assignee_id, assignee_group_id, asset_id, customer_id } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(tickets.tenant_id, tenantId)];

  if (status) conditions.push(eq(tickets.status, status));
  if (ticket_type) conditions.push(eq(tickets.ticket_type, ticket_type));
  if (priority) conditions.push(eq(tickets.priority, priority));
  if (assignee_id) conditions.push(eq(tickets.assignee_id, assignee_id));
  if (assignee_group_id) conditions.push(eq(tickets.assignee_group_id, assignee_group_id));
  if (asset_id) conditions.push(eq(tickets.asset_id, asset_id));
  if (customer_id) conditions.push(eq(tickets.customer_id, customer_id));

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
      source: tickets.source,
      created_at: tickets.created_at,
      updated_at: tickets.updated_at,
      resolved_at: tickets.resolved_at,
      closed_at: tickets.closed_at,
      created_by: tickets.created_by,
      assignee_name: users.display_name,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assignee_id, users.id))
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return { tickets: rows, total };
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
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assignee_id, users.id))
    .leftJoin(assigneeGroups, eq(tickets.assignee_group_id, assigneeGroups.id))
    .leftJoin(assets, eq(tickets.asset_id, assets.id))
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const ticket = rows[0];
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  return ticket;
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
      priority: data.priority ?? 'medium',
      impact: data.impact ?? null,
      urgency: data.urgency ?? null,
      asset_id: data.asset_id ?? null,
      assignee_id: data.assignee_id ?? null,
      assignee_group_id: data.assignee_group_id ?? null,
      reporter_id: creatorId,
      customer_id: data.customer_id ?? null,
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

  // Handle status transitions
  if (data.status) {
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

  return comments;
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
      created_at: tickets.created_at,
      updated_at: tickets.updated_at,
      assignee_name: users.display_name,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assignee_id, users.id))
    .where(and(...conditions))
    .orderBy(desc(tickets.updated_at));

  const columnsMap = new Map<string, unknown[]>();

  for (const s of TICKET_STATUSES) {
    columnsMap.set(s, []);
  }

  for (const row of rows) {
    const col = columnsMap.get(row.status);
    if (col) {
      col.push(row);
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
