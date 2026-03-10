// =============================================================================
// OpsWeave — Database Migration Runner
// =============================================================================
// Usage:
//   tsx src/db/migrate.ts          — run pending migrations
//   tsx src/db/migrate.ts --push   — push schema directly (dev only)
//
// Reads DB_DRIVER from environment to pick the correct driver.
// =============================================================================

import 'dotenv/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';
// AUDIT-FIX: H-11 — Structured logging
import logger from '../lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, 'migrations');

async function runMigrations(): Promise<void> {
  logger.info({ dbDriver: config.dbDriver, migrationsFolder }, 'Starting migrations');

  if (config.dbDriver === 'sqlite') {
    const { default: Database } = await import('better-sqlite3');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');

    const dbPath = config.databaseUrl.replace(/^file:/, '');
    logger.info({ dbPath }, 'SQLite path');

    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    const db = drizzle(sqlite);

    logger.info('Running SQLite migrations');
    migrate(db, { migrationsFolder });

    sqlite.close();
    logger.info('SQLite migrations complete');
  } else {
    const pg = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');

    const client = pg.default(config.databaseUrl, { max: 1 });
    const db = drizzle(client);

    logger.info('Running PostgreSQL migrations');
    await migrate(db, { migrationsFolder });

    await client.end();
    logger.info('PostgreSQL migrations complete');
  }
}

runMigrations().catch((err: unknown) => {
  logger.fatal({ err }, 'Migration failed');
  process.exit(1);
});
