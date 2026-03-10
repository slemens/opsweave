import 'dotenv/config';
import './lib/context.js'; // module augmentation — must be imported early

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config/index.js';
import { initDatabase, getDb, type TypedDb } from './config/database.js';
import { initI18n } from './i18n/index.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { languageMiddleware } from './middleware/language.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';
import {
  startEmailPollingWorker,
  stopEmailPollingWorker,
} from './modules/email-inbound/email-poll.worker.js';
import {
  startSlaBreachWorker,
  stopSlaBreachWorker,
} from './workers/sla-breach.worker.js';
import {
  startEscalationWorker,
  stopEscalationWorker,
} from './workers/escalation.worker.js';
import {
  startMonitoringPollWorker,
  stopMonitoringPollWorker,
} from './workers/monitoring-poll.worker.js';
import {
  startEventToIncidentWorker,
  stopEventToIncidentWorker,
} from './workers/event-to-incident.worker.js';
// AUDIT-FIX: H-11 — Structured logging
import logger from './lib/logger.js';
// AUDIT-FIX: H-02 — Warn if default admin password unchanged in production
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { users, tenants } from './db/schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── AUDIT-FIX: H-02 — Warn about default seed password ────

async function checkDefaultAdminPassword(): Promise<void> {
  try {
    const db = getDb() as TypedDb;
    const [admin] = await db
      .select({ password_hash: users.password_hash })
      .from(users)
      .where(eq(users.email, 'admin@opsweave.local'))
      .limit(1);

    if (admin?.password_hash) {
      const isDefault = await bcrypt.compare('changeme', admin.password_hash);
      if (isDefault) {
        logger.warn('Default admin password unchanged — change immediately! (admin@opsweave.local)');
      }
    }
  } catch {
    // Non-fatal: seed user may not exist
  }
}

// ─── Auto-Setup: create tables + seed on first start if DB is empty ────

async function autoSetupIfNeeded(): Promise<void> {
  const db = getDb() as TypedDb;
  try {
    // Check if the tenants table exists (core table)
    await db.select({ id: tenants.id }).from(tenants).limit(1);
    logger.debug('Database tables exist, skipping auto-setup');
  } catch {
    // Tables don't exist — run setup and seed
    logger.info('Database is empty — running auto-setup (creating tables + seeding demo data)...');

    // Import and run setup inline (setup.ts uses TABLES_SQL string)
    const { TABLES_SQL } = await import('./db/setup.js');
    const statements = TABLES_SQL
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    for (const stmt of statements) {
      if (config.dbDriver === 'sqlite') {
        const dbRecord = db as unknown as Record<string, unknown>;
        (dbRecord.run as (query: ReturnType<typeof sql.raw>) => void)(sql.raw(stmt));
      } else {
        const dbRecord = db as unknown as Record<string, unknown>;
        await (dbRecord.execute as (query: ReturnType<typeof sql.raw>) => Promise<unknown>)(sql.raw(stmt));
      }
    }
    logger.info({ count: statements.length }, 'Auto-setup: tables created');

    // Run seed
    const { runSeed } = await import('./db/seed/index.js');
    await runSeed();
    logger.info('Auto-setup: demo data seeded');
  }
}

// ─── Bootstrap ─────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // 1. Initialise subsystems
  await initI18n();
  await initDatabase();

  // 1b. Auto-create tables + seed on first start if DB is empty
  await autoSetupIfNeeded();

  // 2. Create Express app
  const app = express();
  const httpServer = createServer(app);

  // 3. Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  // Make io available to routes via app.locals
  app.locals['io'] = io;

  // AUDIT-FIX: H-11 — Structured logging
  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Socket.IO client connected');
    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Socket.IO client disconnected');
    });
  });

  // ── Global middleware (order matters) ──────────────────────

  // Trust proxy when running behind nginx/reverse proxy (docker-compose, k8s)
  if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  // CORS
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  // Request logging
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request ID
  app.use(requestIdMiddleware);

  // Language resolution
  app.use(languageMiddleware);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000,              // max 1000 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    },
  });
  app.use('/api/', limiter);

  // ── API routes ─────────────────────────────────────────────
  app.use('/api/v1', apiRouter);

  // ── Standalone feedback page (no auth, always available) ───
  app.get('/feedback', (_req, res) => {
    // In dev: __dirname = src/, in prod: __dirname = dist/
    // The HTML file is copied alongside the compiled JS
    const htmlPath = path.resolve(__dirname, 'modules/feedback/feedback.html');
    res.sendFile(htmlPath);
  });

  // ── Static files (single-container mode) ───────────────────
  if (config.serveStatic) {
    const staticDir = path.resolve(__dirname, config.staticPath);
    app.use(express.static(staticDir));

    // SPA fallback: serve index.html for all non-API routes
    app.get('{*path}', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  // ── Global error handler (must be last) ────────────────────
  app.use(errorHandler);

  // ── Start server ───────────────────────────────────────────
  // AUDIT-FIX: H-11 — Structured logging
  httpServer.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        db: config.dbDriver,
        queue: config.queueDriver,
        env: config.nodeEnv,
        language: config.defaultLanguage,
        serveStatic: config.serveStatic,
      },
      'OpsWeave Backend v0.4.3 started',
    );

    startEmailPollingWorker().catch((err: unknown) => {
      logger.error({ err }, 'Failed to start email polling worker');
    });

    // SLA breach detection worker
    startSlaBreachWorker();

    // Auto-escalation worker
    startEscalationWorker();

    // Monitoring poll worker (Check_MK, etc.)
    startMonitoringPollWorker();

    // Event-to-incident auto-creation worker
    startEventToIncidentWorker();

    // AUDIT-FIX: H-02 — Check default admin password in production
    if (config.nodeEnv === 'production') {
      checkDefaultAdminPassword().catch(() => { /* non-fatal */ });
    }
  });

  // ── Graceful shutdown ──────────────────────────────────────
  // AUDIT-FIX: H-11 — Structured logging
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal, shutting down gracefully');

    stopEmailPollingWorker();
    stopSlaBreachWorker();
    stopEscalationWorker();
    stopMonitoringPollWorker();
    stopEventToIncidentWorker();

    httpServer.close(() => {
      logger.info('HTTP server closed');
      io.close(() => {
        logger.info('Socket.IO server closed');
        process.exit(0);
      });
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ─── Run ───────────────────────────────────────────────────
// AUDIT-FIX: H-11 — Structured logging
bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
