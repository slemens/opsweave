import { eq, and } from 'drizzle-orm';

import { getDb, type TypedDb } from '../../config/database.js';
import { emailInboundConfigs } from '../../db/schema/email.js';
import { ImapPoller } from './imap-poller.js';
// AUDIT-FIX: H-11 — Structured logging
import logger from '../../lib/logger.js';

// ─── State ────────────────────────────────────────────────

/**
 * Tracks the setInterval handle for each active IMAP config so we can
 * stop polling cleanly on shutdown.
 */
const pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

// ─── Public API ───────────────────────────────────────────

/**
 * Load all active IMAP configs from the database and start a polling
 * interval for each one.
 *
 * Call this once after the server (and database) has started.
 */
export async function startEmailPollingWorker(): Promise<void> {
  logger.info('Starting IMAP polling worker');

  // Small delay to ensure the DB schema + seed have fully initialised
  // before we query email_inbound_configs (avoids race on fresh DB)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  let activeConfigs: Array<{
    id: string;
    tenant_id: string;
    config: string;
  }>;

  try {
    const d = getDb() as TypedDb;

    activeConfigs = await d
      .select({
        id: emailInboundConfigs.id,
        tenant_id: emailInboundConfigs.tenant_id,
        config: emailInboundConfigs.config,
      })
      .from(emailInboundConfigs)
      .where(
        and(
          eq(emailInboundConfigs.provider, 'imap'),
          eq(emailInboundConfigs.is_active, 1),
        ),
      );
  } catch (err) {
    logger.error({ err }, 'Failed to load active IMAP configurations');
    return;
  }

  logger.info({ count: activeConfigs.length }, 'Found active IMAP configurations');

  for (const cfg of activeConfigs) {
    schedulePolling(cfg);
  }
}

/**
 * Stop all polling intervals.  Call this during graceful shutdown.
 */
export function stopEmailPollingWorker(): void {
  if (pollingIntervals.size === 0) {
    return;
  }

  logger.info('Stopping IMAP polling worker');

  for (const [configId, handle] of pollingIntervals) {
    clearInterval(handle);
    logger.info({ configId }, 'Stopped polling for config');
  }

  pollingIntervals.clear();
}

// ─── Internal helpers ─────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // 60 seconds

function schedulePolling(cfg: {
  id: string;
  tenant_id: string;
  config: string;
}): void {
  if (pollingIntervals.has(cfg.id)) {
    logger.warn({ configId: cfg.id }, 'Already polling for config — skipping duplicate');
    return;
  }

  const poller = new ImapPoller(cfg);

  // Run immediately on start so the first poll does not wait 60 s
  runPoll(poller, cfg.id);

  const handle = setInterval(() => {
    runPoll(poller, cfg.id);
  }, POLL_INTERVAL_MS);

  pollingIntervals.set(cfg.id, handle);

  logger.info({ configId: cfg.id, intervalSec: POLL_INTERVAL_MS / 1000 }, 'Polling started for config');
}

function runPoll(poller: ImapPoller, configId: string): void {
  poller.poll().catch((err: unknown) => {
    logger.error({ err, configId }, 'Poll failed for config');
  });
}
