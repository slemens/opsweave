import 'dotenv/config';

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

export const config: AppConfig = {
  nodeEnv: envStr('NODE_ENV', 'development'),
  port: envInt('PORT', 3000),
  logLevel: envStr('LOG_LEVEL', 'info'),

  dbDriver: resolveDbDriver(),
  databaseUrl: envStr(
    'DATABASE_URL',
    resolveDbDriver() === 'sqlite'
      ? 'file:./data/opsweave.db'
      : 'postgresql://opsweave:opsweave_secret@localhost:5432/opsweave_db',
  ),

  queueDriver: resolveQueueDriver(),
  redisUrl: envStr('REDIS_URL', 'redis://localhost:6379'),

  sessionSecret: envStr('SESSION_SECRET', 'change-me-in-production'),
  jwtSecret: envStr('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: envStr('JWT_EXPIRES_IN', '8h'),

  oidcEnabled: envBool('OIDC_ENABLED', false),
  oidcIssuer: envStr('OIDC_ISSUER', ''),
  oidcClientId: envStr('OIDC_CLIENT_ID', ''),
  oidcClientSecret: envStr('OIDC_CLIENT_SECRET', ''),
  oidcRedirectUri: envStr('OIDC_REDIRECT_URI', 'http://localhost/api/v1/auth/oidc/callback'),

  corsOrigin: envStr('CORS_ORIGIN', 'http://localhost'),

  defaultLanguage: envStr('DEFAULT_LANGUAGE', 'de'),

  serveStatic: envBool('SERVE_STATIC', false),
  staticPath: envStr('STATIC_PATH', '../frontend/dist'),
};
