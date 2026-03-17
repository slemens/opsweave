//
// Uses a recursive CTE (WITH RECURSIVE) to traverse the asset relation DAG
// upward and find the first ancestor with an explicit SLA tier (!= 'none').
//
// Functionally identical to the SQLite iterative traversal in ./sqlite.ts,
// but executed as a single SQL query for better performance on PostgreSQL.
//
// Traversal direction:
//   asset_relations.target_asset_id = child
//   asset_relations.source_asset_id = parent
//   We walk from child → parent (upward in the hierarchy).
//
// Cycle protection:
//   The CTE tracks visited asset IDs in a TEXT[] array and skips any
//   asset already in the path (NOT (source_asset_id = ANY(visited))).
//
// Depth limit:
//   Maximum 5 hops (matching the SQLite implementation).
//
// Example manual test query:
// ─────────────────────────────────────────────────────────────────
//   WITH RECURSIVE hierarchy AS (
//     -- Base case: start from the target asset
//     SELECT a.id, a.sla_tier, 0 AS depth, ARRAY[a.id] AS visited
//     FROM assets a
//     WHERE a.id = '<asset-uuid>' AND a.tenant_id = '<tenant-uuid>'
//
//     UNION ALL
//
//     -- Recursive step: walk to parent assets via relations
//     SELECT p.id, p.sla_tier, h.depth + 1, h.visited || p.id
//     FROM hierarchy h
//     JOIN asset_relations r
//       ON r.target_asset_id = h.id
//       AND r.tenant_id = '<tenant-uuid>'
//     JOIN assets p
//       ON p.id = r.source_asset_id
//       AND p.tenant_id = '<tenant-uuid>'
//     WHERE h.depth < 5
//       AND NOT (p.id = ANY(h.visited))        -- cycle protection
//       AND h.sla_tier = 'none'                -- stop branch if SLA found
//   )
//   SELECT sla_tier
//   FROM hierarchy
//   WHERE sla_tier <> 'none'
//   ORDER BY depth ASC
//   LIMIT 1;
// ─────────────────────────────────────────────────────────────────

import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { getDb } from '../../config/database.js';

/**
 * Resolves the effective SLA tier for an asset by traversing the asset
 * relation DAG upward using a PostgreSQL recursive CTE.
 *
 * Returns the sla_tier of the nearest ancestor with an explicit tier,
 * or null if no tier is found within 5 hops.
 *
 * @param tenantId - Tenant scope for row-level isolation.
 * @param assetId  - The asset whose effective SLA tier to resolve.
 */
export async function resolveSlaTierPostgres(
  tenantId: string,
  assetId: string,
): Promise<string | null> {
  // This function is only called when DB_DRIVER=pg (see sla-engine.ts)
  const db = getDb() as PostgresJsDatabase;

  const result = await db.execute(sql`
    WITH RECURSIVE hierarchy AS (
      SELECT
        a.id,
        a.sla_tier,
        0 AS depth,
        ARRAY[a.id::text] AS visited
      FROM assets a
      WHERE a.id = ${assetId}
        AND a.tenant_id = ${tenantId}

      UNION ALL

      SELECT
        p.id,
        p.sla_tier,
        h.depth + 1,
        h.visited || p.id::text
      FROM hierarchy h
      JOIN asset_relations r
        ON r.target_asset_id = h.id
        AND r.tenant_id = ${tenantId}
      JOIN assets p
        ON p.id = r.source_asset_id
        AND p.tenant_id = ${tenantId}
      WHERE h.depth < 5
        AND NOT (p.id::text = ANY(h.visited))
        AND h.sla_tier = 'none'
    )
    SELECT sla_tier
    FROM hierarchy
    WHERE sla_tier <> 'none'
    ORDER BY depth ASC
    LIMIT 1
  `);

  // postgres.js returns an array of row objects
  const rows = result as unknown as Array<{ sla_tier: string }>;
  if (rows.length > 0 && rows[0]?.sla_tier) {
    return rows[0].sla_tier;
  }

  return null;
}
