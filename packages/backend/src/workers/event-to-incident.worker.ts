import { eq, and, isNull, ne, like, or, sql, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../config/database.js';
import {
  monitoringEvents,
  monitoringSources,
  tickets,
  ticketComments,
  ticketHistory,
  assets,
} from '../db/schema/index.js';
import logger from '../lib/logger.js';
import { notify } from '../modules/notifications/notification.service.js';

// ─── Constants ───────────────────────────────────────────

const CHECK_INTERVAL_MS = 30_000; // 30 seconds
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// ─── State ───────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Public API ──────────────────────────────────────────

export function startEventToIncidentWorker(): void {
  if (intervalHandle) {
    logger.warn('[event-to-incident] Worker already running');
    return;
  }

  logger.info('[event-to-incident] Starting event-to-incident worker');

  // Delay first run slightly to let other workers initialize
  setTimeout(() => void runCycle(), 5_000);

  intervalHandle = setInterval(() => {
    void runCycle();
  }, CHECK_INTERVAL_MS);
}

export function stopEventToIncidentWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('[event-to-incident] Worker stopped');
  }
}

// ─── Core Logic ──────────────────────────────────────────

async function runCycle(): Promise<void> {
  try {
    // 1. Process unprocessed critical events → create or append to incidents
    await processNewCriticalEvents();

    // 2. Auto-resolve incidents whose events are now OK
    await autoResolveIncidents();
  } catch (err) {
    logger.error({ err }, '[event-to-incident] Error in cycle');
  }
}

async function processNewCriticalEvents(): Promise<void> {
  const d = db();

  // Get unprocessed critical events
  const criticalEvents = await d
    .select()
    .from(monitoringEvents)
    .where(
      and(
        eq(monitoringEvents.state, 'critical'),
        eq(monitoringEvents.processed, 0),
        isNull(monitoringEvents.ticket_id),
      ),
    );

  if (criticalEvents.length === 0) return;

  for (const event of criticalEvents) {
    try {
      // Load source config for auto_create_incidents setting
      const [source] = await d
        .select()
        .from(monitoringSources)
        .where(eq(monitoringSources.id, event.source_id))
        .limit(1);

      if (!source) continue;

      const sourceConfig = JSON.parse(source.config || '{}') as Record<string, unknown>;
      if (sourceConfig.auto_create_incidents === false) {
        // Mark as processed but don't create ticket
        await d.update(monitoringEvents)
          .set({ processed: 1, processed_at: new Date().toISOString() })
          .where(eq(monitoringEvents.id, event.id));
        continue;
      }

      // Asset matching: hostname → CMDB
      let matchedAssetId: string | null = null;
      const [asset] = await d
        .select({ id: assets.id, customer_id: assets.customer_id })
        .from(assets)
        .where(
          and(
            eq(assets.tenant_id, event.tenant_id),
            or(
              eq(assets.name, event.hostname),
              like(assets.ip_address, event.hostname),
            ),
          ),
        )
        .limit(1);

      if (asset) {
        matchedAssetId = asset.id;
        // Update event with matched asset
        await d.update(monitoringEvents)
          .set({ matched_asset_id: matchedAssetId })
          .where(eq(monitoringEvents.id, event.id));
      }

      // Dedup: Check for existing open incident for same hostname + service
      const [existingTicket] = await d
        .select({ id: tickets.id, ticket_number: tickets.ticket_number })
        .from(tickets)
        .where(
          and(
            eq(tickets.tenant_id, event.tenant_id),
            eq(tickets.ticket_type, 'incident'),
            eq(tickets.source, 'monitoring'),
            ne(tickets.status, 'closed'),
            ne(tickets.status, 'resolved'),
            like(tickets.title, `%${event.hostname}%`),
          ),
        )
        .limit(1);

      const now = new Date().toISOString();

      if (existingTicket) {
        // Append comment to existing ticket
        await d.insert(ticketComments)
          .values({
            id: uuidv4(),
            tenant_id: event.tenant_id,
            ticket_id: existingTicket.id,
            author_id: SYSTEM_USER_ID,
            content: `[MON] Erneutes Event: ${event.hostname}${event.service_name ? ` / ${event.service_name}` : ''} — ${event.output ?? 'CRITICAL'}`,
            is_internal: 1,
            source: 'system',
            created_at: now,
          });

        // Link event to existing ticket
        await d.update(monitoringEvents)
          .set({ ticket_id: existingTicket.id, processed: 1, processed_at: now })
          .where(eq(monitoringEvents.id, event.id));

        logger.info(
          { ticket: existingTicket.ticket_number, hostname: event.hostname },
          '[event-to-incident] Appended to existing incident',
        );
      } else {
        // Create new incident ticket
        const year = new Date().getFullYear();
        const [lastTicket] = await d
          .select({ ticket_number: tickets.ticket_number })
          .from(tickets)
          .where(
            and(
              eq(tickets.tenant_id, event.tenant_id),
              eq(tickets.ticket_type, 'incident'),
              like(tickets.ticket_number, `INC-${year}-%`),
            ),
          )
          .orderBy(sql`${tickets.ticket_number} DESC`)
          .limit(1);

        let seq = 1;
        if (lastTicket) {
          const parts = lastTicket.ticket_number.split('-');
          seq = parseInt(parts[2] ?? '0', 10) + 1;
        }

        const ticketNumber = `INC-${year}-${String(seq).padStart(5, '0')}`;
        const ticketId = uuidv4();
        const title = `[MON] ${event.hostname}: ${event.service_name ?? 'Host'} is ${event.state.toUpperCase()}`;

        await d.insert(tickets)
          .values({
            id: ticketId,
            tenant_id: event.tenant_id,
            ticket_number: ticketNumber,
            ticket_type: 'incident',
            title,
            description: event.output ?? `Monitoring alert: ${event.hostname} - ${event.state}`,
            status: 'open',
            priority: 'high', // Critical events get high priority
            source: 'monitoring',
            asset_id: matchedAssetId,
            customer_id: asset?.customer_id ?? null,
            assignee_group_id: (sourceConfig.default_group_id as string) ?? null,
            reporter_id: SYSTEM_USER_ID,
            created_by: SYSTEM_USER_ID,
            created_at: now,
            updated_at: now,
          });

        // Link event to new ticket
        await d.update(monitoringEvents)
          .set({ ticket_id: ticketId, processed: 1, processed_at: now })
          .where(eq(monitoringEvents.id, event.id));

        logger.info(
          { ticket: ticketNumber, hostname: event.hostname },
          '[event-to-incident] Created new monitoring incident',
        );

        // Notify — fire-and-forget to system user as reporter
        try {
          notify(event.tenant_id, 'ticket_assigned', {
            ticket_id: ticketId,
            ticket_number: ticketNumber,
            ticket_title: title,
            ticket_type: 'incident',
          }, [SYSTEM_USER_ID]);
        } catch {
          // Notification errors should not block incident creation
        }
      }
    } catch (err) {
      logger.error(
        { err, eventId: event.id },
        '[event-to-incident] Error processing event',
      );
      // Mark as processed to prevent infinite retry loops
      await db()
        .update(monitoringEvents)
        .set({ processed: 1, processed_at: new Date().toISOString() })
        .where(eq(monitoringEvents.id, event.id));
    }
  }
}

async function autoResolveIncidents(): Promise<void> {
  const d = db();

  // Find open monitoring incidents
  const openMonitoringTickets = await d
    .select({
      id: tickets.id,
      tenant_id: tickets.tenant_id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.ticket_type, 'incident'),
        eq(tickets.source, 'monitoring'),
        ne(tickets.status, 'closed'),
        ne(tickets.status, 'resolved'),
      ),
    );

  for (const ticket of openMonitoringTickets) {
    // Check if all linked events are now OK
    const linkedEvents = await d
      .select({ state: monitoringEvents.state })
      .from(monitoringEvents)
      .where(eq(monitoringEvents.ticket_id, ticket.id));

    if (linkedEvents.length === 0) continue;

    // Extract hostname from title: "[MON] hostname: ..."
    const hostnameMatch = ticket.title.match(/\[MON\]\s+([^:]+)/);
    if (!hostnameMatch?.[1]) continue;
    const hostname = hostnameMatch[1].trim();

    // Use ISO timestamp comparison that works on both SQLite and PostgreSQL
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const [recentOkEvent] = await d
      .select({ id: monitoringEvents.id })
      .from(monitoringEvents)
      .where(
        and(
          eq(monitoringEvents.tenant_id, ticket.tenant_id),
          eq(monitoringEvents.hostname, hostname),
          eq(monitoringEvents.state, 'ok'),
          gt(monitoringEvents.received_at, fiveMinutesAgo),
        ),
      )
      .limit(1);

    if (recentOkEvent) {
      const now = new Date().toISOString();

      // Auto-resolve the incident
      await d.update(tickets)
        .set({ status: 'resolved', resolved_at: now, updated_at: now })
        .where(eq(tickets.id, ticket.id));

      // System comment
      await d.insert(ticketComments)
        .values({
          id: uuidv4(),
          tenant_id: ticket.tenant_id,
          ticket_id: ticket.id,
          author_id: SYSTEM_USER_ID,
          content: `[MON] Monitoring meldet OK — automatisch gelöst`,
          is_internal: 1,
          source: 'system',
          created_at: now,
        });

      // History entry
      await d.insert(ticketHistory)
        .values({
          id: uuidv4(),
          tenant_id: ticket.tenant_id,
          ticket_id: ticket.id,
          field_changed: 'status',
          old_value: 'open',
          new_value: 'resolved',
          changed_by: SYSTEM_USER_ID,
          changed_at: now,
        });

      logger.info(
        { ticket: ticket.ticket_number },
        '[event-to-incident] Auto-resolved monitoring incident',
      );
    }
  }
}
