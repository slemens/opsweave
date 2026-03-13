/**
 * OpsWeave — Performance Benchmark Suite
 *
 * Runs all 7 benchmark scenarios from ADR-performance-benchmarks.md against SQLite.
 * Uses better-sqlite3 directly (not the app's Drizzle ORM) for raw SQL benchmarking.
 * Creates a temporary DB file, runs benchmarks, outputs JSON to stdout, cleans up.
 *
 * Usage: npx tsx scripts/benchmark-graph-performance.ts
 *
 * Configurable via environment:
 *   BENCH_SCALES=100,500,1000,5000    (comma-separated asset counts)
 *   BENCH_ITERATIONS=10               (runs per scenario)
 *   BENCH_WARMUP=3                    (warmup runs before measurement)
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// ─── Configuration ──────────────────────────────────────

const SCALES = (process.env.BENCH_SCALES || '100,500,1000,5000')
  .split(',')
  .map((s) => parseInt(s.trim(), 10));
const ITERATIONS = parseInt(process.env.BENCH_ITERATIONS || '10', 10);
const WARMUP = parseInt(process.env.BENCH_WARMUP || '3', 10);
const RELATION_DENSITY = 3; // avg relations per asset
const MAX_TREE_DEPTH = 5;
const FRAMEWORK_COUNT = 3;
const REQUIREMENTS_PER_FRAMEWORK = 50;

const TENANT_ID = '00000000-0000-0000-0000-benchmark0001';
const DB_PATH = join(tmpdir(), `opsweave-bench-${Date.now()}.db`);

// ─── Asset type distribution (per ADR) ──────────────────

const ASSET_TYPES = [
  { slug: 'server_virtual', weight: 0.4 },
  { slug: 'network_device', weight: 0.2 },
  { slug: 'application', weight: 0.15 },
  { slug: 'security_device', weight: 0.15 },
  { slug: 'storage', weight: 0.1 },
];

const RELATION_TYPES = ['runs_on', 'depends_on', 'connected_to', 'member_of'];
// For random (non-tree) relations, use only non-hierarchical types to prevent
// exponential fan-out in recursive CTE traversals
const RANDOM_RELATION_TYPES = ['connected_to', 'depends_on'];
const SLA_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'none'];
const ENVIRONMENTS = ['production', 'staging', 'development', 'test'];
const STATUSES = ['active', 'active', 'active', 'maintenance', 'decommissioned']; // weighted toward active

// ─── Schema Setup ───────────────────────────────────────

function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      settings TEXT NOT NULL DEFAULT '{}',
      license_key TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      asset_type TEXT NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      ip_address TEXT,
      location TEXT,
      sla_tier TEXT NOT NULL DEFAULT 'none',
      environment TEXT,
      owner_group_id TEXT,
      customer_id TEXT,
      attributes TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asset_relations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      source_asset_id TEXT NOT NULL REFERENCES assets(id),
      target_asset_id TEXT NOT NULL REFERENCES assets(id),
      relation_type TEXT NOT NULL,
      properties TEXT NOT NULL DEFAULT '{}',
      valid_from TEXT,
      valid_until TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      UNIQUE(tenant_id, source_asset_id, target_asset_id, relation_type)
    );

    CREATE TABLE IF NOT EXISTS capacity_types (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      category TEXT,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(tenant_id, slug)
    );

    CREATE TABLE IF NOT EXISTS asset_capacities (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES assets(id),
      capacity_type_id TEXT NOT NULL REFERENCES capacity_types(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      direction TEXT NOT NULL,
      total TEXT NOT NULL DEFAULT '0',
      allocated TEXT NOT NULL DEFAULT '0',
      reserved TEXT NOT NULL DEFAULT '0',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(asset_id, capacity_type_id, direction)
    );

    CREATE TABLE IF NOT EXISTS classification_models (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      UNIQUE(tenant_id, name)
    );

    CREATE TABLE IF NOT EXISTS classification_values (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL REFERENCES classification_models(id),
      value TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '{}',
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(model_id, value)
    );

    CREATE TABLE IF NOT EXISTS asset_classifications (
      asset_id TEXT NOT NULL REFERENCES assets(id),
      value_id TEXT NOT NULL REFERENCES classification_values(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      justification TEXT,
      classified_by TEXT,
      classified_at TEXT NOT NULL,
      UNIQUE(asset_id, value_id)
    );

    CREATE TABLE IF NOT EXISTS service_descriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      scope_included TEXT,
      scope_excluded TEXT,
      compliance_tags TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(tenant_id, code)
    );

    CREATE TABLE IF NOT EXISTS regulatory_frameworks (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      version TEXT,
      description TEXT,
      effective_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS regulatory_requirements (
      id TEXT PRIMARY KEY,
      framework_id TEXT NOT NULL REFERENCES regulatory_frameworks(id),
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS requirement_service_mappings (
      requirement_id TEXT NOT NULL REFERENCES regulatory_requirements(id),
      service_desc_id TEXT NOT NULL REFERENCES service_descriptions(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      coverage_level TEXT NOT NULL DEFAULT 'none',
      evidence_notes TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT,
      PRIMARY KEY(requirement_id, service_desc_id)
    );

    -- Indexes matching the production schema
    CREATE INDEX IF NOT EXISTS idx_asset_tenant ON assets(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_asset_tenant_type ON assets(tenant_id, asset_type);
    CREATE INDEX IF NOT EXISTS idx_asset_tenant_status ON assets(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_asset_tenant_sla ON assets(tenant_id, sla_tier);
    CREATE INDEX IF NOT EXISTS idx_asset_tenant_env ON assets(tenant_id, environment);
    CREATE INDEX IF NOT EXISTS idx_arel_tenant ON asset_relations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_arel_source ON asset_relations(tenant_id, source_asset_id);
    CREATE INDEX IF NOT EXISTS idx_arel_target ON asset_relations(tenant_id, target_asset_id);
    CREATE INDEX IF NOT EXISTS idx_acap_tenant ON asset_capacities(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_acap_asset ON asset_capacities(asset_id);
    CREATE INDEX IF NOT EXISTS idx_ac_tenant ON asset_classifications(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ac_asset ON asset_classifications(asset_id);
    CREATE INDEX IF NOT EXISTS idx_rf_tenant ON regulatory_frameworks(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_rr_framework ON regulatory_requirements(framework_id);
    CREATE INDEX IF NOT EXISTS idx_rsm_tenant ON requirement_service_mappings(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_rsm_requirement ON requirement_service_mappings(requirement_id);
    CREATE INDEX IF NOT EXISTS idx_rsm_service ON requirement_service_mappings(service_desc_id);
    CREATE INDEX IF NOT EXISTS idx_sd_tenant ON service_descriptions(tenant_id);
  `);
}

// ─── Data Generation ────────────────────────────────────

interface GeneratedData {
  assetIds: string[];
  rootAssetId: string;
  leafAssetId: string;
  hostClusterRootId: string;
  frameworkIds: string[];
  serviceIds: string[];
}

function pickWeighted(types: { slug: string; weight: number }[]): string {
  const r = Math.random();
  let cumulative = 0;
  for (const t of types) {
    cumulative += t.weight;
    if (r <= cumulative) return t.slug;
  }
  return types[types.length - 1]!.slug;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateData(db: Database.Database, assetCount: number): GeneratedData {
  const now = new Date().toISOString();

  // Insert tenant
  db.prepare(
    `INSERT OR IGNORE INTO tenants (id, name, slug, settings, is_active, created_at, updated_at)
     VALUES (?, 'Benchmark Tenant', 'benchmark', '{}', 1, ?, ?)`,
  ).run(TENANT_ID, now, now);

  // Generate assets
  const assetIds: string[] = [];
  const assetInsert = db.prepare(
    `INSERT INTO assets (id, tenant_id, asset_type, name, display_name, status, ip_address, sla_tier, environment, attributes, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, 'benchmark')`,
  );

  const insertAssets = db.transaction(() => {
    for (let i = 0; i < assetCount; i++) {
      const id = randomUUID();
      assetIds.push(id);
      const type = pickWeighted(ASSET_TYPES);
      const status = pickRandom(STATUSES);
      const sla = pickRandom(SLA_TIERS);
      const env = pickRandom(ENVIRONMENTS);
      const ip = `10.${Math.floor(i / 65536) % 256}.${Math.floor(i / 256) % 256}.${i % 256}`;
      assetInsert.run(id, TENANT_ID, type, `asset-${i}`, `Benchmark Asset ${i}`, status, ip, sla, env, now, now);
    }
  });
  insertAssets();

  // Build a tree structure for depth-based traversal scenarios
  // First 20% of assets form a hierarchy (depth up to MAX_TREE_DEPTH)
  const treeSize = Math.min(Math.floor(assetCount * 0.2), assetCount);
  const treeAssets = assetIds.slice(0, treeSize);
  const relationInsert = db.prepare(
    `INSERT OR IGNORE INTO asset_relations (id, tenant_id, source_asset_id, target_asset_id, relation_type, properties, metadata, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, '{}', '{}', ?, 'benchmark')`,
  );

  const usedPairs = new Set<string>();

  const insertTreeRelations = db.transaction(() => {
    // Build tree: each node except root has exactly one parent
    // Organize in levels to ensure depth up to MAX_TREE_DEPTH
    const levels: string[][] = [[treeAssets[0]!]];
    let assigned = 1;
    for (let depth = 1; depth < MAX_TREE_DEPTH && assigned < treeSize; depth++) {
      const level: string[] = [];
      const parentLevel = levels[depth - 1]!;
      // Each parent gets 2-4 children
      for (const parent of parentLevel) {
        const childCount = 2 + Math.floor(Math.random() * 3);
        for (let c = 0; c < childCount && assigned < treeSize; c++) {
          const child = treeAssets[assigned]!;
          level.push(child);
          // child "runs_on" parent
          const key = `${child}-${parent}-runs_on`;
          if (!usedPairs.has(key)) {
            usedPairs.add(key);
            relationInsert.run(randomUUID(), TENANT_ID, child, parent, 'runs_on', now);
          }
          assigned++;
        }
      }
      if (level.length > 0) levels.push(level);
    }
  });
  insertTreeRelations();

  // Build a host cluster for capacity aggregation (Scenario 5)
  // Create a cluster root -> N hosts -> M VMs per host
  const clusterRootId = assetIds[0]!;
  const hostsForCluster = Math.min(10, Math.floor(assetCount * 0.02));
  const vmsPerHost = Math.min(10, Math.floor(assetCount * 0.01));

  const insertClusterRelations = db.transaction(() => {
    let idx = treeSize; // start after tree assets
    for (let h = 0; h < hostsForCluster && idx < assetCount; h++) {
      const hostId = assetIds[idx++]!;
      const key1 = `${hostId}-${clusterRootId}-member_of`;
      if (!usedPairs.has(key1)) {
        usedPairs.add(key1);
        relationInsert.run(randomUUID(), TENANT_ID, hostId, clusterRootId, 'member_of', now);
      }
      for (let v = 0; v < vmsPerHost && idx < assetCount; v++) {
        const vmId = assetIds[idx++]!;
        const key2 = `${vmId}-${hostId}-runs_on`;
        if (!usedPairs.has(key2)) {
          usedPairs.add(key2);
          relationInsert.run(randomUUID(), TENANT_ID, vmId, hostId, 'runs_on', now);
        }
      }
    }
  });
  insertClusterRelations();

  // Random relations for remaining density
  const targetRelCount = assetCount * RELATION_DENSITY;
  const currentRelCount = usedPairs.size;
  const remainingRels = Math.max(0, targetRelCount - currentRelCount);

  const insertRandomRelations = db.transaction(() => {
    let attempts = 0;
    let inserted = 0;
    while (inserted < remainingRels && attempts < remainingRels * 3) {
      attempts++;
      const srcIdx = Math.floor(Math.random() * assetCount);
      let tgtIdx = Math.floor(Math.random() * assetCount);
      if (tgtIdx === srcIdx) tgtIdx = (tgtIdx + 1) % assetCount;
      const relType = pickRandom(RANDOM_RELATION_TYPES);
      const key = `${assetIds[srcIdx]}-${assetIds[tgtIdx]}-${relType}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);
      relationInsert.run(randomUUID(), TENANT_ID, assetIds[srcIdx]!, assetIds[tgtIdx]!, relType, now);
      inserted++;
    }
  });
  insertRandomRelations();

  // Capacity types and asset capacities
  const capTypeIds: string[] = [];
  const capTypes = [
    { slug: 'cpu_cores', name: 'CPU Cores', unit: 'cores', category: 'compute' },
    { slug: 'memory_gb', name: 'Memory', unit: 'GB', category: 'compute' },
    { slug: 'storage_gb', name: 'Storage', unit: 'GB', category: 'storage' },
  ];
  const capInsert = db.prepare(
    `INSERT OR IGNORE INTO capacity_types (id, tenant_id, slug, name, unit, category, is_system, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  );
  for (const ct of capTypes) {
    const id = randomUUID();
    capTypeIds.push(id);
    capInsert.run(id, TENANT_ID, ct.slug, ct.name, ct.unit, ct.category, now);
  }

  const acInsert = db.prepare(
    `INSERT OR IGNORE INTO asset_capacities (id, asset_id, capacity_type_id, tenant_id, direction, total, allocated, reserved, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'provide', ?, ?, '0', ?, ?)`,
  );
  const insertCapacities = db.transaction(() => {
    // Give capacities to ~30% of assets (servers and storage)
    for (let i = 0; i < assetCount; i++) {
      if (Math.random() > 0.3) continue;
      for (const ctId of capTypeIds) {
        const total = String(10 + Math.floor(Math.random() * 990));
        const allocated = String(Math.floor(parseFloat(total) * Math.random() * 0.8));
        acInsert.run(randomUUID(), assetIds[i]!, ctId, TENANT_ID, total, allocated, now, now);
      }
    }
  });
  insertCapacities();

  // Classification data
  const classModelId = randomUUID();
  db.prepare(
    `INSERT INTO classification_models (id, tenant_id, name, description, is_system, is_active, created_at)
     VALUES (?, ?, 'Criticality', 'Business criticality', 0, 1, ?)`,
  ).run(classModelId, TENANT_ID, now);

  const classValues = ['critical', 'high', 'medium', 'low'];
  const classValueIds: string[] = [];
  const cvInsert = db.prepare(
    `INSERT INTO classification_values (id, model_id, value, label, sort_order) VALUES (?, ?, ?, '{}', ?)`,
  );
  for (let i = 0; i < classValues.length; i++) {
    const id = randomUUID();
    classValueIds.push(id);
    cvInsert.run(id, classModelId, classValues[i]!, i);
  }

  const acClassInsert = db.prepare(
    `INSERT OR IGNORE INTO asset_classifications (asset_id, value_id, tenant_id, classified_at) VALUES (?, ?, ?, ?)`,
  );
  const insertClassifications = db.transaction(() => {
    for (let i = 0; i < assetCount; i++) {
      if (Math.random() > 0.5) continue;
      acClassInsert.run(assetIds[i]!, pickRandom(classValueIds), TENANT_ID, now);
    }
  });
  insertClassifications();

  // Service descriptions
  const serviceIds: string[] = [];
  const sdInsert = db.prepare(
    `INSERT INTO service_descriptions (id, tenant_id, code, title, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', 'active', ?, ?)`,
  );
  const serviceCount = Math.max(5, Math.floor(assetCount * 0.02));
  const insertServices = db.transaction(() => {
    for (let i = 0; i < serviceCount; i++) {
      const id = randomUUID();
      serviceIds.push(id);
      sdInsert.run(id, TENANT_ID, `SVC-${String(i).padStart(4, '0')}`, `Service ${i}`, now, now);
    }
  });
  insertServices();

  // Compliance frameworks + requirements + mappings
  const frameworkIds: string[] = [];
  const fwInsert = db.prepare(
    `INSERT INTO regulatory_frameworks (id, tenant_id, name, version, description, created_at)
     VALUES (?, ?, ?, '1.0', ?, ?)`,
  );
  const rrInsert = db.prepare(
    `INSERT INTO regulatory_requirements (id, framework_id, code, title, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const rsmInsert = db.prepare(
    `INSERT OR IGNORE INTO requirement_service_mappings (requirement_id, service_desc_id, tenant_id, coverage_level, reviewed_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const coverageLevels = ['full', 'partial', 'none', 'planned'];
  const categories = ['access-control', 'data-protection', 'network-security', 'monitoring', 'governance'];

  const insertCompliance = db.transaction(() => {
    for (let f = 0; f < FRAMEWORK_COUNT; f++) {
      const fwId = randomUUID();
      frameworkIds.push(fwId);
      fwInsert.run(fwId, TENANT_ID, `Framework-${f}`, `Benchmark compliance framework ${f}`, now);

      for (let r = 0; r < REQUIREMENTS_PER_FRAMEWORK; r++) {
        const reqId = randomUUID();
        rrInsert.run(reqId, fwId, `FW${f}-REQ-${String(r).padStart(3, '0')}`, `Requirement ${f}.${r}`, pickRandom(categories), now);

        // Map each requirement to 1-3 random services
        const mappingCount = 1 + Math.floor(Math.random() * 3);
        for (let m = 0; m < mappingCount && m < serviceIds.length; m++) {
          const svcIdx = Math.floor(Math.random() * serviceIds.length);
          rsmInsert.run(reqId, serviceIds[svcIdx]!, TENANT_ID, pickRandom(coverageLevels), now);
        }
      }
    }
  });
  insertCompliance();

  // Find a leaf asset (one with no children in the tree)
  const leafAssetId = assetIds[Math.min(treeSize - 1, assetCount - 1)]!;

  return {
    assetIds,
    rootAssetId: assetIds[0]!,
    leafAssetId,
    hostClusterRootId: clusterRootId,
    frameworkIds,
    serviceIds,
  };
}

// ─── Benchmark Scenarios ────────────────────────────────

function scenario1_assetListQuery(db: Database.Database): number {
  const stmt = db.prepare(`
    SELECT id, asset_type, name, display_name, status, sla_tier, environment, created_at
    FROM assets
    WHERE tenant_id = ? AND status = 'active' AND environment = 'production'
    ORDER BY created_at DESC
    LIMIT 25 OFFSET 0
  `);
  const start = performance.now();
  stmt.all(TENANT_ID);
  return performance.now() - start;
}

function scenario2_singleAssetDetail(db: Database.Database, assetId: string): number {
  const assetStmt = db.prepare(`SELECT * FROM assets WHERE id = ? AND tenant_id = ?`);
  const relStmt = db.prepare(`
    SELECT ar.*, a1.name AS source_name, a2.name AS target_name
    FROM asset_relations ar
    LEFT JOIN assets a1 ON ar.source_asset_id = a1.id
    LEFT JOIN assets a2 ON ar.target_asset_id = a2.id
    WHERE (ar.source_asset_id = ? OR ar.target_asset_id = ?) AND ar.tenant_id = ?
  `);
  const capStmt = db.prepare(`
    SELECT ac.*, ct.slug, ct.name AS type_name, ct.unit
    FROM asset_capacities ac
    JOIN capacity_types ct ON ac.capacity_type_id = ct.id
    WHERE ac.asset_id = ? AND ac.tenant_id = ?
  `);
  const classStmt = db.prepare(`
    SELECT acl.*, cv.value, cv.label, cm.name AS model_name
    FROM asset_classifications acl
    JOIN classification_values cv ON acl.value_id = cv.id
    JOIN classification_models cm ON cv.model_id = cm.id
    WHERE acl.asset_id = ? AND acl.tenant_id = ?
  `);

  const start = performance.now();
  assetStmt.get(assetId, TENANT_ID);
  relStmt.all(assetId, assetId, TENANT_ID);
  capStmt.all(assetId, TENANT_ID);
  classStmt.all(assetId, TENANT_ID);
  return performance.now() - start;
}

function scenario3_dependencyTreeTraversal(db: Database.Database, rootId: string): number {
  // Downward traversal: from root, find all assets that run_on this node
  // (children point source->target with runs_on, so reverse: find sources where target=current)
  const stmt = db.prepare(`
    WITH RECURSIVE dep_tree(id, depth, path) AS (
      SELECT ?, 0, ?
      UNION ALL
      SELECT ar.source_asset_id, dt.depth + 1, dt.path || ',' || ar.source_asset_id
      FROM asset_relations ar
      JOIN dep_tree dt ON ar.target_asset_id = dt.id
      WHERE ar.tenant_id = ?
        AND ar.relation_type = 'runs_on'
        AND dt.depth < ?
        AND INSTR(dt.path, ar.source_asset_id) = 0
    )
    SELECT dt.id, dt.depth, a.name, a.asset_type, a.status
    FROM dep_tree dt
    JOIN assets a ON dt.id = a.id
  `);

  const start = performance.now();
  stmt.all(rootId, rootId, TENANT_ID, MAX_TREE_DEPTH);
  return performance.now() - start;
}

function scenario4_slaInheritanceChain(db: Database.Database, leafId: string): number {
  const stmt = db.prepare(`
    WITH RECURSIVE sla_chain(id, sla_tier, depth) AS (
      SELECT id, sla_tier, 0
      FROM assets
      WHERE id = ? AND tenant_id = ?
      UNION ALL
      SELECT a.id, a.sla_tier, sc.depth + 1
      FROM sla_chain sc
      JOIN asset_relations ar ON ar.source_asset_id = sc.id
        AND ar.relation_type IN ('runs_on', 'hosted_on')
        AND ar.tenant_id = ?
      JOIN assets a ON a.id = ar.target_asset_id
      WHERE sc.depth < 10
        AND sc.sla_tier = 'none'
    )
    SELECT id, sla_tier, depth
    FROM sla_chain
    WHERE sla_tier != 'none'
    ORDER BY depth ASC
    LIMIT 1
  `);

  const start = performance.now();
  stmt.get(leafId, TENANT_ID, TENANT_ID);
  return performance.now() - start;
}

function scenario5_capacityUtilization(db: Database.Database, clusterRootId: string): number {
  const stmt = db.prepare(`
    WITH RECURSIVE cluster_members(id, depth) AS (
      SELECT ?, 0
      UNION ALL
      SELECT ar.source_asset_id, cm.depth + 1
      FROM asset_relations ar
      JOIN cluster_members cm ON ar.target_asset_id = cm.id
      WHERE ar.tenant_id = ?
        AND ar.relation_type IN ('member_of', 'runs_on')
        AND cm.depth < 5
    )
    SELECT
      ct.slug AS capacity_type,
      ct.unit,
      SUM(CAST(ac.total AS REAL)) AS total_capacity,
      SUM(CAST(ac.allocated AS REAL)) AS total_allocated,
      CASE WHEN SUM(CAST(ac.total AS REAL)) > 0
        THEN ROUND(SUM(CAST(ac.allocated AS REAL)) * 100.0 / SUM(CAST(ac.total AS REAL)), 2)
        ELSE 0
      END AS utilization_pct
    FROM cluster_members cm
    JOIN asset_capacities ac ON ac.asset_id = cm.id AND ac.tenant_id = ?
    JOIN capacity_types ct ON ac.capacity_type_id = ct.id
    GROUP BY ct.slug, ct.unit
  `);

  const start = performance.now();
  stmt.all(clusterRootId, TENANT_ID, TENANT_ID);
  return performance.now() - start;
}

function scenario6_complianceCoverage(db: Database.Database, frameworkId: string): number {
  const stmt = db.prepare(`
    SELECT
      rf.name AS framework_name,
      COUNT(DISTINCT rr.id) AS total_requirements,
      COUNT(DISTINCT CASE WHEN rsm.coverage_level = 'full' THEN rr.id END) AS fully_covered,
      COUNT(DISTINCT CASE WHEN rsm.coverage_level = 'partial' THEN rr.id END) AS partially_covered,
      COUNT(DISTINCT CASE WHEN rsm.coverage_level = 'none' OR rsm.requirement_id IS NULL THEN rr.id END) AS not_covered,
      ROUND(
        COUNT(DISTINCT CASE WHEN rsm.coverage_level IN ('full', 'partial') THEN rr.id END) * 100.0
        / MAX(COUNT(DISTINCT rr.id), 1),
        2
      ) AS coverage_pct,
      rr.category,
      COUNT(DISTINCT CASE WHEN rsm.coverage_level = 'full' AND rr.category = rr.category THEN rr.id END) AS cat_covered
    FROM regulatory_frameworks rf
    JOIN regulatory_requirements rr ON rr.framework_id = rf.id
    LEFT JOIN requirement_service_mappings rsm ON rsm.requirement_id = rr.id AND rsm.tenant_id = ?
    WHERE rf.id = ? AND rf.tenant_id = ?
    GROUP BY rf.name, rr.category
  `);

  const start = performance.now();
  stmt.all(TENANT_ID, frameworkId, TENANT_ID);
  return performance.now() - start;
}

function scenario7_impactAnalysis(db: Database.Database, hostId: string): number {
  // Reverse traversal: find all assets that depend on the failing host.
  // In the tree structure, children "runs_on" parent, so we follow
  // source_asset_id -> target_asset_id reversed: find all source assets
  // that point TO the current node.
  const stmt = db.prepare(`
    WITH RECURSIVE impact(id, depth, path) AS (
      SELECT ?, 0, ?
      UNION ALL
      SELECT ar.source_asset_id, imp.depth + 1, imp.path || ',' || ar.source_asset_id
      FROM asset_relations ar
      JOIN impact imp ON ar.target_asset_id = imp.id
      WHERE ar.tenant_id = ?
        AND ar.relation_type IN ('runs_on', 'member_of')
        AND imp.depth < ?
        AND INSTR(imp.path, ar.source_asset_id) = 0
    )
    SELECT imp.id, imp.depth, a.name, a.asset_type, a.status, a.sla_tier
    FROM impact imp
    JOIN assets a ON imp.id = a.id
    ORDER BY imp.depth, a.sla_tier DESC
  `);

  const start = performance.now();
  stmt.all(hostId, hostId, TENANT_ID, MAX_TREE_DEPTH);
  return performance.now() - start;
}

// ─── Statistics ─────────────────────────────────────────

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

interface ScenarioResult {
  p50: number;
  p95: number;
  max: number;
  unit: string;
  runs: number;
}

function runScenario(name: string, fn: () => number): ScenarioResult {
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    fn();
  }

  // Measured runs
  const times: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    times.push(fn());
  }

  return {
    p50: Math.round(percentile(times, 50) * 100) / 100,
    p95: Math.round(percentile(times, 95) * 100) / 100,
    max: Math.round(Math.max(...times) * 100) / 100,
    unit: 'ms',
    runs: ITERATIONS,
  };
}

// ─── Main ───────────────────────────────────────────────

interface BenchmarkOutput {
  database: string;
  timestamp: string;
  iterations: number;
  warmup: number;
  hardware: string;
  scales: Record<
    string,
    {
      assetCount: number;
      relationCount: number;
      scenarios: Record<string, ScenarioResult>;
    }
  >;
}

function main(): void {
  // Ensure clean state
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

  const output: BenchmarkOutput = {
    database: 'sqlite',
    timestamp: new Date().toISOString(),
    iterations: ITERATIONS,
    warmup: WARMUP,
    hardware: `${process.platform} ${process.arch}`,
    scales: {},
  };

  process.stderr.write('OpsWeave Performance Benchmark Suite\n');
  process.stderr.write(`Database: SQLite (${DB_PATH})\n`);
  process.stderr.write(`Iterations: ${ITERATIONS} (warmup: ${WARMUP})\n`);
  process.stderr.write(`Scales: ${SCALES.join(', ')} assets\n\n`);

  for (const scale of SCALES) {
    // Create a fresh DB for each scale to avoid cross-contamination
    const scalePath = DB_PATH.replace('.db', `-${scale}.db`);
    if (existsSync(scalePath)) unlinkSync(scalePath);

    const db = new Database(scalePath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('mmap_size = 268435456'); // 256MB mmap

    process.stderr.write(`--- Scale: ${scale} assets ---\n`);

    createSchema(db);

    process.stderr.write('  Generating data...\n');
    const data = generateData(db, scale);

    // Count actual relations
    const relCount = (db.prepare('SELECT COUNT(*) AS cnt FROM asset_relations WHERE tenant_id = ?').get(TENANT_ID) as { cnt: number }).cnt;
    process.stderr.write(`  Generated: ${scale} assets, ${relCount} relations\n`);

    const scenarios: Record<string, ScenarioResult> = {};

    process.stderr.write('  Running Scenario 1: Asset List Query...\n');
    scenarios['asset-list'] = runScenario('asset-list', () => scenario1_assetListQuery(db));

    process.stderr.write('  Running Scenario 2: Single Asset Detail...\n');
    const detailAsset = data.assetIds[Math.floor(data.assetIds.length / 2)]!;
    scenarios['asset-detail'] = runScenario('asset-detail', () => scenario2_singleAssetDetail(db, detailAsset));

    process.stderr.write('  Running Scenario 3: Dependency Tree Traversal...\n');
    scenarios['dependency-tree'] = runScenario('dependency-tree', () => scenario3_dependencyTreeTraversal(db, data.rootAssetId));

    process.stderr.write('  Running Scenario 4: SLA Inheritance Chain...\n');
    scenarios['sla-inheritance'] = runScenario('sla-inheritance', () => scenario4_slaInheritanceChain(db, data.leafAssetId));

    process.stderr.write('  Running Scenario 5: Capacity Utilization...\n');
    scenarios['capacity-utilization'] = runScenario('capacity-utilization', () => scenario5_capacityUtilization(db, data.hostClusterRootId));

    process.stderr.write('  Running Scenario 6: Compliance Coverage...\n');
    scenarios['compliance-coverage'] = runScenario('compliance-coverage', () => scenario6_complianceCoverage(db, data.frameworkIds[0]!));

    process.stderr.write('  Running Scenario 7: Impact Analysis...\n');
    scenarios['impact-analysis'] = runScenario('impact-analysis', () => scenario7_impactAnalysis(db, data.rootAssetId));

    output.scales[`${scale}`] = {
      assetCount: scale,
      relationCount: relCount,
      scenarios,
    };

    // Print summary for this scale to stderr
    process.stderr.write('\n  Results:\n');
    for (const [name, result] of Object.entries(scenarios)) {
      process.stderr.write(
        `    ${name.padEnd(24)} p50: ${String(result.p50).padStart(8)}ms  p95: ${String(result.p95).padStart(8)}ms  max: ${String(result.max).padStart(8)}ms\n`,
      );
    }
    process.stderr.write('\n');

    db.close();

    // Clean up scale DB
    if (existsSync(scalePath)) unlinkSync(scalePath);
    // WAL and SHM files
    if (existsSync(scalePath + '-wal')) unlinkSync(scalePath + '-wal');
    if (existsSync(scalePath + '-shm')) unlinkSync(scalePath + '-shm');
  }

  // Output JSON to stdout
  console.log(JSON.stringify(output, null, 2));

  // Clean up main DB path if it exists
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

  process.stderr.write('Benchmark complete. All temporary files cleaned up.\n');
}

main();
