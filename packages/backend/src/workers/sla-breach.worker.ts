import { eq, and, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../config/database.js';
import { tickets, ticketComments, ticketHistory, tenants } from '../db/schema/index.js';
import logger from '../lib/logger.js';
import { notify, getAffectedUsers } from '../modules/notifications/notification.service.js';

// ─── Constants ───────────────────────────────────────────

const CHECK_INTERVAL_MS = 60_000; // 60 seconds
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// ─── State ───────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

// ─── Public API ──────────────────────────────────────────

/**
 * Start the SLA breach detection worker.
 * Runs every 60 seconds, checking all open tickets across all tenants
 * for SLA violations.
 */
export function startSlaBreachWorker(): void {
  if (intervalHandle) {
    logger.warn('[sla-breach] Worker already running');
    return;
  }

  logger.info('[sla-breach] Starting SLA breach detection worker');

  // Run immediately on first start
  void runBreachCheck();

  intervalHandle = setInterval(() => {
    void runBreachCheck();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the SLA breach detection worker.
 */
export function stopSlaBreachWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('[sla-breach] Worker stopped');
  }
}

// ─── Core Logic ──────────────────────────────────────────

/**
 * Check all open tickets for SLA breaches.
 * Iterates over all active tenants and checks each one.
 */
async function runBreachCheck(): Promise<void> {
  try {
    const d = db();
    const now = new Date().toISOString();

    // Get all active tenants
    const activeTenants = await d
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.is_active, 1));

    let totalChecked = 0;
    let totalBreached = 0;

    for (const tenant of activeTenants) {
      const result = await checkTenantBreaches(d, tenant.id, now);
      totalChecked += result.checked;
      totalBreached += result.breached;
    }

    if (totalBreached > 0) {
      logger.info(
        { checked: totalChecked, breached: totalBreached },
        `[sla-breach] Checked ${totalChecked} tickets, ${totalBreached} new breaches`,
      );
    }
  } catch (err) {
    logger.error({ err }, '[sla-breach] Breach check failed');
  }
}

/**
 * Check a single tenant's tickets for SLA breaches.
 */
async function checkTenantBreaches(
  d: TypedDb,
  tenantId: string,
  now: string,
): Promise<{ checked: number; breached: number }> {
  // Find open tickets with SLA due dates that haven't been breached yet
  const openTickets = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      ticket_type: tickets.ticket_type,
      assignee_id: tickets.assignee_id,
      reporter_id: tickets.reporter_id,
      status: tickets.status,
      sla_response_due: tickets.sla_response_due,
      sla_resolve_due: tickets.sla_resolve_due,
      sla_breached: tickets.sla_breached,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        ne(tickets.status, 'resolved'),
        ne(tickets.status, 'closed'),
        ne(tickets.status, 'archived'),
        eq(tickets.sla_breached, 0),
      ),
    );

  // Filter to only tickets with SLA due dates set
  const ticketsWithSla = openTickets.filter(
    (t) => t.sla_response_due || t.sla_resolve_due,
  );

  let breached = 0;

  for (const ticket of ticketsWithSla) {
    let isBreached = false;
    let breachType = '';

    // Check resolution SLA breach
    if (ticket.sla_resolve_due && ticket.sla_resolve_due < now) {
      isBreached = true;
      breachType = 'Resolution';
    }

    // Check response SLA breach (response = first non-system comment from agent)
    if (!isBreached && ticket.sla_response_due && ticket.sla_response_due < now) {
      // Check if there's already an agent response (non-internal comment with source='agent')
      const agentComments = await d
        .select({ id: ticketComments.id })
        .from(ticketComments)
        .where(
          and(
            eq(ticketComments.ticket_id, ticket.id),
            eq(ticketComments.tenant_id, tenantId),
            eq(ticketComments.source, 'agent'),
          ),
        )
        .limit(1);

      if (agentComments.length === 0) {
        isBreached = true;
        breachType = 'Response';
      }
    }

    if (isBreached) {
      // Mark ticket as breached
      await d
        .update(tickets)
        .set({
          sla_breached: 1,
          updated_at: now,
        })
        .where(
          and(
            eq(tickets.id, ticket.id),
            eq(tickets.tenant_id, tenantId),
          ),
        );

      // Add system comment
      await d.insert(ticketComments).values({
        id: uuidv4(),
        tenant_id: tenantId,
        ticket_id: ticket.id,
        author_id: SYSTEM_USER_ID,
        content: `SLA-Verletzung: ${breachType}-Zeit überschritten`,
        is_internal: 1,
        source: 'system',
        created_at: now,
      });

      // Add audit trail entry
      await d.insert(ticketHistory).values({
        id: uuidv4(),
        tenant_id: tenantId,
        ticket_id: ticket.id,
        field_changed: 'sla_breached',
        old_value: '0',
        new_value: '1',
        changed_by: SYSTEM_USER_ID,
        changed_at: now,
      });

      logger.warn(
        { ticketNumber: ticket.ticket_number, breachType, tenantId },
        `[sla-breach] SLA breach detected: ${ticket.ticket_number} (${breachType})`,
      );

      // Dispatch sla_breached notification
      const affectedUsers = await getAffectedUsers(
        tenantId,
        ticket.assignee_id,
        ticket.reporter_id,
      );
      void notify(tenantId, 'sla_breached', {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        ticket_title: ticket.title,
        ticket_type: ticket.ticket_type,
        field_changed: 'sla_breached',
        new_value: breachType,
      }, affectedUsers);

      breached++;
    }
  }

  return { checked: ticketsWithSla.length, breached };
}

// ─── DB Helper ───────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}
