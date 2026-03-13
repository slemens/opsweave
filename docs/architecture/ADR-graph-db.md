# ADR: Graph Database Strategy for Asset Relationship Traversals

**Status:** Accepted

**Date:** 2026-03-12

**Requirement:** REQ-5.1 — Graph Database Evaluation for CMDB Traversals

---

## Context

OpsWeave stores asset relationships in a relational table (`asset_relations`) using a directed acyclic graph (DAG) model. Current traversals rely on recursive CTEs for operations such as SLA inheritance, dependency tree resolution, classification propagation, and impact analysis.

As the CMDB grows from evaluation-scale (hundreds of assets) toward production-scale (10k, 50k, 100k+ assets), deep graph queries become increasingly expensive. Recursive CTEs that perform well at 1,000 nodes may degrade significantly at 50,000 nodes with high relationship density.

The system must support the following graph-intensive operations:

- **Full dependency trees** traversed to 5+ levels of depth
- **Capacity aggregation** across host/VM/cluster hierarchies
- **Classification inheritance** propagated down asset trees
- **Historical state reconstruction** at arbitrary points in time
- **Impact analysis** ("what breaks if this host goes down?")
- **Cross-framework coverage calculation** across multiple compliance frameworks

A critical architectural constraint is OpsWeave's dual-database strategy: all core functionality must work with both PostgreSQL (multi-container) and SQLite (single-container). Any graph acceleration approach must respect this constraint or be scoped exclusively to PostgreSQL deployments.

---

## Options Evaluated

### Option 1: Stay Relational — Recursive CTEs + Materialized Views

- **Approach:** Continue using PostgreSQL recursive CTEs and SQLite recursive CTEs for all graph traversals. Add materialized views on the PostgreSQL side for frequently-accessed traversals.
- **Pros:**
  - No additional infrastructure required
  - Works with the existing SQLite/PostgreSQL dual-DB strategy
  - Proven and well-understood at moderate scale
  - Simple operations — no sync, no eventual consistency
  - Single transaction boundary for reads and writes
- **Cons:**
  - Recursive CTEs become expensive at 5+ levels with 100k+ nodes and high relationship density
  - No native graph query language — traversal logic lives in application code and raw SQL
  - Materialized views require a refresh strategy (on-write or periodic)
- **Suitable up to:** ~50k assets with moderate relationship density (avg 3-5 relations per asset)

### Option 2: PostgreSQL with Apache AGE Extension

- **Approach:** Install the Apache AGE extension on PostgreSQL to enable Cypher graph queries on top of relational storage.
- **Pros:**
  - Cypher query language for natural graph traversals
  - No separate database — runs inside existing PostgreSQL
  - Single transaction boundary preserved
  - Open source (Apache 2.0)
- **Cons:**
  - AGE is not available on all managed PostgreSQL hosting providers (AWS RDS, Azure Database for PostgreSQL, etc.)
  - Completely breaks SQLite compatibility — graph queries would only work on PostgreSQL
  - Relatively young project with a smaller community compared to mature graph databases
  - Limited tooling and ecosystem
- **Risk:** Vendor lock-in to AGE-compatible PostgreSQL deployments

### Option 3: ArangoDB as Secondary Graph Store

- **Approach:** Deploy ArangoDB alongside the primary database. Sync asset and relationship data to ArangoDB for read-only graph queries while keeping the primary database as the system of record for writes.
- **Pros:**
  - Multi-model database (document + graph + key-value) with strong traversal performance
  - AQL query language designed for graph and document operations
  - Docker-friendly deployment, fits the existing container strategy
  - Apache 2.0 license — compatible with AGPL
- **Cons:**
  - Requires a data synchronization layer between the primary DB and ArangoDB
  - Introduces eventual consistency risk for graph reads
  - Additional operational complexity — another database to monitor, backup, and upgrade
  - Learning curve for AQL
- **Suitable for:** 50k-500k assets where relational traversals have been benchmarked as insufficient

### Option 4: Neo4j as Secondary Graph Store

- **Approach:** Deploy Neo4j alongside the primary database. Sync asset and relationship data for read-only graph queries.
- **Pros:**
  - Most mature graph database available, with the largest ecosystem
  - Cypher is the de facto standard graph query language
  - Best-in-class traversal performance for deep, complex graph patterns
  - Extensive documentation and community support
- **Cons:**
  - Neo4j Community Edition is GPL — potential license compatibility concern with AGPL (copyleft interaction)
  - Neo4j Enterprise is commercially licensed — cost factor for self-hosted deployments
  - Heavy resource usage compared to alternatives
  - Same sync infrastructure requirement as ArangoDB
- **Risk:** License friction for open-source distribution; significant infrastructure cost

### Option 5: SurrealDB

- **Approach:** Use SurrealDB as a combined document/graph store, potentially replacing or augmenting the primary database.
- **Pros:**
  - Multi-model (graph + document + relational) in a single database
  - Modern API with WebSocket support
  - Rust-based, with strong performance characteristics
  - Designed for multi-tenant workloads
- **Cons:**
  - Very young project — stability concerns for production ITSM workloads
  - Small community with limited production deployment references
  - Breaking API changes are still occurring between minor versions
  - Insufficient maturity for a system that manages critical IT infrastructure data
- **Risk:** Too early to adopt for production use in a system where data integrity is paramount

---

## Decision

The decision follows a phased approach, deferring infrastructure complexity until benchmarks prove it necessary.

### Phase 1 — Stay Fully Relational (Current, 0-50k Assets)

Remain on the existing dual-DB architecture with recursive CTEs. Optimize by:

- **Composite indexes** on `(tenant_id, source_asset_id)` and `(tenant_id, target_asset_id)` in `asset_relations` (already in place)
- **Bounded recursive CTEs** with a configurable max depth parameter (default 10) to prevent runaway queries
- **Query result caching** via TanStack Query on the frontend (5-minute staleTime, already implemented) and optional server-side caching for expensive traversals
- **Lazy loading** of deep traversals — load immediate relations on page load, fetch deeper levels on user interaction
- **Query time logging** on all graph-intensive endpoints to establish performance baselines

### Phase 2 — PostgreSQL Materialized Views (50k-100k Assets, If Needed)

If Phase 1 benchmarks show degradation approaching acceptance thresholds, add PostgreSQL-specific materialized views for:

- **Transitive closure** of the dependency graph (refreshed on relationship write via trigger or application-level invalidation)
- **Pre-computed SLA inheritance paths** to avoid repeated recursive traversals
- **Classification inheritance cache** for propagated classification levels

This phase applies only to PostgreSQL deployments. SQLite deployments continue with recursive CTEs, which is acceptable given SQLite's intended use for smaller installations (<10k assets).

### Phase 3 — Graph Acceleration Layer (100k+ Assets, Only If Benchmarks Require)

If Phase 2 optimizations prove insufficient at 100k+ assets, evaluate Apache AGE or ArangoDB as a read-only graph acceleration layer. This would require:

- A synchronization service between the primary database and the graph store
- Read-only graph queries routed to the graph store; all writes go through the primary database
- Comprehensive testing and a migration path
- A separate ADR for the specific technology choice at that point

---

## Benchmark Scenarios

The following scenarios must be benchmarked before any Phase 2 or Phase 3 decision is made. Results will be documented in `docs/architecture/benchmark-results/`.

| Scenario | Query | Data Scale | Target (p95) |
|---|---|---|---|
| Dependency tree (5 levels) | Recursive CTE from root asset | 10k / 50k / 100k assets | <500ms |
| Capacity aggregation | Sum capacities across cluster hierarchy | 1k / 5k / 10k hosts | <300ms |
| Classification inheritance | Propagate max classification down tree | 10k / 50k assets | <200ms |
| Historical reconstruction | Asset state at point-in-time | 100k history entries | <500ms |
| Impact analysis | "What breaks if host X fails?" | 10k / 50k assets | <1000ms |
| Cross-framework coverage | Aggregate coverage across 5 frameworks x 500 requirements | 2500 req-service mappings | <500ms |

If any scenario consistently exceeds its p95 target on PostgreSQL at 50k assets, the Phase 2 optimizations should be implemented. If Phase 2 does not resolve the issue, escalate to Phase 3 evaluation.

---

## Consequences

- **No additional infrastructure** is required in the current phase. The system continues to run on SQLite or PostgreSQL alone.
- **Performance monitoring** should be added to key graph query endpoints (log query execution time, track p50/p95 over time).
- **The 500ms threshold** serves as the trigger for revisiting this ADR. If any graph query consistently exceeds 500ms at production scale, the Phase 2 or Phase 3 path should be evaluated.
- **Reversibility:** The decision to stay relational is fully reversible. The asset graph model (nodes in `assets`, edges in `asset_relations`) maps cleanly to any graph database. Migration would involve exporting nodes and edges, not restructuring the data model.
- **SQLite scope:** SQLite deployments are explicitly scoped to smaller installations. Graph performance optimization beyond recursive CTEs is not planned for SQLite.

---

## References

- Apache AGE: https://age.apache.org/
- ArangoDB: https://www.arangodb.com/
- Neo4j: https://neo4j.com/
- SurrealDB: https://surrealdb.com/
- PostgreSQL Recursive CTEs: https://www.postgresql.org/docs/current/queries-with.html
- SQLite Recursive CTEs: https://www.sqlite.org/lang_with.html
