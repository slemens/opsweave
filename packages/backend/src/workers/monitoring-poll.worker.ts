import { eq } from 'drizzle-orm';

import { getDb, type TypedDb } from '../config/database.js';
import { monitoringSources } from '../db/schema/index.js';
import { getAdapter } from '../modules/monitoring/adapters/index.js';
import { ingestWebhookEvent } from '../modules/monitoring/monitoring.service.js';
import logger from '../lib/logger.js';

// ─── Constants ───────────────────────────────────────────

const DEFAULT_POLL_INTERVAL_MS = 60_000; // 60 seconds

// ─── State ───────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Public API ──────────────────────────────────────────

export function startMonitoringPollWorker(): void {
  if (intervalHandle) {
    logger.warn('[monitoring-poll] Worker already running');
    return;
  }

  logger.info('[monitoring-poll] Starting monitoring poll worker');

  // Run immediately, then at interval
  void runPollCycle();

  intervalHandle = setInterval(() => {
    void runPollCycle();
  }, DEFAULT_POLL_INTERVAL_MS);
}

export function stopMonitoringPollWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('[monitoring-poll] Worker stopped');
  }
}

// ─── Core Logic ──────────────────────────────────────────

async function runPollCycle(): Promise<void> {
  try {
    // Get all active sources that have an adapter (not webhook-only)
    const sources = await db()
      .select()
      .from(monitoringSources)
      .where(eq(monitoringSources.is_active, 1));

    for (const source of sources) {
      const adapter = getAdapter(source.type);
      if (!adapter) continue; // Webhook-only source, skip polling

      const config = JSON.parse(source.config || '{}') as Record<string, unknown>;

      try {
        const events = await adapter.fetchEvents(config);

        let newEvents = 0;
        let skipped = 0;

        for (const event of events) {
          const result = await ingestWebhookEvent(source.tenant_id, source.id, {
            hostname: event.hostname,
            service_name: event.service_name ?? undefined,
            state: event.state,
            output: event.output ?? undefined,
            external_id: event.external_id ?? undefined,
          });

          if (result.deduplicated) {
            skipped++;
          } else {
            newEvents++;
          }
        }

        if (newEvents > 0 || skipped > 0) {
          logger.info(
            { source: source.name, newEvents, skipped },
            `[monitoring-poll] Source "${source.name}": ${newEvents} new events, ${skipped} deduplicated`,
          );
        }
      } catch (err) {
        logger.error(
          { err, source: source.name },
          `[monitoring-poll] Error polling source "${source.name}"`,
        );
      }
    }
  } catch (err) {
    logger.error({ err }, '[monitoring-poll] Error in poll cycle');
  }
}
