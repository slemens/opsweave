# ADR: Performance Benchmark Strategy

**Status:** Proposed

**Date:** 2026-03-12

**Requirement:** REQ-5.1 — Performance Baselines for Scaling Decisions

---

## Context

OpsWeave needs defined performance baselines before making scaling or architectural decisions — particularly around graph database adoption (see ADR-graph-db.md), materialized view strategies, and caching layers.

The system targets two deployment profiles with fundamentally different performance characteristics:

- **SQLite (single-container):** Designed for evaluation and small teams. Typically fewer than 50 assets (Community Edition limit), though Enterprise deployments could push higher. SQLite excels at low-concurrency, single-process workloads but lacks the query planner sophistication of PostgreSQL for complex joins and recursive CTEs.

- **PostgreSQL (multi-container):** Designed for production deployments ranging from hundreds to 100k+ assets. Benefits from parallel query execution, advanced statistics, and materialized views.

The most expensive operations in OpsWeave are graph traversals (dependency trees, SLA inheritance, impact analysis), compliance calculations (cross-framework coverage, gap analysis), and capacity aggregations across asset hierarchies. Without measured baselines, architectural decisions about optimization and infrastructure additions would be speculative.

---

## Benchmark Plan

### Test Data Generation

A data generator script (`scripts/generate-benchmark-data.ts`) will create realistic test datasets with the following parameters:

| Parameter | Description | Default |
|---|---|---|
| `assetCount` | Total number of assets to generate | 10,000 |
| `relationDensity` | Average relations per asset | 3 |
| `maxTreeDepth` | Maximum depth of parent-child hierarchies | 5 |
| `frameworkCount` | Number of compliance frameworks | 5 |
| `requirementsPerFramework` | Requirements per framework | 100 |
| `historyEntriesPerAsset` | Historical change records per asset | 10 |

**Asset type distribution** (reflecting realistic CMDB composition):

| Type | Percentage |
|---|---|
| Servers / Virtual Machines | 40% |
| Network Devices | 20% |
| Software / Applications | 15% |
| Security Assets (Firewalls, WAFs, etc.) | 15% |
| Other (Storage, Peripherals, etc.) | 10% |

**Relationship patterns:**

- Parent-child hierarchies (e.g., cluster -> host -> VM -> application)
- Horizontal dependencies (e.g., application -> database, application -> load balancer)
- Service-layer links (e.g., asset -> service description -> catalog)
- All relationships respect DAG constraints (no cycles)

The generator must support both SQLite and PostgreSQL targets and must scope all data to a single test tenant.

---

## Benchmark Scenarios

### Scenario 1: Asset List Query

Paginated asset list with filters (status, type, environment) and sorting.

| Data Scale | Assets | Target (p95) |
|---|---|---|
| Small | 1,000 | <100ms |
| Medium | 10,000 | <150ms |
| Large | 50,000 | <200ms |
| XL | 100,000 | <200ms |

**Query pattern:** `SELECT ... FROM assets WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 25 OFFSET ?`

### Scenario 2: Single Asset Detail

Fetch a single asset with its immediate relations, capacities, classifications, and linked tickets.

| Data Scale | Relations per Asset | Target (p95) |
|---|---|---|
| Typical | 5 relations | <50ms |
| Dense | 50 relations | <100ms |
| Very dense | 200 relations | <200ms |

**Query pattern:** Asset fetch + JOIN on relations + subqueries for capacities and classifications.

### Scenario 3: Dependency Tree Traversal

Recursive CTE traversal from a root asset down through all dependency levels.

| Data Scale | Assets | Avg Relations | Max Depth | Target (p95) |
|---|---|---|---|---|
| Small | 10,000 | 3 | 5 | <200ms |
| Medium | 50,000 | 3 | 5 | <500ms |
| Large | 100,000 | 3 | 5 | <500ms |
| Deep | 50,000 | 3 | 10 | <1000ms |

**Query pattern:** Recursive CTE on `asset_relations` with depth counter and cycle guard.

### Scenario 4: SLA Inheritance Chain

Follow the parent chain from a leaf asset upward to resolve the effective SLA tier.

| Data Scale | Chain Depth | Target (p95) |
|---|---|---|
| Shallow | 3 levels | <50ms |
| Medium | 5 levels | <100ms |
| Deep | 10 levels | <200ms |

**Query pattern:** Recursive CTE ascending through `runs_on` or `hosted_on` relations until an asset with an explicit SLA tier is found.

### Scenario 5: Capacity Utilization Aggregation

Sum capacity values (CPU, memory, storage) across a host cluster hierarchy.

| Data Scale | Hosts | VMs per Host | Target (p95) |
|---|---|---|---|
| Small | 10 | 10 | <50ms |
| Medium | 100 | 10 | <300ms |
| Large | 1,000 | 10 | <500ms |

**Query pattern:** Recursive CTE to collect all descendant assets, then aggregate capacity metrics.

### Scenario 6: Compliance Coverage Calculation

Calculate coverage percentage for a single framework, aggregating across all requirement-to-service mappings.

| Data Scale | Frameworks | Requirements | Mappings | Target (p95) |
|---|---|---|---|---|
| Small | 1 | 50 | 200 | <100ms |
| Medium | 5 | 500 | 5,000 | <500ms |
| Large | 10 | 1,000 | 10,000 | <1000ms |

**Query pattern:** JOIN across `regulatory_frameworks`, `regulatory_requirements`, and `requirement_service_mappings` with GROUP BY and coverage percentage calculation.

### Scenario 7: Impact Analysis

Starting from a single host asset, determine all dependent assets that would be affected by its failure.

| Data Scale | Total Assets | Total Relations | Target (p95) |
|---|---|---|---|
| Small | 10,000 | 30,000 | <300ms |
| Medium | 50,000 | 150,000 | <1000ms |
| Large | 100,000 | 300,000 | <2000ms |

**Query pattern:** Recursive CTE traversing `depends_on` and `runs_on` relations in reverse direction (find everything that depends on the failing asset).

---

## Execution Plan

### Phase 1: Implement Data Generator

Create `scripts/generate-benchmark-data.ts` with:

- Configurable parameters (asset count, density, depth, framework count)
- Realistic type and relationship distribution
- Support for both SQLite and PostgreSQL targets
- Deterministic seeding (repeatable results with same parameters)
- Tenant-scoped output (all data under a single benchmark tenant)

### Phase 2: Run Baseline Benchmarks

Execute all seven scenarios on:

- **SQLite** (single-container mode) at 1k, 10k scale
- **PostgreSQL** (docker compose) at 1k, 10k, 50k, 100k scale

Record p50, p95, p99, and max response times. Run each scenario 100 times after a 10-iteration warmup.

### Phase 3: Document Results

Store results as JSON in `docs/architecture/benchmark-results/`:

```
benchmark-results/
├── sqlite-1k.json
├── sqlite-10k.json
├── postgres-1k.json
├── postgres-10k.json
├── postgres-50k.json
├── postgres-100k.json
└── summary.md          # Human-readable comparison table
```

Each JSON file follows the structure:

```json
{
  "database": "postgresql",
  "assetCount": 50000,
  "timestamp": "2026-03-15T14:00:00Z",
  "scenarios": {
    "asset-list": { "p50": 45, "p95": 120, "p99": 180, "max": 250, "unit": "ms" },
    "dependency-tree": { "p50": 180, "p95": 420, "p99": 510, "max": 680, "unit": "ms" }
  }
}
```

### Phase 4: Evaluate and Escalate

- Compare results against acceptance criteria defined per scenario
- If all scenarios pass on PostgreSQL at 50k assets: no further action needed
- If any scenario fails at 50k: implement Phase 2 optimizations from ADR-graph-db.md (materialized views)
- If optimizations are insufficient at 100k: escalate to Phase 3 of ADR-graph-db.md (graph DB evaluation)

---

## Acceptance Criteria

### PostgreSQL

| Scale | Requirement |
|---|---|
| 10,000 assets | All scenarios must meet p95 targets |
| 50,000 assets | All scenarios must meet p95 targets |
| 100,000 assets | Scenarios 1-6 must meet p95 targets; Scenario 7 (impact analysis) may exceed by up to 2x |

### SQLite

| Scale | Requirement |
|---|---|
| 1,000 assets | All scenarios must meet p95 targets |
| 10,000 assets | All scenarios should meet p95 targets; up to 2x overshoot acceptable |
| 50,000+ assets | Not a target for SQLite deployments |

If any scenario fails its acceptance criteria on PostgreSQL at 50,000 assets, escalate to graph database evaluation per ADR-graph-db.md.

---

## Tooling

- **Runner:** Custom script using `performance.now()` for precise timing, or Vitest bench mode for integration with existing test infrastructure
- **Statistics:** Calculate p50, p95, p99, max from raw timing arrays; discard warmup iterations
- **Environment:** Benchmarks must run on a defined hardware baseline (documented in results). Docker container resource limits should be specified for reproducibility.
- **CI integration (future):** Optionally run a subset of benchmarks (1k scale, SQLite) in CI to detect performance regressions. Full-scale benchmarks remain manual.

---

## Consequences

- A data generator script will be created, which also serves as a useful tool for development and demo environments
- Benchmark results provide objective evidence for or against infrastructure changes, preventing premature optimization
- The phased approach (measure first, optimize second, add infrastructure third) minimizes operational complexity
- Results are versioned alongside the codebase, creating a performance history that tracks the impact of schema and query changes over time

---

## References

- ADR-graph-db.md — Graph database strategy (directly informed by benchmark results)
- PostgreSQL EXPLAIN ANALYZE: https://www.postgresql.org/docs/current/using-explain.html
- SQLite Query Planning: https://www.sqlite.org/eqp.html
- Vitest Bench: https://vitest.dev/guide/features.html#benchmarking
