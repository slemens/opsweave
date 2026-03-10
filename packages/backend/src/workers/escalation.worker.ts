import { eq, and, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../config/database.js';
import {
  tickets,
  ticketComments,
  ticketHistory,
  tenants,
  escalationRules,
} from '../db/schema/index.js';
import logger from '../lib/logger.js';
import { notify, getAffectedUsers } from '../modules/notifications/notification.service.js';

// ─── Constants ───────────────────────────────────────────

const CHECK_INTERVAL_MS = 60_000; // 60 seconds
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// ─── State ───────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

// ─── Public API ──────────────────────────────────────────

export function startEscalationWorker(): void {
  if (intervalHandle) {
    logger.warn('[escalation] Worker already running');
    return;
  }

  logger.info('[escalation] Starting auto-escalation worker');

  // First run after a short delay to let the app start
  setTimeout(() => void runEscalationCheck(), 5_000);

  intervalHandle = setInterval(() => {
    void runEscalationCheck();
  }, CHECK_INTERVAL_MS);
}

export function stopEscalationWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('[escalation] Worker stopped');
  }
}

// ─── Core Logic ──────────────────────────────────────────

async function runEscalationCheck(): Promise<void> {
  try {
    const d = db();
    const now = new Date().toISOString();

    const activeTenants = await d
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.is_active, 1));

    let totalEscalated = 0;

    for (const tenant of activeTenants) {
      const result = await checkTenantEscalations(d, tenant.id, now);
      totalEscalated += result;
    }

    if (totalEscalated > 0) {
      logger.info(
        { escalated: totalEscalated },
        `[escalation] Auto-escalated ${totalEscalated} ticket(s)`,
      );
    }
  } catch (err) {
    logger.error({ err }, '[escalation] Escalation check failed');
  }
}

async function checkTenantEscalations(
  d: TypedDb,
  tenantId: string,
  now: string,
): Promise<number> {
  // Get active escalation rules for this tenant
  const rules = await d
    .select()
    .from(escalationRules)
    .where(
      and(
        eq(escalationRules.tenant_id, tenantId),
        eq(escalationRules.is_active, 1),
      ),
    );

  if (rules.length === 0) return 0;

  // Get open tickets with SLA that haven't been fully breached yet
  const openTickets = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      ticket_type: tickets.ticket_type,
      priority: tickets.priority,
      assignee_id: tickets.assignee_id,
      assignee_group_id: tickets.assignee_group_id,
      reporter_id: tickets.reporter_id,
      sla_resolve_due: tickets.sla_resolve_due,
      sla_paused_at: tickets.sla_paused_at,
      sla_paused_total: tickets.sla_paused_total,
      escalation_level: tickets.escalation_level,
      created_at: tickets.created_at,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        ne(tickets.status, 'resolved'),
        ne(tickets.status, 'closed'),
        ne(tickets.status, 'archived'),
        ne(tickets.status, 'pending'), // Don't escalate paused tickets
      ),
    );

  // Filter to tickets with SLA due dates
  const ticketsWithSla = openTickets.filter((t) => t.sla_resolve_due);

  let escalated = 0;

  for (const ticket of ticketsWithSla) {
    // Calculate effective elapsed percentage
    const createdMs = new Date(ticket.created_at).getTime();
    const dueMs = new Date(ticket.sla_resolve_due!).getTime();
    const nowMs = new Date(now).getTime();
    const totalMs = dueMs - createdMs;
    if (totalMs <= 0) continue;

    // Account for pause time
    const pausedMs = (ticket.sla_paused_total ?? 0) * 1000;
    const elapsedMs = nowMs - createdMs - pausedMs;
    const pctElapsed = Math.round((elapsedMs / totalMs) * 100);

    // Find matching rules that haven't been applied yet
    for (const rule of rules) {
      // Check if rule applies to this ticket
      if (rule.ticket_type && rule.ticket_type !== ticket.ticket_type) continue;
      if (rule.priority && rule.priority !== ticket.priority) continue;
      if (rule.escalation_level <= ticket.escalation_level) continue; // Already at or past this level
      if (pctElapsed < rule.sla_threshold_pct) continue; // Not yet at threshold

      // Escalate!
      await d
        .update(tickets)
        .set({
          assignee_group_id: rule.target_group_id,
          escalation_level: rule.escalation_level,
          escalated_at: ticket.escalation_level === 0 ? now : undefined, // Only set on first escalation
          updated_at: now,
        })
        .where(
          and(
            eq(tickets.id, ticket.id),
            eq(tickets.tenant_id, tenantId),
          ),
        );

      // System comment
      await d.insert(ticketComments).values({
        id: uuidv4(),
        tenant_id: tenantId,
        ticket_id: ticket.id,
        author_id: SYSTEM_USER_ID,
        content: `Auto-Eskalation (Level ${rule.escalation_level}): ${rule.name} — SLA bei ${pctElapsed}%`,
        is_internal: 1,
        source: 'system',
        created_at: now,
      });

      // Audit trail
      await d.insert(ticketHistory).values({
        id: uuidv4(),
        tenant_id: tenantId,
        ticket_id: ticket.id,
        field_changed: 'escalation_level',
        old_value: String(ticket.escalation_level),
        new_value: String(rule.escalation_level),
        changed_by: SYSTEM_USER_ID,
        changed_at: now,
      });

      // Notify
      const affectedUsers = await getAffectedUsers(
        tenantId,
        ticket.assignee_id,
        ticket.reporter_id,
      );
      void notify(tenantId, 'ticket_escalated', {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        ticket_title: ticket.title,
        ticket_type: ticket.ticket_type,
        new_value: `Level ${rule.escalation_level}: ${rule.name}`,
      }, affectedUsers);

      logger.warn(
        {
          ticketNumber: ticket.ticket_number,
          escalationLevel: rule.escalation_level,
          ruleName: rule.name,
          pctElapsed,
          tenantId,
        },
        `[escalation] Auto-escalated ${ticket.ticket_number} to level ${rule.escalation_level}`,
      );

      escalated++;
      break; // Only apply one rule per check cycle per ticket
    }
  }

  return escalated;
}

// ─── DB Helper ───────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}
