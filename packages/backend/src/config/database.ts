import { config } from './index.js';

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// ─── Types ─────────────────────────────────────────────────
export type DbInstance = PostgresJsDatabase | BetterSQLite3Database;

/**
 * Type alias for use in service files.
 * At runtime both drivers expose the same query API surface.
 * We cast to BetterSQLite3Database because the schema tables use sqliteTable,
 * which ensures full type-safety for column references, where clauses, etc.
 *
 * This is safe because Drizzle's query builder methods have the same
 * runtime signatures regardless of the underlying driver.
 */
export type TypedDb = BetterSQLite3Database;

let _db: DbInstance | null = null;

// ─── Connection ────────────────────────────────────────────

/**
 * Initialise the database connection based on DB_DRIVER.
 * Must be called once at startup before any query.
 */
export async function initDatabase(): Promise<DbInstance> {
  if (_db) return _db;

  if (config.dbDriver === 'sqlite') {
    const { default: Database } = await import('better-sqlite3');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');

    // Strip "file:" prefix if present
    const dbPath = config.databaseUrl.replace(/^file:/, '');
    const sqlite = new Database(dbPath);

    // Enable WAL mode for better concurrency
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    _db = drizzle(sqlite);
  } else {
    const pg = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');

    const client = pg.default(config.databaseUrl);
    _db = drizzle(client);
  }

  return _db;
}

/**
 * Returns the initialised database instance.
 * Throws if initDatabase() has not been called.
 */
export function getDb(): DbInstance {
  if (!_db) {
    throw new Error(
      'Database not initialised. Call initDatabase() before accessing getDb().',
    );
  }
  return _db;
}
