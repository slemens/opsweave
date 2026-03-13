import 'dotenv/config';
// Config is loaded before logger is initialised, so we use a deferred approach:
// console.warn calls here run at module-load time before pino is ready.
// We keep them as-is since they fire only once at startup and pino may not be initialised yet.
import logger from '../lib/logger.js';

export type DbDriver = 'pg' | 'sqlite';
export type QueueDriver = 'bullmq' | 'better-queue';

export interface AppConfig {
  /** General */
  nodeEnv: string;
  port: number;
  logLevel: string;

  /** Database */
  dbDriver: DbDriver;
  databaseUrl: string;

  /** Queue */
  queueDriver: QueueDriver;
  redisUrl: string;

  /** Auth */
  sessionSecret: string;
  jwtSecret: string;
  jwtExpiresIn: string;

  /** OIDC (Enterprise) */
  oidcEnabled: boolean;
  oidcIssuer: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcRedirectUri: string;

  /** CORS */
  corsOrigin: string;

  /** i18n */
  defaultLanguage: string;

  /** Email Webhook */
  emailWebhookSecret: string;

  /** Static (single-container mode) */
  serveStatic: boolean;
  staticPath: string;
}

function envStr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

function resolveDbDriver(): DbDriver {
  const raw = envStr('DB_DRIVER', 'pg');
  if (raw === 'sqlite') return 'sqlite';
  return 'pg';
}

function resolveQueueDriver(): QueueDriver {
  const raw = envStr('QUEUE_DRIVER', 'bullmq');
  if (raw === 'better-queue') return 'better-queue';
  return 'bullmq';
}

const INSECURE_SECRETS = ['change-me-in-production', 'opsweave-dev-secret-change-in-production', ''];

function resolveSecret(envKey: string, devFallback: string, nodeEnv: string): string {
  const value = process.env[envKey] ?? devFallback;
  if (nodeEnv === 'production' && INSECURE_SECRETS.includes(value)) {
    throw new Error(
      `FATAL: ${envKey} must be set to a secure value in production. ` +
      `Do not use default/dev secrets. Set ${envKey} in your environment.`,
    );
  }
  return value;
}

const nodeEnv = envStr('NODE_ENV', 'development');
const dbDriver = resolveDbDriver();

function resolveDatabaseUrl(): string {
  const explicit = process.env['DATABASE_URL'];
  if (explicit) return explicit;

  if (nodeEnv === 'production') {
    throw new Error(
      'FATAL: DATABASE_URL must be set in production. ' +
      'No fallback to localhost is allowed.',
    );
  }
  // Dev/test fallback
  return dbDriver === 'sqlite'
    ? 'file:./data/opsweave.db'
    : 'postgresql://opsweave:opsweave_secret@localhost:5432/opsweave_db';
}

function resolveRedisUrl(): string {
  const explicit = process.env['REDIS_URL'];
  if (explicit) return explicit;

  if (nodeEnv === 'production') {
    logger.warn('REDIS_URL is not set in production, falling back to redis://localhost:6379');
  }
  return 'redis://localhost:6379';
}

export const config: AppConfig = {
  nodeEnv,
  port: envInt('PORT', 3000),
  logLevel: envStr('LOG_LEVEL', 'info'),

  dbDriver,
  databaseUrl: resolveDatabaseUrl(),

  queueDriver: resolveQueueDriver(),
  redisUrl: resolveRedisUrl(),

  sessionSecret: resolveSecret('SESSION_SECRET', 'change-me-in-production', nodeEnv),
  jwtSecret: resolveSecret('JWT_SECRET', 'change-me-in-production', nodeEnv),
  jwtExpiresIn: envStr('JWT_EXPIRES_IN', '8h'),

  oidcEnabled: envBool('OIDC_ENABLED', false),
  oidcIssuer: envStr('OIDC_ISSUER', ''),
  oidcClientId: envStr('OIDC_CLIENT_ID', ''),
  oidcClientSecret: envStr('OIDC_CLIENT_SECRET', ''),
  oidcRedirectUri: envStr('OIDC_REDIRECT_URI', 'http://localhost/api/v1/auth/oidc/callback'),

  corsOrigin: envStr('CORS_ORIGIN', 'http://localhost'),

  defaultLanguage: envStr('DEFAULT_LANGUAGE', 'de'),

  emailWebhookSecret: envStr('EMAIL_WEBHOOK_SECRET', ''),

  serveStatic: envBool('SERVE_STATIC', false),
  staticPath: envStr('STATIC_PATH', '../frontend/dist'),
};

if (nodeEnv === 'production') {
  if (config.oidcRedirectUri.includes('localhost')) {
    logger.warn('OIDC_REDIRECT_URI contains "localhost" in production — set to your public domain');
  }
  if (config.corsOrigin.includes('localhost')) {
    logger.warn('CORS_ORIGIN contains "localhost" in production — set to your public domain');
  }
}
