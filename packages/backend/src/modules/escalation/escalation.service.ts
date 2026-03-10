import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  escalationRules,
  tickets,
  ticketComments,
  ticketHistory,
} from '../../db/schema/index.js';
import logger from '../../lib/logger.js';
import {
  notify,
  getAffectedUsers,
  getTenantAdminsAndManagers,
} from '../notifications/notification.service.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// SYSTEM_USER_ID reserved for future auto-escalation actions

// ─── Escalation Rules CRUD ───────────────────────────────

export async function listRules(tenantId: string) {
  const d = db();
  return d
    .select()
    .from(escalationRules)
    .where(eq(escalationRules.tenant_id, tenantId));
}

export async function createRule(
  tenantId: string,
  data: {
    name: string;
    ticket_type?: string | null;
    priority?: string | null;
    sla_threshold_pct?: number;
    target_group_id: string;
    escalation_level?: number;
  },
) {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  const [created] = await d
    .insert(escalationRules)
    .values({
      id,
      tenant_id: tenantId,
      name: data.name,
      ticket_type: data.ticket_type ?? null,
      priority: data.priority ?? null,
      sla_threshold_pct: data.sla_threshold_pct ?? 80,
      target_group_id: data.target_group_id,
      escalation_level: data.escalation_level ?? 1,
      is_active: 1,
      created_at: now,
      updated_at: now,
    })
    .returning();

  return created;
}

export async function updateRule(
  tenantId: string,
  ruleId: string,
  data: {
    name?: string;
    ticket_type?: string | null;
    priority?: string | null;
    sla_threshold_pct?: number;
    target_group_id?: string;
    escalation_level?: number;
    is_active?: boolean;
  },
) {
  const d = db();
  const now = new Date().toISOString();

  const existing = await d
    .select()
    .from(escalationRules)
    .where(
      and(
        eq(escalationRules.id, ruleId),
        eq(escalationRules.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Escalation rule not found');
  }

  const updates: Record<string, unknown> = { updated_at: now };
  if (data.name !== undefined) updates.name = data.name;
  if (data.ticket_type !== undefined) updates.ticket_type = data.ticket_type;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.sla_threshold_pct !== undefined) updates.sla_threshold_pct = data.sla_threshold_pct;
  if (data.target_group_id !== undefined) updates.target_group_id = data.target_group_id;
  if (data.escalation_level !== undefined) updates.escalation_level = data.escalation_level;
  if (data.is_active !== undefined) updates.is_active = data.is_active ? 1 : 0;

  await d
    .update(escalationRules)
    .set(updates)
    .where(
      and(
        eq(escalationRules.id, ruleId),
        eq(escalationRules.tenant_id, tenantId),
      ),
    );

  const [updated] = await d
    .select()
    .from(escalationRules)
    .where(eq(escalationRules.id, ruleId));

  return updated;
}

export async function deleteRule(tenantId: string, ruleId: string) {
  const d = db();

  const existing = await d
    .select()
    .from(escalationRules)
    .where(
      and(
        eq(escalationRules.id, ruleId),
        eq(escalationRules.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Escalation rule not found');
  }

  await d
    .delete(escalationRules)
    .where(
      and(
        eq(escalationRules.id, ruleId),
        eq(escalationRules.tenant_id, tenantId),
      ),
    );
}

// ─── Manual Escalation ───────────────────────────────────

export async function manualEscalate(
  tenantId: string,
  ticketId: string,
  userId: string,
  data: { target_group_id: string; reason?: string },
) {
  const d = db();
  const now = new Date().toISOString();

  const [ticket] = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      ticket_type: tickets.ticket_type,
      assignee_id: tickets.assignee_id,
      reporter_id: tickets.reporter_id,
      escalation_level: tickets.escalation_level,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  const newLevel = ticket.escalation_level + 1;

  await d
    .update(tickets)
    .set({
      assignee_group_id: data.target_group_id,
      escalation_level: newLevel,
      escalated_at: now,
      updated_at: now,
    })
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    );

  // System comment
  const reason = data.reason ?? 'Manuelle Eskalation';
  await d.insert(ticketComments).values({
    id: uuidv4(),
    tenant_id: tenantId,
    ticket_id: ticketId,
    author_id: userId,
    content: `Eskalation (Level ${newLevel}): ${reason}`,
    is_internal: 1,
    source: 'system',
    created_at: now,
  });

  // Audit trail
  await d.insert(ticketHistory).values({
    id: uuidv4(),
    tenant_id: tenantId,
    ticket_id: ticketId,
    field_changed: 'escalation_level',
    old_value: String(ticket.escalation_level),
    new_value: String(newLevel),
    changed_by: userId,
    changed_at: now,
  });

  // Notify
  const affectedUsers = await getAffectedUsers(
    tenantId,
    ticket.assignee_id,
    ticket.reporter_id,
    userId,
  );
  void notify(tenantId, 'ticket_escalated', {
    ticket_id: ticketId,
    ticket_number: ticket.ticket_number,
    ticket_title: ticket.title,
    ticket_type: ticket.ticket_type,
    new_value: reason,
  }, affectedUsers);

  logger.info(
    { ticketNumber: ticket.ticket_number, newLevel, tenantId },
    `Manual escalation: ${ticket.ticket_number} to level ${newLevel}`,
  );
}

// ─── Major Incident ──────────────────────────────────────

export async function declareMajorIncident(
  tenantId: string,
  ticketId: string,
  userId: string,
  data: { incident_commander_id?: string | null; bridge_call_url?: string | null },
) {
  const d = db();
  const now = new Date().toISOString();

  const [ticket] = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      ticket_type: tickets.ticket_type,
      assignee_id: tickets.assignee_id,
      reporter_id: tickets.reporter_id,
      is_major_incident: tickets.is_major_incident,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  if (ticket.ticket_type !== 'incident') {
    throw new ValidationError('Only incidents can be declared as major');
  }

  if (ticket.is_major_incident === 1) {
    throw new ValidationError('Ticket is already a major incident');
  }

  await d
    .update(tickets)
    .set({
      subtype: 'major',
      is_major_incident: 1,
      major_declared_at: now,
      major_declared_by: userId,
      incident_commander_id: data.incident_commander_id ?? null,
      bridge_call_url: data.bridge_call_url ?? null,
      updated_at: now,
    })
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    );

  // System comment
  await d.insert(ticketComments).values({
    id: uuidv4(),
    tenant_id: tenantId,
    ticket_id: ticketId,
    author_id: userId,
    content: 'Major Incident ausgerufen',
    is_internal: 1,
    source: 'system',
    created_at: now,
  });

  // Audit trail
  await d.insert(ticketHistory).values({
    id: uuidv4(),
    tenant_id: tenantId,
    ticket_id: ticketId,
    field_changed: 'is_major_incident',
    old_value: '0',
    new_value: '1',
    changed_by: userId,
    changed_at: now,
  });

  // Notify ALL admins/managers in the tenant
  const adminUsers = await getTenantAdminsAndManagers(tenantId);
  const affectedUsers = await getAffectedUsers(
    tenantId,
    ticket.assignee_id,
    ticket.reporter_id,
  );
  const allUsers = [...new Set([...adminUsers, ...affectedUsers])];

  void notify(tenantId, 'major_incident_declared', {
    ticket_id: ticketId,
    ticket_number: ticket.ticket_number,
    ticket_title: ticket.title,
    ticket_type: ticket.ticket_type,
    changed_by_name: userId, // Will be resolved in dispatch
  }, allUsers);

  logger.warn(
    { ticketNumber: ticket.ticket_number, tenantId },
    `Major incident declared: ${ticket.ticket_number}`,
  );
}

export async function resolveMajorIncident(
  tenantId: string,
  ticketId: string,
  userId: string,
) {
  const d = db();
  const now = new Date().toISOString();

  const [ticket] = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      ticket_type: tickets.ticket_type,
      assignee_id: tickets.assignee_id,
      reporter_id: tickets.reporter_id,
      is_major_incident: tickets.is_major_incident,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  if (ticket.is_major_incident !== 1) {
    throw new ValidationError('Ticket is not a major incident');
  }

  await d
    .update(tickets)
    .set({
      is_major_incident: 0,
      updated_at: now,
    })
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
      ),
    );

  // System comment
  await d.insert(ticketComments).values({
    id: uuidv4(),
    tenant_id: tenantId,
    ticket_id: ticketId,
    author_id: userId,
    content: 'Major Incident aufgehoben',
    is_internal: 1,
    source: 'system',
    created_at: now,
  });

  // Notify ALL admins/managers
  const adminUsers = await getTenantAdminsAndManagers(tenantId);
  const affectedUsers = await getAffectedUsers(
    tenantId,
    ticket.assignee_id,
    ticket.reporter_id,
  );
  const allUsers = [...new Set([...adminUsers, ...affectedUsers])];

  void notify(tenantId, 'major_incident_resolved', {
    ticket_id: ticketId,
    ticket_number: ticket.ticket_number,
    ticket_title: ticket.title,
    ticket_type: ticket.ticket_type,
  }, allUsers);

  logger.info(
    { ticketNumber: ticket.ticket_number, tenantId },
    `Major incident resolved: ${ticket.ticket_number}`,
  );
}
