/**
 * OpsWeave — Graph Performance Benchmark (Evo-5)
 *
 * Measures graph traversal performance at various scales.
 * Usage: DB_DRIVER=sqlite DATABASE_URL=file:./opsweave.db npx tsx scripts/benchmark-graph-performance.ts
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDb, type TypedDb } from '../packages/backend/src/config/database.js';
import {
  assets,
  assetRelations,
  tenants,
} from '../packages/backend/src/db/schema/index.js';

// ─── Config ──────────────────────────────────────────────

const SCALES = [100, 500, 1000, 5000];
const RELATION_RATIO = 4; // avg relations per asset
const BENCHMARK_TENANT_ID = '00000000-0000-0000-0000-benchmark0001';

// ─── Helpers ─────────────────────────────────────────────

function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

async function timeMsAsync(fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

// ─── Seed Benchmark Data ─────────────────────────────────

async function seedBenchmarkData(db: TypedDb, assetCount: number): Promise<string[]> {
  const now = new Date().toISOString();
  const assetTypes = ['server_virtual', 'server_physical', 'database', 'application', 'network_switch', 'container'];
  const relationTypeSlugs = ['runs_on', 'depends_on', 'connected_to', 'member_of'];

  // Create tenant if not exists
  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, BENCHMARK_TENANT_ID)).limit(1);
  if (existing.length === 0) {
    await db.insert(tenants).values({
      id: BENCHMARK_TENANT_ID,
      name: 'Benchmark Tenant',
      slug: 'benchmark',
      settings: '{}',
      is_active: 1,
      created_at: now,
      updated_at: now,
    });
  }

  // Clean previous benchmark data
  await db.delete(assetRelations).where(eq(assetRelations.tenant_id, BENCHMARK_TENANT_ID));
  await db.delete(assets).where(eq(assets.tenant_id, BENCHMARK_TENANT_ID));

  // Insert assets in batches
  const assetIds: string[] = [];
  const BATCH_SIZE = 500;

  for (let i = 0; i < assetCount; i += BATCH_SIZE) {
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, assetCount); j++) {
      const id = uuidv4();
      assetIds.push(id);
      batch.push({
        id,
        tenant_id: BENCHMARK_TENANT_ID,
        asset_type: assetTypes[j % assetTypes.length]!,
        name: `bench-asset-${j}`,
        display_name: `Benchmark Asset ${j}`,
        status: 'active',
        sla_tier: 'none',
        attributes: '{}',
        created_at: now,
        updated_at: now,
        created_by: 'benchmark',
      });
    }
    await db.insert(assets).values(batch);
  }

  // Insert relations
  const relationCount = assetCount * RELATION_RATIO;
  const relationBatches: Array<{
    id: string; tenant_id: string; source_asset_id: string;
    target_asset_id: string; relation_type: string; properties: string;
    created_at: string; created_by: string;
  }>[] = [];

  let currentBatch: typeof relationBatches[0] = [];
  const usedPairs = new Set<string>();

  for (let i = 0; i < relationCount; i++) {
    const srcIdx = Math.floor(Math.random() * assetCount);
    let tgtIdx = Math.floor(Math.random() * assetCount);
    if (tgtIdx === srcIdx) tgtIdx = (tgtIdx + 1) % assetCount;

    const pairKey = `${srcIdx}-${tgtIdx}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    currentBatch.push({
      id: uuidv4(),
      tenant_id: BENCHMARK_TENANT_ID,
      source_asset_id: assetIds[srcIdx]!,
      target_asset_id: assetIds[tgtIdx]!,
      relation_type: relationTypeSlugs[i % relationTypeSlugs.length]!,
      properties: '{}',
      created_at: now,
      created_by: 'benchmark',
    });

    if (currentBatch.length >= BATCH_SIZE) {
      relationBatches.push(currentBatch);
      currentBatch = [];
    }
  }
  if (currentBatch.length > 0) relationBatches.push(currentBatch);

  for (const batch of relationBatches) {
    await db.insert(assetRelations).values(batch);
  }

  return assetIds;
}

// ─── Benchmarks ──────────────────────────────────────────

async function benchGraphLoad(db: TypedDb): Promise<number> {
  return timeMsAsync(async () => {
    await db.select().from(assets).where(eq(assets.tenant_id, BENCHMARK_TENANT_ID));
    await db.select().from(assetRelations).where(eq(assetRelations.tenant_id, BENCHMARK_TENANT_ID));
  });
}

async function benchBfsTraversal(db: TypedDb, startAssetId: string): Promise<number> {
  return timeMsAsync(async () => {
    const allRels = await db
      .select({
        id: assetRelations.id,
        source_asset_id: assetRelations.source_asset_id,
        target_asset_id: assetRelations.target_asset_id,
      })
      .from(assetRelations)
      .where(eq(assetRelations.tenant_id, BENCHMARK_TENANT_ID));

    const visited = new Set<string>([startAssetId]);
    const queue = [startAssetId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const rel of allRels) {
        if (rel.source_asset_id === current || rel.target_asset_id === current) {
          const neighbor = rel.source_asset_id === current ? rel.target_asset_id : rel.source_asset_id;
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }
  });
}

async function benchTemporalQuery(db: TypedDb): Promise<number> {
  const now = new Date().toISOString();
  return timeMsAsync(async () => {
    // Simulated temporal filter (all relations are non-temporal in benchmark)
    await db
      .select()
      .from(assetRelations)
      .where(eq(assetRelations.tenant_id, BENCHMARK_TENANT_ID));
  });
}

// ─── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  await initDatabase();
  const db = getDb() as TypedDb;

  console.log('OpsWeave Graph Performance Benchmark');
  console.log('====================================\n');
  console.log('Scale | Assets | Relations | Graph Load | BFS Traversal | Temporal Query');
  console.log('------|--------|-----------|------------|---------------|---------------');

  for (const scale of SCALES) {
    const assetIds = await seedBenchmarkData(db, scale);
    const relCount = scale * RELATION_RATIO;

    // Warm up
    await benchGraphLoad(db);

    // Run benchmarks (3 iterations, take median)
    const graphLoadTimes: number[] = [];
    const bfsTimes: number[] = [];
    const temporalTimes: number[] = [];

    for (let i = 0; i < 3; i++) {
      graphLoadTimes.push(await benchGraphLoad(db));
      bfsTimes.push(await benchBfsTraversal(db, assetIds[0]!));
      temporalTimes.push(await benchTemporalQuery(db));
    }

    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)]!;
    };

    console.log(
      `${String(scale).padStart(5)} | ${String(scale).padStart(6)} | ${String(relCount).padStart(9)} | ` +
      `${median(graphLoadTimes).toFixed(1).padStart(8)}ms | ` +
      `${median(bfsTimes).toFixed(1).padStart(11)}ms | ` +
      `${median(temporalTimes).toFixed(1).padStart(11)}ms`,
    );
  }

  // Cleanup
  await db.delete(assetRelations).where(eq(assetRelations.tenant_id, BENCHMARK_TENANT_ID));
  await db.delete(assets).where(eq(assets.tenant_id, BENCHMARK_TENANT_ID));
  await db.delete(tenants).where(eq(tenants.id, BENCHMARK_TENANT_ID));

  console.log('\nBenchmark complete. Cleanup done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
