// =============================================================================
// OpsWeave — Database Entry Point
// =============================================================================
// Re-exports the database connection + full schema for convenient imports:
//   import { getDb, initDatabase, schema } from '../db/index.js';
// =============================================================================

export { initDatabase, getDb } from '../config/database.js';
export type { DbInstance } from '../config/database.js';

// Full schema namespace for use with drizzle queries
import * as schema from './schema/index.js';
export { schema };

// Also re-export individual tables for destructured imports
export * from './schema/index.js';
