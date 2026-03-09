import { eq, and } from 'drizzle-orm';

import { getDb, type TypedDb } from '../../config/database.js';
import { emailInboundConfigs } from '../../db/schema/email.js';
import { ImapPoller } from './imap-poller.js';

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
  console.log('[EmailWorker] Starting IMAP polling worker...');

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
    console.error(
      '[EmailWorker] Failed to load active IMAP configurations:',
      err,
    );
    return;
  }

  console.log(
    `[EmailWorker] Found ${activeConfigs.length} active IMAP configuration(s)`,
  );

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

  console.log('[EmailWorker] Stopping IMAP polling worker...');

  for (const [configId, handle] of pollingIntervals) {
    clearInterval(handle);
    console.log(`[EmailWorker] Stopped polling for config ${configId}`);
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
    console.warn(
      `[EmailWorker] Already polling for config ${cfg.id} — skipping duplicate`,
    );
    return;
  }

  const poller = new ImapPoller(cfg);

  // Run immediately on start so the first poll does not wait 60 s
  runPoll(poller, cfg.id);

  const handle = setInterval(() => {
    runPoll(poller, cfg.id);
  }, POLL_INTERVAL_MS);

  pollingIntervals.set(cfg.id, handle);

  console.log(
    `[EmailWorker] Polling started for config ${cfg.id} (interval: ${POLL_INTERVAL_MS / 1000}s)`,
  );
}

function runPoll(poller: ImapPoller, configId: string): void {
  poller.poll().catch((err: unknown) => {
    console.error(`[EmailWorker] Poll failed for config ${configId}:`, err);
  });
}
