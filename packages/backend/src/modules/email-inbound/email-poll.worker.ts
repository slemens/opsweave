import { eq, and } from 'drizzle-orm';

import { getDb, type TypedDb } from '../../config/database.js';
import { emailInboundConfigs } from '../../db/schema/email.js';
import { ImapPoller } from './imap-poller.js';
import logger from '../../lib/logger.js';

// ─── State ────────────────────────────────────────────────

/**
 * Tracks the setInterval handle for each active IMAP config so we can
 * stop polling cleanly on shutdown.
 */
const pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_FACTOR = 2;
const MAX_RETRIES = 10;

// ─── Public API ───────────────────────────────────────────

/**
 * Wait for the database to become available using exponential backoff,
 * then load all active IMAP configs and start polling.
 *
 * Call this once after the server has started.
 */
export async function startEmailPollingWorker(): Promise<void> {
  logger.info('[email-poll] Starting IMAP polling worker');

  const dbReady = await waitForDb();
  if (!dbReady) {
    logger.error('[email-poll] DB not reachable after retries — polling will not start. Retrying in background.');
    // Schedule a background retry that keeps trying indefinitely
    scheduleBackgroundRetry();
    return;
  }

  await loadAndStartPolling();
}

/**
 * Stop all polling intervals.  Call this during graceful shutdown.
 */
export function stopEmailPollingWorker(): void {
  if (pollingIntervals.size === 0) {
    return;
  }

  logger.info('[email-poll] Stopping IMAP polling worker');

  for (const [configId, handle] of pollingIntervals) {
    clearInterval(handle);
    logger.info({ configId }, '[email-poll] Stopped polling for config');
  }

  pollingIntervals.clear();
}

// ─── DB readiness check ──────────────────────────────────

// Cross-DB health check: try loading email configs (proves tables exist + DB connection works)
async function checkDbReady(): Promise<void> {
  const db = getDb() as TypedDb;
  // Drizzle query builder is awaitable for both SQLite and PostgreSQL
  await db.select({ id: emailInboundConfigs.id }).from(emailInboundConfigs).limit(1);
}

async function waitForDb(): Promise<boolean> {
  let delay = BACKOFF_INITIAL_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await checkDbReady();
      logger.info(`[email-poll] DB ready (attempt ${attempt}/${MAX_RETRIES})`);
      return true;
    } catch (err) {
      logger.warn(
        { err, attempt, maxRetries: MAX_RETRIES, nextDelayMs: delay },
        `[email-poll] Waiting for DB... attempt ${attempt}/${MAX_RETRIES}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * BACKOFF_FACTOR, BACKOFF_MAX_MS);
    }
  }

  return false;
}

function scheduleBackgroundRetry(): void {
  const handle = setInterval(() => {
    void (async () => {
      try {
        await checkDbReady();
        logger.info('[email-poll] DB became available — starting polling');
        clearInterval(handle);
        await loadAndStartPolling();
      } catch {
        logger.warn('[email-poll] DB still not available, will retry...');
      }
    })();
  }, BACKOFF_MAX_MS);
}

// ─── Internal helpers ─────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // 60 seconds

async function loadAndStartPolling(): Promise<void> {
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
    logger.error({ err }, '[email-poll] Failed to load active IMAP configurations');
    return;
  }

  logger.info({ count: activeConfigs.length }, '[email-poll] Found active IMAP configurations');

  for (const cfg of activeConfigs) {
    schedulePolling(cfg);
  }
}

function schedulePolling(cfg: {
  id: string;
  tenant_id: string;
  config: string;
}): void {
  if (pollingIntervals.has(cfg.id)) {
    logger.warn({ configId: cfg.id }, '[email-poll] Already polling for config — skipping duplicate');
    return;
  }

  const poller = new ImapPoller(cfg);

  // Run immediately on start so the first poll does not wait 60 s
  runPoll(poller, cfg.id);

  const handle = setInterval(() => {
    runPoll(poller, cfg.id);
  }, POLL_INTERVAL_MS);

  pollingIntervals.set(cfg.id, handle);

  logger.info({ configId: cfg.id, intervalSec: POLL_INTERVAL_MS / 1000 }, '[email-poll] Polling started for config');
}

function runPoll(poller: ImapPoller, configId: string): void {
  poller.poll().catch((err: unknown) => {
    logger.error({ err, configId }, '[email-poll] Poll failed for config');
  });
}
