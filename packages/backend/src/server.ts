import 'dotenv/config';
import './lib/context.js'; // module augmentation — must be imported early

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
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

  // Run Evo migrations (safe for both fresh and existing DBs)
  await runEvoMigrations(db);
}

async function runEvoMigrations(db: TypedDb): Promise<void> {
  const { TABLES_SQL, EVO_MIGRATIONS_SQL } = await import('./db/setup.js');

  const allStatements = TABLES_SQL
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  const evoTableNames = [
    'asset_types', 'relation_types', 'classification_models',
    'classification_values', 'asset_classifications', 'capacity_types',
    'asset_capacities', 'asset_tenant_assignments', 'service_scope_items',
    'asset_relation_history', 'asset_capacity_history',
  ];

  const evoIndexPrefixes = [
    'idx_asset_types', 'idx_relation_types', 'idx_classification',
    'idx_asset_classifications', 'idx_capacity_types', 'idx_asset_capacities',
    'idx_asset_relations_temporal', 'idx_ata_', 'idx_ssi_',
    'idx_arh_', 'idx_ach_',
  ];

  // Phase 1: CREATE TABLE (new evo tables)
  const tableStmts = allStatements.filter((s) =>
    evoTableNames.some((t) => s.includes(`CREATE TABLE IF NOT EXISTS ${t}`)));

  // Phase 2: CREATE INDEX (evo indexes — run AFTER alter tables)
  const indexStmts = allStatements.filter((s) =>
    evoIndexPrefixes.some((p) => s.includes(`CREATE INDEX IF NOT EXISTS ${p}`)));

  const runStmt = async (stmt: string): Promise<void> => {
    if (config.dbDriver === 'sqlite') {
      const dbRecord = db as unknown as Record<string, unknown>;
      (dbRecord.run as (query: ReturnType<typeof sql.raw>) => void)(sql.raw(stmt));
    } else {
      const dbRecord = db as unknown as Record<string, unknown>;
      await (dbRecord.execute as (query: ReturnType<typeof sql.raw>) => Promise<unknown>)(sql.raw(stmt));
    }
  };

  // 1. Create new evo tables
  for (const stmt of tableStmts) {
    await runStmt(stmt);
  }

  // 2. ALTER TABLE migrations (add columns to existing tables — may fail if already present)
  for (const stmt of EVO_MIGRATIONS_SQL) {
    try {
      await runStmt(stmt);
    } catch {
      // Column already exists — ignore
    }
  }

  // 3. Create indexes (after ALTERs, since some indexes reference ALTERed columns)
  for (const stmt of indexStmts) {
    try {
      await runStmt(stmt);
    } catch {
      // Index already exists or column missing — ignore
    }
  }

  // Ensure system user exists (required by SLA-breach + escalation workers)
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
  try {
    const existing = await db.select({ id: users.id }).from(users)
      .where(eq(users.id, SYSTEM_USER_ID)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({
        id: SYSTEM_USER_ID,
        email: 'system@opsweave.internal',
        display_name: 'System',
        password_hash: null,
        auth_provider: 'local',
        external_id: null,
        language: 'de',
        is_active: 0,
        is_superadmin: 0,
        last_login: null,
        created_at: new Date().toISOString(),
      });
      logger.info('System user created (for automated actions)');
    }
  } catch {
    // System user already exists or table not ready
  }

  // Seed system asset types + relation types if not present
  try {
    const { seedEvoTypes } = await import('./db/seed/index.js');
    await seedEvoTypes();
  } catch {
    // Already seeded or seed function not available
  }

  logger.debug('Evo migrations applied');
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
    contentSecurityPolicy: config.serveStatic ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    } : false, // Disable CSP when frontend is served separately (dev mode)
    hsts: {
      maxAge: 31536000,
      includeSubDomains: false, // Avoid forcing HTTPS on subdomains (e.g. 3as.opsweave.de)
    },
  }));

  // CORS — in single-container mode (serveStatic), same-origin so CORS is irrelevant.
  // In dev/split mode, accept the configured origin or reflect the request origin
  // for localhost development (any port).
  app.use(cors({
    origin: (origin, callback) => {
      // No origin = same-origin or non-browser (curl, etc.) — always allow
      if (!origin) return callback(null, true);
      // Configured origin matches
      if (origin === config.corsOrigin) return callback(null, true);
      // Dev mode: allow any localhost origin (any port)
      if (config.nodeEnv !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, origin);
      }
      callback(null, false);
    },
    credentials: true,
  }));

  // Request logging
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Cookie parsing (for httpOnly JWT auth)
  app.use(cookieParser());

  // Request ID
  app.use(requestIdMiddleware);

  // Language resolution
  app.use(languageMiddleware);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: config.nodeEnv === 'production' ? 1000 : 50000, // relaxed in dev/test
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
      'OpsWeave Backend v0.5.3 started',
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
