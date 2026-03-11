# ADR-002: Graph Database Evaluation

**Status:** Deferred
**Date:** 2026-03-11
**Context:** Evo-5 — OpsWeave Resource Graph Performance

## Context

OpsWeave models an asset dependency graph (DAG) using relational tables (`assets` + `asset_relations`). As the CMDB grows with extensible types, temporal relations, capacity tracking, and cross-framework compliance mappings, graph traversal queries become more complex.

## Decision Drivers

- Current BFS traversal in `assets.service.ts` loads all relations per tenant, then traverses in-memory
- SLA inheritance uses recursive CTEs (in `db-specific/sqlite.ts` and `postgres.ts`)
- Temporal filtering adds WHERE clauses to every relation query
- Capacity utilization requires multi-hop traversal (sum consumption across relation chains)
- Target scale: 500-5,000 assets per tenant, 2,000-20,000 relations

## Current Performance Profile

At current scale (< 500 assets, < 2,000 relations per tenant):
- Full graph load: < 50ms (SQLite), < 20ms (PostgreSQL)
- BFS traversal: < 10ms in-memory after load
- SLA chain resolution: < 30ms via recursive CTE
- Temporal relation query: ~same as non-temporal (index on valid_from/valid_until)

## Considered Options

### Option A: Stay Relational (Recommended for now)
Keep SQLite/PostgreSQL with optimized queries and indexes.

**Pros:** No additional infrastructure, dual-DB strategy intact, simpler deployment
**Cons:** O(n) full-graph load, complex CTEs for multi-hop queries

### Option B: Add Neo4j as Graph Backend
Use Neo4j for graph queries, keep relational DB for CRUD.

**Pros:** Native graph traversal, Cypher query language, excellent for pathfinding
**Cons:** Additional infrastructure (Docker container), dual-write complexity, breaks single-container simplicity

### Option C: SQLite + In-Memory Graph Cache
Maintain an in-memory graph representation (adjacency list) refreshed from DB.

**Pros:** Fast traversal, no additional infrastructure, works with both DBs
**Cons:** Memory usage grows with scale, cache invalidation complexity

### Option D: Apache AGE (PostgreSQL Extension)
Use AGE graph extension on PostgreSQL for graph queries.

**Pros:** No separate infrastructure, SQL+Cypher hybrid
**Cons:** PostgreSQL only (breaks dual-DB), limited ecosystem

## Decision

**Option A for now, with Option C as future optimization.**

At target scale (5,000 assets), relational queries with proper indexing are sufficient. The in-memory graph cache (Option C) should be implemented when:
- Graph visualization consistently takes > 200ms
- SLA chain resolution exceeds 100ms
- Customers report perceptible lag in topology views

## Benchmark Plan

A benchmark script should be created at `scripts/benchmark-graph-performance.ts` to measure:

1. **Graph load time** — Load all assets + relations for a tenant
2. **BFS traversal** — Find connected component from a given asset
3. **SLA chain resolution** — Resolve SLA for an asset through inheritance chain
4. **Temporal query** — Load relations valid at a specific point in time
5. **Full topology render** — Prepare complete graph data for React Flow

Target thresholds:
- Graph load: < 100ms for 5,000 assets
- BFS: < 50ms for 20,000 relations
- SLA chain: < 100ms for 10-deep chains
- Temporal query: < 100ms for 20,000 relations with temporal filter

## Consequences

- Single-container deployment remains possible (no Neo4j dependency)
- SQLite compatibility preserved
- Performance monitoring via benchmark script informs future migration decision
- If Option C is needed, the graph cache can be implemented as a service-layer optimization without schema changes
