# OpsWeave Platform Evolution — Implementation Prompt

## Strategic Context

OpsWeave is an open-source ITSM platform (AGPL-3.0, freemium) — multi-tenant, asset-centric, dual-DB (PostgreSQL + SQLite), i18n (de/en). Tech stack: React/TypeScript/Tailwind/shadcn frontend, Node.js/Express/Drizzle backend, Docker-first deployment. Repository: github.com/slemens/opsweave.

**Strategische Positionierung:** Field feedback from experienced managed service operators in regulated German-speaking markets (banking, DORA, NIS2, C5) makes clear: OpsWeave is not perceived as just a ticketing system. It is increasingly seen as a potential **Operations Knowledge Graph** — spanning operations, security, compliance, service management, and capacity planning. This prompt operationalizes that vision.

The enhancements described here address gaps between the current CMDB/asset model and what real-world ITSM operations require — especially in multi-tenant managed service environments with compliance obligations.

**Non-negotiable constraints:**

- Backwards compatibility — existing data and APIs must not break
- All schema changes via Drizzle migrations (reversible)
- i18n (de/en) from day one on every new entity, label, and error message
- Automated testing only (Vitest unit, Playwright E2E) — no manual QA
- Follow existing API patterns (Express router, Drizzle queries, tenant-scoped)
- Follow existing UI patterns (shadcn/ui, responsive, existing layout conventions)

---

## Phase 1: Advanced CMDB Foundation

### 1.1 Extensible Asset Type System

**Problem:** Assets are hardware-centric. All types share the same attribute set (serial number, manufacturer, rack position). A certificate or domain doesn't have a rack position. The system needs to support arbitrary asset types without code changes.

**Requirements:**

- Introduce a type registry: `asset_types` table with `id`, `name`, `icon`, `description`, `is_builtin` (boolean), `i18n_label_de`, `i18n_label_en`
- Ship with built-in types: `server`, `virtual_machine`, `container`, `network_device`, `storage`, `ip_address`, `domain`, `certificate`, `port`, `software`, `application`, `database`, `database_instance`, `network_connection`, `service_endpoint`
- Administrators can create custom asset types via Admin UI — no code changes required
- Each type participates fully in the relationship graph, lifecycle management, and audit trail
- All existing assets are migrated to the new type system (map current categories to built-in types)

```
REQ-1.1: Asset types must be extensible and definable by administrators without code changes.
```

### 1.2 Type-Specific Attribute Schemas

**Problem:** A server needs CPU/RAM/storage fields. A certificate needs issuer/expiry/SANs. Currently all assets get the same fields.

**Requirements:**

- Each asset type defines its own attribute schema
- Base attributes shared across ALL types: `name`, `description`, `status`, `owner`, `tenant`, `tags`, `created_at`, `updated_at`
- Type-specific attributes stored in a schema registry (DB-backed):
  - Schema: `asset_type_attributes` table with `asset_type_id`, `attribute_key`, `data_type` (string, number, date, boolean, enum, reference, json), `required`, `display_order`, `default_value`, `validation_rules` (JSON), `i18n_label_de`, `i18n_label_en`
- Admin UI to manage attribute schemas per type (add/remove/reorder fields, set validation, set required/optional)
- Asset detail views, list views, filters, and API responses dynamically adapt to the type's schema
- Reference attribute types for cross-linking (e.g., a certificate's `domain` field references a domain asset)

**Type-specific attribute examples:**

| Asset Type | Typical Attributes |
|---|---|
| Server | CPU, RAM, storage, serial number, manufacturer, rack position |
| Certificate | subject, issuer, serial, SAN entries, key type, validity start/end, auto-expiry alert |
| Domain | FQDN, registrar, DNS provider, zone, TTL, expiry date |
| IP Address | IPv4/IPv6, subnet, VLAN, allocation status (reserved/assigned/dynamic), reverse DNS |
| Port | number, protocol (TCP/UDP), service name, state (open/filtered/closed) |
| Software | vendor, product, version, edition, license type, support status |
| Database Instance | DBMS type, version, instance name, tenant reference |
| Network Connection | type (L2/L3), VLAN, bandwidth, endpoints |

```
REQ-1.2: Each asset type must support its own attribute schema, manageable through admin UI.
```

### 1.3 Security-Relevant Assets as First-Class Entities

**Problem:** IP addresses, domains, certificates, and ports are modeled as properties on other assets. From a security and operations perspective they are independent entities with their own lifecycle, relationships, and audit requirements.

**Requirements:**

- IP addresses, domains, certificates, ports, and service endpoints are modeled as **independent assets** with full lifecycle
- Each has its own detail view, relationship graph participation, and audit trail
- Migration path: existing IP fields on hardware assets become relationship links to IP address assets
- These assets enable:
  - Vulnerability scanner integration (scan results link to IP/port/service endpoint assets)
  - Attack surface mapping (domain → certificate → IP → host → application graph)
  - Certificate expiry monitoring (dashboard widget)
  - Domain ownership tracking
  - Port exposure analysis

```
REQ-1.3: Security-relevant entities (IP, domain, certificate, port) must be modeled as independent first-class assets.
```

### 1.4 Software Asset Deepening

**Problem:** Software tracking is too rudimentary — no versioning, licensing, dependency tracking, or lifecycle management.

**Requirements:**

- Software assets carry: vendor, product name, version, edition, license type (per-seat, per-core, subscription, open-source), license count, license expiry, support status (active/EOL/EOSL), CVE reference link
- Relationship types: `installed_on` (host/VM/container), `depends_on` (other software), `licensed_to` (tenant), `part_of` (application)
- Dashboard widgets: software nearing EOL/EOSL, license utilization, unlicensed installations
- Import: CSV/JSON bulk import of software inventory

```
REQ-1.4: Software assets must support lifecycle, versioning, licensing, and dependency metadata.
```

### 1.5 Configurable Asset Classification

**Problem:** Assets cannot be classified for security audits. This is mandatory in C5, ISO 27001, DORA, BSI Grundschutz.

**Requirement:** The system must support **multiple concurrent classification dimensions**, not just one fixed model. Different organizations use different models.

**Implementation:**

- Classification model registry: `classification_models` table with `id`, `name` (e.g., "CIA+A", "BSI Schutzbedarf", "Internal Risk Class"), `dimensions` (JSON array of dimension definitions), `i18n_label_de`, `i18n_label_en`
- Ship with built-in models:
  - **CIA+A**: dimensions `confidentiality`, `integrity`, `availability`, `authenticity` — each with levels `none`, `low`, `normal`, `high`, `very_high` (BSI Grundschutz aligned)
  - **BSI Schutzbedarf**: dimensions `schutzbedarf` with levels `normal`, `hoch`, `sehr_hoch`
  - **Business Criticality**: single dimension with levels `low`, `medium`, `high`, `critical`
- Admin can define custom classification models
- Every asset can carry classifications from **multiple models simultaneously** (e.g., CIA+A AND business criticality AND regulatory relevance)
- Schema: `asset_classifications` table with `asset_id`, `classification_model_id`, `dimension_key`, `level`, `justification` (text), `classified_by`, `classified_at`
- **Inheritance**: a host's classification propagates to all assets running on it (max principle — child inherits the highest classification unless explicitly overridden)
- Classification history: all changes tracked with reason and author
- Audit views: list assets by classification level, filter unclassified assets, export classification matrix as CSV/XLSX

```
REQ-1.5a: Assets must support configurable classification models.
REQ-1.5b: Assets must support multiple concurrent classification dimensions.
```

---

## Phase 2: Multi-Tenancy, Services & Organization

### 2.1 Multi-Tenant Asset Assignment

**Problem:** An asset can currently belong to only one tenant. In managed service environments, infrastructure is routinely shared: a DBMS runs on shared hardware but each customer has their own DB instance. Hypervisors, Kubernetes clusters, monitoring platforms, backup systems, and network segments are commonly shared.

**Requirements:**

- An asset can be assigned to multiple tenants with assignment type: `dedicated`, `shared`, `inherited`
  - `dedicated`: asset belongs exclusively to one tenant
  - `shared`: asset serves multiple tenants (e.g., hypervisor, shared DBMS, network switch, monitoring platform)
  - `inherited`: assignment derived through the relationship graph (e.g., DB instance inherits tenant from the application using it)
- Schema: `asset_tenant_assignments` table with `asset_id`, `tenant_id`, `assignment_type` (enum), `inherited_from_asset_id` (nullable), `notes`
- UI: tenant assignment panel on asset detail showing all assigned tenants, assignment type, and inheritance path
- API: filter assets by tenant, including inherited assignments
- Hierarchical derivation example:
  ```
  DBMS (shared: Customer A, B, C)
   └── Database Instance (inherited → Customer A)
        └── Customer Application (dedicated: Customer A)
  ```

```
REQ-2.1: Assets must support relationships to multiple customers with typed assignment.
```

### 2.2 Extended Service Model

**Problem:** Current service tiers (Gold/Silver/Bronze) are too coarse. Real SLAs specify RPO, RTO, availability percentages, service windows, penalty clauses, escalation paths — per service, per customer.

**Requirements:**

#### 2.2a Service-Level Agreements as first-class entity

- New entity: `service_level_agreement` with:
  - `service_id`, `tenant_id` (per-customer SLAs)
  - `availability_pct` (e.g., 99.9)
  - `rto_minutes` (Recovery Time Objective)
  - `rpo_minutes` (Recovery Point Objective)
  - `service_window` (JSON: `{"days": "mon-fri", "hours": "08:00-18:00", "timezone": "Europe/Berlin"}`)
  - `maintenance_window` (JSON)
  - `support_level` (e.g., "8x5", "24x7", "best-effort")
  - `recovery_class` (text)
  - `business_criticality` (enum)
  - `penalty_clause` (text/markdown)
  - `escalation_path` (JSON: array of escalation levels with contact + timeframe)
  - `contract_reference` (text — link to external contract management)
  - `valid_from`, `valid_until`
- SLAs are versioned: new SLA supersedes old one, old one is archived with full history
- UI: SLA overview per service, per customer, with active/expired status
- Link SLAs to assets through service membership

```
REQ-2.2a: Services must support extended reliability attributes (SLA, RTO, RPO, service windows, escalation).
```

#### 2.2b Multi-dimensional Service Profiles

- Services should support structured profiles beyond simple tier classification
- Multiple dimensions: availability class, support level, recovery class, compliance scope, business criticality
- Each dimension independently configurable per service-tenant combination

```
REQ-2.2b: Services should support structured service profiles beyond simple service tiers.
```

#### 2.2c Service Scope and Entitlement Modeling

- Services should define scope boundaries:
  - `included`: in standard scope
  - `excluded`: explicitly not covered
  - `addon`: available as paid extension
  - `optional`: bookable on request
- Schema: `service_scope_items` table with `service_id`, `item_description`, `scope_type` (enum), `notes`
- Enables clear communication of what's in/out of a service contract

```
REQ-2.2c: Services should support scope and entitlement modeling.
```

### 2.3 Project Structures

**Problem:** Besides customers, sub-structures are needed for cost allocation, audit scoping, migration tracking, and onboarding/offboarding.

**Requirements:**

- New entity: `project` with `id`, `name`, `tenant_id`, `description`, `status`, `start_date`, `end_date`
- Assets and services can be assigned to a project (in addition to tenant assignment)
- Project dashboard: assets, services, SLAs, compliance status scoped to a project
- Flat structure under tenant in v1 — no nested projects
- Long-term note: projects could also become graph objects, but keep it simple initially

```
REQ-2.3: System must support project structures within customers.
```

---

## Phase 3: Resource Graph & Capacity Management

### 3.1 Typed Capacity System

**Problem:** The current graph shows topology (what runs where, depends on what) but carries no quantitative information. Cannot answer: "Is this host overprovisioned?", "Can I migrate this workload?", "Do we have rack space?"

**Requirements:**

- Capacity type registry: `capacity_types` table with `id`, `name`, `unit`, `data_type` (number, boolean, enum), `category` (compute, storage, network, power, space, human, license, other), `i18n_label_de`, `i18n_label_en`
- Ship with built-in capacity types:

| Category | Capacity Types |
|---|---|
| Compute | `cpu_cores`, `cpu_threads`, `ram_gb` |
| Storage | `storage_gb`, `iops` |
| Network | `bandwidth_mbps`, `ip_addresses`, `ports` |
| Power | `power_feed_a_amps`, `power_feed_b_amps`, `power_watts` |
| Space | `rack_units` |
| Human | `team_fte`, `qualification` (enum) |
| License | `license_count` |

- Each asset node can declare:
  - **provides**: capacities it offers (e.g., host provides 256 GB RAM)
  - **requires**: capacities it consumes (e.g., VM requires 16 GB RAM)
- Schema: `asset_capacities` table with `asset_id`, `capacity_type_id`, `direction` (provides/requires), `value`, `max_value` (nullable, for overcommit tracking)
- The model is intentionally abstract — it covers infrastructure, team capacity, skills, license pools, and software capabilities through the same mechanism

```
REQ-3.1: Assets must support typed capacities (provides/requires).
```

### 3.2 Edge Properties and Capacities

**Problem:** Relations are unqualified links. A `depends_on` between a service and a database says nothing about latency, bandwidth, or contractual constraints. The graph needs richer edges.

**Requirements:**

- Relationships carry typed properties:
  - Schema: `asset_relationship_properties` table with `relationship_id`, `property_key`, `property_value`, `property_type` (string, number, date, boolean, enum)
  - Examples: network link → `bandwidth_mbps: 10000`, `latency_ms: 0.5`; power feed → `amps: 32`, `redundancy: A`
- Relationships also carry capacity consumption:
  - Example: VM `runs_on` host, consuming `ram_gb: 16`, `cpu_cores: 4`, `storage_gb: 200`
- Extended relationship types beyond current set:
  - Add: `exposes`, `protects`, `backs_up`, `monitored_by`, `serves`, `governed_by`, `licensed_to`, `encrypts`
  - Relationship types should be extensible by administrators
- Edge properties are typed and filterable in the UI and API

```
REQ-3.2a: Relations between assets must support metadata and capacity consumption.
REQ-3.2b: Relationship types must be extensible.
```

### 3.3 Historization

**Problem:** Relations and assignments are static. For audits, incident analysis, and change traceability, the system needs temporal data.

**Requirements:**

- All relationships support temporal validity: `valid_from`, `valid_until` on `asset_relationships`
- Relationship change log: `asset_relationship_history` with `relationship_id`, `action` (created/modified/deleted), `changed_by`, `changed_at`, `old_values` (JSON), `new_values` (JSON)
- Capacity change log: `asset_capacity_history` with `asset_id`, `capacity_type_id`, `old_value`, `new_value`, `changed_by`, `changed_at`, `reason`
- Asset state history: key attribute changes tracked over time
- UI: timeline view on asset detail showing relationship, capacity, and classification changes
- API: query asset state and relationships at a point in time (for audit trail and incident forensics)

```
REQ-3.3a: Asset relations must support temporal data (valid_from, valid_until).
REQ-3.3b: The system should support historical state reconstruction for assets and relationships.
```

### 3.4 Provisioning Analysis & Placement Intelligence

**Problem:** With capacities modeled, the system can answer operational questions that currently require spreadsheets or tribal knowledge.

**Requirements (read-only analysis views, no automation in v1):**

- **Utilization view**: per host/cluster/datacenter — used vs. available capacity per type, overcommit ratio
- **Resource compatibility check**: select a workload, see which hosts have sufficient free capacity of matching types
- **Migration feasibility**: select a workload + target, validate capacity fit
- **Capacity planning**: project future utilization based on trend (simple linear projection, not ML)
- **Overprovisioning detection**: flag resources consuming significantly less than allocated
- API endpoints for all capacity queries (enable external tooling and dashboards)

```
REQ-3.4a: System must support resource compatibility checks.
REQ-3.4b: The system should support planning and simulation use cases based on the resource graph.
```

### 3.5 Dynamic Forms

**Problem:** With variable asset types, attribute schemas, capacity types, and classification models, hardcoded forms don't work.

**Requirements:**

- Asset create/edit forms generated dynamically from:
  - The asset type's attribute schema (Phase 1.2)
  - The asset type's expected capacity types (Phase 3.1)
  - Active classification models (Phase 1.5)
  - Tenant assignments (Phase 2.1)
- Form sections: "General" (base attributes) → "Type-specific" (schema fields) → "Capacities" (provides/requires) → "Relationships" → "Classification" → "Tenants"
- Admin configures which capacity types are relevant per asset type
- **Context-based views**: different perspectives on the same data depending on role/use case:
  - Operations view (capacity, dependencies, status)
  - Security view (classification, certificates, ports, attack surface)
  - Compliance view (classification, framework coverage, audit status)
  - Architecture view (full graph, capacity, planning)

```
REQ-3.5a: Asset forms should be dynamically generated based on type and schema.
REQ-3.5b: The system should support context-based views (operations, security, compliance, architecture).
```

---

## Phase 4: Compliance Module 2.0

### 4.1 Multi-Framework Support with Cross-Mapping

**Problem:** When you implement a control for ISO 27001 A.8.1, it likely also satisfies C5 OPS-01 and DORA Art. 9. Currently every framework is tracked independently, duplicating effort. At 5+ frameworks with 100+ requirements each, the matrix becomes unmanageable.

**Requirements:**

- New entity: `framework_requirement_mapping` with `source_framework_id`, `source_requirement_id`, `target_framework_id`, `target_requirement_id`, `mapping_type` (equal, partial, related), `notes`
- UI: when viewing a requirement, show mapped requirements from other frameworks
- Coverage transitivity: "if you fulfill this requirement, you also cover these across other frameworks"
- Pre-seed common mappings: ISO 27001 ↔ C5 ↔ DORA (at least 50 high-confidence mappings per pair)
- Import/export mappings as CSV
- Supported frameworks (initial): ISO 27001, BSI C5, NIS2, DORA, SOC2, DSGVO, internal policies

```
REQ-4.1: Compliance module must support multi-framework mapping and cross-referencing.
```

### 4.2 Reusable Controls

**Problem:** Without abstraction, every framework requirement maps directly to assets — creating a `Framework × Requirement × Asset` matrix that explodes in complexity.

**Requirements:**

- Introduce `controls` as an abstraction layer between framework requirements and implementation
- A control can satisfy multiple requirements across multiple frameworks
- A control is linked to assets, processes, or documentation that implement it
- Schema: `controls` table with `id`, `name`, `description`, `owner`, `implementation_status`, `evidence_links` (JSON)
- Schema: `control_requirement_links` with `control_id`, `requirement_id`, `coverage_type` (full, partial)
- This reduces manual mapping effort through reusable control definitions and inheritance

```
REQ-4.2: The system should minimize manual mapping effort through reusable controls.
```

### 4.3 Audit Tracking

**Problem:** Audits are not represented as entities. There's no way to track audit cycles, findings, evidence, or remediation.

**Requirements:**

- New entity: `audit` with `id`, `name`, `framework_id`, `tenant_id`, `auditor`, `audit_type` (internal/external/certification), `status` (planned/in_progress/completed/follow_up), `start_date`, `end_date`, `scope` (text/markdown), `notes`
- Audit findings: `audit_finding` with `audit_id`, `requirement_id`, `control_id` (nullable), `status` (conforming/minor_nc/major_nc/observation/not_applicable), `evidence_links` (JSON), `auditor_notes`, `remediation_action`, `remediation_due_date`, `remediation_status`
- UI: audit dashboard with status per requirement, non-conformity tracking, remediation progress
- Export: audit report as XLSX or DOCX (finding summary, per-requirement status, evidence references)

```
REQ-4.3: System must support audit tracking with findings, evidence, and remediation.
```

### 4.4 Granular Coverage and Maturity

**Problem:** Current coverage is binary (covered/not covered). Real audits need evidence, implementation status, maturity levels, responsible persons, and review dates.

**Requirements:**

- Enhance compliance coverage with:
  - `implementation_status`: `not_started`, `planned`, `in_progress`, `implemented`, `verified`
  - `evidence_links`: JSON array of document references, URLs, asset links
  - `responsible_person`: control owner
  - `review_date`: last reviewed timestamp
  - `maturity_level` (optional): `initial`, `managed`, `defined`, `measured`, `optimized` (CMMI-aligned)
  - `notes`: free text for auditor comments
- Coverage calculation engine: aggregate per framework, per requirement group, per audit scope
- Stale control detection: flag controls not reviewed in > 12 months
- Dashboard: compliance heatmap with filters by status, responsible person, review freshness, framework

```
REQ-4.4: The compliance module should support coverage, evidence, maturity, and control lifecycle views.
```

### 4.5 GRC Tool Integration (Architecture Decision)

**Document in `docs/architecture/ADR-grc-integration.md`:**

- At 5+ frameworks with 100+ requirements each, internal compliance tracking competes with dedicated GRC platforms
- Evaluate:
  1. **eramba (Community Edition)**: open-source GRC, REST API, controls/risks sync
  2. **CISO Assistant**: open-source, modern Python/Django, good API
  3. **Build deeper internally**: more control, significant effort
- Recommendation: Build core compliance tracking internally (Phase 4.1–4.4) for the 80% case. For organizations with 10+ frameworks, provide integration points (REST API, webhooks on control status change) and document how to connect eramba or CISO Assistant as system of record for compliance, with OpsWeave consuming control status via API sync.

```
REQ-4.5: Evaluate GRC tool integration for complex compliance scenarios.
```

---

## Phase 5: Architecture Evolution

### 5.1 Graph Database Evaluation

**Document in `docs/architecture/ADR-graph-db.md`:**

- **Current state**: relationships stored in PostgreSQL relational tables
- **Problem**: deep graph traversals (e.g., "show all assets transitively affected by this host failure", "compute inherited classification across 5 levels") become expensive with recursive CTEs at scale
- **Evaluation criteria**: traversal performance at 10k/50k/100k assets, historization support, mixed document/graph models, API integration, query complexity, operational overhead (Docker-first), license compatibility (AGPL)
- **Options**:
  1. Stay relational — PostgreSQL recursive CTEs + materialized views for common traversals
  2. PostgreSQL with Apache AGE extension (graph queries on relational storage)
  3. ArangoDB as secondary graph store (multi-model: document + graph + key-value)
  4. Neo4j as secondary graph store
  5. SurrealDB (multi-model, newer option)
- **Recommendation**: Start with PostgreSQL + materialized views. Add Apache AGE when graph query complexity exceeds what recursive CTEs handle cleanly. Avoid dual-DB sync complexity unless proven necessary by performance testing.

```
REQ-5.1: Evaluate graph database support for complex traversals and historization.
```

### 5.2 Performance Benchmarking

- Define benchmark scenarios:
  - Full dependency tree traversal (5+ levels deep) at 10k, 50k, 100k assets
  - Capacity aggregation across cluster hierarchy
  - Classification inheritance propagation
  - Historical state reconstruction at arbitrary point in time
  - Cross-framework coverage calculation with 5 frameworks × 500 requirements
- Run against PostgreSQL baseline, then against AGE/ArangoDB alternatives
- Document results in ADR

---

## Implementation Notes

### Database Migration Strategy

- All schema changes via Drizzle migrations, each phase gets its own migration batch
- Migrations must be reversible (down migrations)
- Seed data for: asset types, capacity types, classification models, common framework mappings, relationship types
- Test migrations against both PostgreSQL and SQLite

### API Design

- All new entities get full CRUD REST endpoints
- Follow existing patterns: Express router, Drizzle queries, tenant-scoped
- Pagination, filtering, sorting on all list endpoints
- OpenAPI spec updated for all new endpoints
- Webhook support for key events: asset classification changed, control status changed, audit finding created

### UI Patterns

- shadcn/ui components, responsive layouts, existing conventions
- Dynamic form renderer component that reads from schema registry
- Context-based view switcher (operations/security/compliance/architecture)
- i18n: every label, placeholder, error message in de + en

### Testing

- Vitest unit tests for all new services and utilities
- Playwright E2E tests for critical flows:
  - Create asset with type-specific schema
  - Assign asset to multiple tenants with inheritance
  - Classify asset across multiple models
  - View capacity utilization dashboard
  - Create SLA with RPO/RTO
  - Map controls across frameworks
  - Run compliance coverage report
  - Audit finding lifecycle
- Zero manual testing

### Phase Dependencies

```
Phase 1 (CMDB Foundation)
  ├── Phase 2 (Multi-Tenancy, Services) — depends on 1.1, 1.2
  ├── Phase 3 (Resource Graph) — depends on 1.1, 1.2
  │     └── needs 1.2 for type schemas, 1.1 for extended types
  ├── Phase 4 (Compliance 2.0) — depends on 1.5
  │     └── benefits from classification for control-asset linking
  └── Phase 5 (Architecture) — informed by all phases
        └── ADRs should be written BEFORE code in their respective phase
```

Phase 2 and Phase 3 can run in parallel. Phase 4 can run in parallel with 2 and 3. Phase 5 ADRs should be written early; implementation only if benchmarks justify it.

---

## Out of Scope (Future Phases)

- Automatic deployment routing / orchestration based on capacity graph
- Machine learning-based capacity prediction
- Full GRC platform build (risk register, policy lifecycle, vendor management)
- Nested project hierarchies
- Real-time monitoring integration (Check_MK → capacity graph data feed)
- Graph database migration — evaluate first, migrate only if benchmarks prove necessary
- Organization/team modeling as graph objects (can be done with abstract resources later)
- Automated vulnerability scanner integration (assets are ready, integration is future)

---

## Requirements Traceability

| REQ ID | Summary | Phase |
|---|---|---|
| REQ-1.1 | Extensible asset types via admin UI | 1 |
| REQ-1.2 | Type-specific attribute schemas | 1 |
| REQ-1.3 | Security assets as first-class entities | 1 |
| REQ-1.4 | Software asset lifecycle & licensing | 1 |
| REQ-1.5a | Configurable classification models | 1 |
| REQ-1.5b | Multiple concurrent classification dimensions | 1 |
| REQ-2.1 | Multi-tenant asset assignment | 2 |
| REQ-2.2a | Extended SLA model (RPO, RTO, service windows) | 2 |
| REQ-2.2b | Multi-dimensional service profiles | 2 |
| REQ-2.2c | Service scope & entitlement modeling | 2 |
| REQ-2.3 | Project structures within customers | 2 |
| REQ-3.1 | Typed capacity system (provides/requires) | 3 |
| REQ-3.2a | Edge metadata and capacity consumption | 3 |
| REQ-3.2b | Extensible relationship types | 3 |
| REQ-3.3a | Temporal validity on relations | 3 |
| REQ-3.3b | Historical state reconstruction | 3 |
| REQ-3.4a | Resource compatibility checks | 3 |
| REQ-3.4b | Planning and simulation on resource graph | 3 |
| REQ-3.5a | Dynamic forms from type/schema | 3 |
| REQ-3.5b | Context-based views (ops/security/compliance/architecture) | 3 |
| REQ-4.1 | Multi-framework cross-mapping | 4 |
| REQ-4.2 | Reusable controls abstraction | 4 |
| REQ-4.3 | Audit tracking with findings & remediation | 4 |
| REQ-4.4 | Granular coverage, evidence, maturity | 4 |
| REQ-4.5 | GRC tool integration evaluation | 4 |
| REQ-5.1 | Graph database evaluation | 5 |
