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

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, 'migrations');

async function runMigrations(): Promise<void> {
  console.log(`[migrate] DB_DRIVER=${config.dbDriver}`);
  console.log(`[migrate] DATABASE_URL=${config.databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`[migrate] Migrations folder: ${migrationsFolder}`);

  if (config.dbDriver === 'sqlite') {
    const { default: Database } = await import('better-sqlite3');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');

    const dbPath = config.databaseUrl.replace(/^file:/, '');
    console.log(`[migrate] SQLite path: ${dbPath}`);

    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    const db = drizzle(sqlite);

    console.log('[migrate] Running SQLite migrations...');
    migrate(db, { migrationsFolder });

    sqlite.close();
    console.log('[migrate] SQLite migrations complete.');
  } else {
    const pg = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');

    const client = pg.default(config.databaseUrl, { max: 1 });
    const db = drizzle(client);

    console.log('[migrate] Running PostgreSQL migrations...');
    await migrate(db, { migrationsFolder });

    await client.end();
    console.log('[migrate] PostgreSQL migrations complete.');
  }
}

runMigrations().catch((err: unknown) => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});
