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
import { initDatabase } from './config/database.js';
import { initI18n } from './i18n/index.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { languageMiddleware } from './middleware/language.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';
import {
  startEmailPollingWorker,
  stopEmailPollingWorker,
} from './modules/email-inbound/email-poll.worker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  // Socket.IO connection handler (placeholder)
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
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
  httpServer.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║           OpsWeave Backend v0.2.0                ║
║──────────────────────────────────────────────────║
║  Port:     ${String(config.port).padEnd(37)}║
║  DB:       ${config.dbDriver.padEnd(37)}║
║  Queue:    ${config.queueDriver.padEnd(37)}║
║  Env:      ${config.nodeEnv.padEnd(37)}║
║  Language: ${config.defaultLanguage.padEnd(37)}║
║  Static:   ${String(config.serveStatic).padEnd(37)}║
╚══════════════════════════════════════════════════╝
    `.trim());

    // Start background IMAP polling worker after the server is ready
    startEmailPollingWorker().catch((err: unknown) => {
      console.error('[Server] Failed to start email polling worker:', err);
    });
  });

  // ── Graceful shutdown ──────────────────────────────────────
  const shutdown = (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);

    // Stop IMAP polling before closing the HTTP server
    stopEmailPollingWorker();

    httpServer.close(() => {
      console.log('[Server] HTTP server closed.');
      io.close(() => {
        console.log('[Server] Socket.IO server closed.');
        process.exit(0);
      });
    });

    // Force shutdown after 10s
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ─── Run ───────────────────────────────────────────────────
bootstrap().catch((err: unknown) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
