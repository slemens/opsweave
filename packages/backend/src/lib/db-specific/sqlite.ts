import { and, eq } from 'drizzle-orm';

import { getDb, type TypedDb } from '../../config/database.js';
import { assets, assetRelations } from '../../db/schema/index.js';

// ─── Helpers ──────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

/**
 * Resolves the effective SLA tier for an asset by traversing the asset relation DAG.
 *
 * Uses a multi-hop traversal (up to 5 levels) to climb the asset hierarchy until an
 * asset with an explicit SLA tier (not 'none') is found.
 *
 * Algorithm:
 * 1. Check the asset itself — if it has a non-'none' sla_tier, return it immediately.
 * 2. Find direct parents (source assets that point to this asset via target_asset_id).
 * 3. Recursively check parents up to a depth of 5 hops.
 * 4. Return null if no SLA tier found in the hierarchy.
 *
 * Note: sla_tier is NOT NULL in the schema and defaults to 'none'.
 * 'none' is treated as "no SLA tier configured" — equivalent to null for inheritance purposes.
 */
export async function resolveSlaTierSqlite(
  tenantId: string,
  assetId: string,
): Promise<string | null> {
  const d = db();

  // Tier 1: Check the asset itself
  const selfRows = await d
    .select({ sla_tier: assets.sla_tier })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.tenant_id, tenantId)))
    .limit(1);

  const selfAsset = selfRows[0];
  if (!selfAsset) {
    // Asset not found — nothing to resolve
    return null;
  }

  if (selfAsset.sla_tier && selfAsset.sla_tier !== 'none') {
    return selfAsset.sla_tier;
  }

  // Tier 2–5: Walk up the DAG — follow parent relations iteratively
  // Parents are assets where: asset_relations.target_asset_id = currentAssetId
  // i.e. the source_asset_id is the "parent" in the dependency direction
  let currentIds = [assetId];
  const visited = new Set<string>([assetId]);
  const maxDepth = 5;

  for (let depth = 0; depth < maxDepth; depth++) {
    if (currentIds.length === 0) break;

    // Find all parent relations for the current set of asset IDs
    // We query all relations in one go to minimise round-trips
    const parentRelations: { parent_id: string }[] = [];

    for (const currentId of currentIds) {
      const rels = await d
        .select({ parent_id: assetRelations.source_asset_id })
        .from(assetRelations)
        .where(
          and(
            eq(assetRelations.tenant_id, tenantId),
            eq(assetRelations.target_asset_id, currentId),
          ),
        );
      parentRelations.push(...rels);
    }

    if (parentRelations.length === 0) break;

    // Deduplicate and skip already-visited assets (cycle protection)
    const nextIds = [
      ...new Set(
        parentRelations
          .map((r) => r.parent_id)
          .filter((id) => !visited.has(id)),
      ),
    ];

    if (nextIds.length === 0) break;

    // Check SLA tier on each parent asset
    for (const parentId of nextIds) {
      visited.add(parentId);
      const parentRows = await d
        .select({ sla_tier: assets.sla_tier })
        .from(assets)
        .where(and(eq(assets.id, parentId), eq(assets.tenant_id, tenantId)))
        .limit(1);

      const parent = parentRows[0];
      if (parent?.sla_tier && parent.sla_tier !== 'none') {
        return parent.sla_tier;
      }
    }

    currentIds = nextIds;
  }

  return null;
}
