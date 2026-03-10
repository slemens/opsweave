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
import { eq } from 'drizzle-orm';
import { users } from './db/schema/index.js';

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

// ─── Bootstrap ─────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // 1. Initialise subsystems
  await initI18n();
  await initDatabase();

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

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
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

  // ── Static files (single-container mode) ───────────────────
  if (config.serveStatic) {
    const staticDir = path.resolve(__dirname, config.staticPath);
    app.use(express.static(staticDir));

    // SPA fallback: serve index.html for all non-API routes
    app.get('*', (_req, res) => {
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
      'OpsWeave Backend v0.3.7 started',
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
