import { resolveSlaTierSqlite } from './db-specific/sqlite.js';

/**
 * SLA Engine — resolves effective SLA tiers via asset hierarchy traversal.
 *
 * The engine selects the correct DB-specific implementation based on the
 * DB_DRIVER environment variable (default: 'sqlite').
 *
 * SQLite mode (default / single-container):
 *   Uses an iterative DAG traversal over asset_relations (up to 5 hops).
 *
 * PostgreSQL mode (production / multi-container):
 *   Delegates to resolveSlaTierPostgres — a stub until the PG driver is wired.
 */
export const slaEngine = {
  /**
   * Resolves the effective SLA tier for an asset.
   *
   * If the asset has an explicit SLA tier (not 'none'), it is returned directly.
   * Otherwise the engine traverses parent assets via asset_relations until an
   * SLA tier is found or the maximum depth (5) is reached.
   *
   * @param tenantId - The tenant scope for all queries.
   * @param assetId  - The asset whose effective SLA tier should be resolved.
   * @returns The resolved SLA tier string, or null if none found in the hierarchy.
   */
  async resolveSlaTier(tenantId: string, assetId: string): Promise<string | null> {
    const dbDriver = process.env['DB_DRIVER'] ?? 'sqlite';

    if (dbDriver === 'sqlite') {
      return resolveSlaTierSqlite(tenantId, assetId);
    }

    // PostgreSQL: dynamically import to avoid loading postgres deps in SQLite mode
    const { resolveSlaTierPostgres } = await import('./db-specific/postgres.js');
    return resolveSlaTierPostgres(tenantId, assetId);
  },
};
