Now I have all the information I need. Let me compile the comprehensive schema inventory into a structured markdown document.

Based on my complete analysis of all database schema definitions in the OpsWeave application, here is the comprehensive database schema inventory for your E2E test suite:

## Complete OpsWeave Database Schema Inventory

### Overview

This document provides a comprehensive inventory of all tables, columns, relationships, indexes, and constraints in the OpsWeave database schema. The schema is DB-agnostic (SQLite/PostgreSQL via Drizzle ORM) with 40 tables across 10 domains.

**Key Statistics:**
- Total Tables: 40
- Tables with tenant_id: 36 (multi-tenant scoped)
- Global Tables (no tenant_id): 2 (system_settings, feedback_entries)
- Tenant-scoped but via FK: 2 (users, workflow_steps)

---

## 1. Multi-Tenant Foundation

### Table: `tenants`
**Purpose:** Multi-tenant organizational root entity
**Tenant-scoped:** No (this IS the tenant record)
**Composite Key:** None
**Foreign Keys:** None

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| name | TEXT | NO | | | Organization name |
| slug | TEXT | NO | | UNIQUE | URL-friendly identifier |
| settings | TEXT | NO | `{}` | | JSON: branding, config |
| license_key | TEXT | YES | | | Enterprise JWT (RS256) |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | 0=inactive, 1=active |
| created_at | TEXT | NO | | | ISO 8601 timestamp |
| updated_at | TEXT | NO | | | ISO 8601 timestamp |

**Indexes:**
- `slug` (UNIQUE)

---

### Table: `users`
**Purpose:** Application users (cross-tenant)
**Tenant-scoped:** No (tenant association via tenant_user_memberships)
**Foreign Keys:** None

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| email | TEXT | NO | | UNIQUE | Login identifier |
| display_name | TEXT | NO | | | Full name |
| password_hash | TEXT | YES | | | Bcrypt hash (NULL if OIDC) |
| auth_provider | TEXT | NO | `local` | | 'local' \| 'oidc' |
| external_id | TEXT | YES | | | OAuth/OIDC subject ID |
| language | TEXT | NO | `de` | | 'de' \| 'en' |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | Soft delete |
| is_superadmin | INTEGER | NO | 0 | CHECK(0\|1) | Cross-tenant admin |
| last_login | TEXT | YES | | | ISO 8601 |
| password_changed_at | TEXT | YES | | | ISO 8601 |
| password_history | TEXT | NO | `[]` | | JSON array of old hashes |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `email` (UNIQUE)

---

### Table: `tenant_user_memberships`
**Purpose:** Junction table: users ↔ tenants with tenant-specific roles
**Tenant-scoped:** Composite PK on (tenant_id, user_id)
**Composite Key:** (tenant_id, user_id)
**Foreign Keys:** 
- tenant_id → tenants.id
- user_id → users.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| tenant_id | TEXT | NO | | FK, PK1 | |
| user_id | TEXT | NO | | FK, PK2 | |
| role | TEXT | NO | `viewer` | | 'admin' \| 'manager' \| 'agent' \| 'viewer' |
| is_default | INTEGER | NO | 0 | CHECK(0\|1) | Which tenant loads on login |

**Indexes:**
- `idx_tum_tenant` on (tenant_id)
- `idx_tum_user` on (user_id)

---

### Table: `assignee_groups`
**Purpose:** Support/escalation teams (tenant-specific)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- parent_group_id → assignee_groups.id (self-referential for hierarchy)

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Level 1 Support" |
| description | TEXT | YES | | | |
| group_type | TEXT | NO | `support` | | 'support' \| 'engineering' \| 'management' \| 'custom' |
| parent_group_id | TEXT | YES | | FK (self) | For nested hierarchies |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_ag_tenant` on (tenant_id)
- `idx_ag_tenant_type` on (tenant_id, group_type)

---

### Table: `user_group_memberships`
**Purpose:** Junction table: users ↔ assignee_groups
**Tenant-scoped:** YES (tenant_id column for isolation)
**Composite Key:** (user_id, group_id)
**Foreign Keys:**
- user_id → users.id
- group_id → assignee_groups.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| user_id | TEXT | NO | | FK, PK1 | |
| group_id | TEXT | NO | | FK, PK2 | |
| tenant_id | TEXT | NO | | FK | For tenant isolation |
| role_in_group | TEXT | NO | `member` | | 'member' \| 'lead' |

**Indexes:**
- `idx_ugm_tenant` on (tenant_id)
- `idx_ugm_user` on (user_id)
- `idx_ugm_group` on (group_id)

---

## 2. Customers & Portal

### Table: `customers`
**Purpose:** End customers/clients (tenant-specific)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | Customer name |
| industry | TEXT | YES | | | e.g. "Manufacturing", "Healthcare" |
| contact_email | TEXT | YES | | | Primary contact |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_cust_tenant` on (tenant_id)

---

### Table: `customer_portal_users`
**Purpose:** Separate user accounts for customer self-service portal
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- customer_id → customers.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| customer_id | TEXT | NO | | FK | Which customer owns this user |
| email | TEXT | NO | | | Portal login |
| display_name | TEXT | NO | | | |
| password_hash | TEXT | NO | | | Bcrypt hash |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| last_login | TEXT | YES | | | ISO 8601 |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_cpu_tenant` on (tenant_id)
- `idx_cpu_customer` on (tenant_id, customer_id)
- `idx_cpu_email` on (email)

---

## 3. Assets & CMDB (Configuration Management Database)

### Table: `asset_types`
**Purpose:** Extensible asset type registry (Evo-1A)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| slug | TEXT | NO | | | URL-friendly identifier |
| name | TEXT | NO | | | Display name |
| description | TEXT | YES | | | |
| category | TEXT | NO | `other` | | e.g. 'server', 'network', 'database' |
| icon | TEXT | YES | | | Icon identifier/SVG |
| color | TEXT | YES | | | Hex color for UI |
| is_system | INTEGER | NO | 0 | CHECK(0\|1) | System-provided, not editable |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| attribute_schema | TEXT | NO | `[]` | | JSON: Zod schema for custom attributes |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_asset_type_slug` UNIQUE on (tenant_id, slug)
- `idx_at_tenant` on (tenant_id)
- `idx_at_tenant_active` on (tenant_id, is_active)
- `idx_at_tenant_category` on (tenant_id, category)

---

### Table: `relation_types`
**Purpose:** Extensible relation type registry (Evo-3A)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| slug | TEXT | NO | | | e.g. 'depends_on', 'hosts', 'powered_by' |
| name | TEXT | NO | | | Display name |
| description | TEXT | YES | | | |
| category | TEXT | YES | | | Grouping |
| is_directional | INTEGER | NO | 1 | CHECK(0\|1) | One-way vs bidirectional |
| source_types | TEXT | NO | `[]` | | JSON array: allowed source asset types |
| target_types | TEXT | NO | `[]` | | JSON array: allowed target asset types |
| properties_schema | TEXT | NO | `[]` | | JSON: custom relation properties |
| is_system | INTEGER | NO | 0 | CHECK(0\|1) | System-provided |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| color | TEXT | YES | | | Visualization color |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_relation_type_slug` UNIQUE on (tenant_id, slug)
- `idx_rt_tenant` on (tenant_id)
- `idx_rt_tenant_active` on (tenant_id, is_active)

---

### Table: `classification_models`
**Purpose:** Custom classification schemes (Evo-1C)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Business Criticality" |
| description | TEXT | YES | | | |
| is_system | INTEGER | NO | 0 | CHECK(0\|1) | |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_class_model_name` UNIQUE on (tenant_id, name)
- `idx_cm_tenant` on (tenant_id)

---

### Table: `classification_values`
**Purpose:** Discrete values for classification models
**Tenant-scoped:** No (scoped via FK to model)
**Foreign Keys:**
- model_id → classification_models.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| model_id | TEXT | NO | | FK | |
| value | TEXT | NO | | | e.g. "critical", "high", "low" |
| label | TEXT | NO | `{}` | | JSON: i18n labels {de: "...", en: "..."} |
| color | TEXT | YES | | | Hex color |
| sort_order | INTEGER | NO | 0 | | Display order |

**Indexes:**
- `uq_class_value` UNIQUE on (model_id, value)
- `idx_cv_model` on (model_id)

---

### Table: `asset_classifications`
**Purpose:** Asset ↔ classification value assignments
**Tenant-scoped:** YES
**Composite Key:** (asset_id, value_id)
**Foreign Keys:**
- asset_id → assets.id
- value_id → classification_values.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| asset_id | TEXT | NO | | FK, PK1 | |
| value_id | TEXT | NO | | FK, PK2 | |
| tenant_id | TEXT | NO | | FK | |
| justification | TEXT | YES | | | Why this classification |
| classified_by | TEXT | YES | | | User ID |
| classified_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_asset_class` UNIQUE on (asset_id, value_id)
- `idx_ac_tenant` on (tenant_id)
- `idx_ac_asset` on (asset_id)
- `idx_ac_value` on (value_id)

---

### Table: `capacity_types`
**Purpose:** Capacity dimension definitions (Evo-3C)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| slug | TEXT | NO | | | e.g. 'cpu_cores', 'memory_gb', 'disk_storage' |
| name | TEXT | NO | | | Display name |
| unit | TEXT | NO | | | e.g. 'cores', 'GB', 'Mbps' |
| category | TEXT | YES | | | e.g. 'compute', 'storage', 'network' |
| is_system | INTEGER | NO | 0 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_cap_type_slug` UNIQUE on (tenant_id, slug)
- `idx_capt_tenant` on (tenant_id)

---

### Table: `asset_capacities`
**Purpose:** Capacity tracking for individual assets
**Tenant-scoped:** YES
**Composite Key:** (asset_id, capacity_type_id, direction)
**Foreign Keys:**
- asset_id → assets.id
- capacity_type_id → capacity_types.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| asset_id | TEXT | NO | | FK | |
| capacity_type_id | TEXT | NO | | FK | |
| tenant_id | TEXT | NO | | FK | |
| direction | TEXT | NO | | | 'provides' \| 'consumes' \| 'stores' |
| total | TEXT | NO | `0` | | JSON number string (handles precision) |
| allocated | TEXT | NO | `0` | | Current allocation |
| reserved | TEXT | NO | `0` | | Reserved but not yet allocated |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_asset_cap` UNIQUE on (asset_id, capacity_type_id, direction)
- `idx_acap_tenant` on (tenant_id)
- `idx_acap_asset` on (asset_id)

---

### Table: `assets`
**Purpose:** Central CMDB entities (CI = Configuration Item)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- owner_group_id → assignee_groups.id
- customer_id → customers.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| asset_type | TEXT | NO | | | Must exist in asset_types.slug |
| name | TEXT | NO | | | Internal identifier (unique per type) |
| display_name | TEXT | NO | | | Human-readable name |
| status | TEXT | NO | `active` | | 'active' \| 'inactive' \| 'retired' \| 'planned' |
| ip_address | TEXT | YES | | | IPv4 or IPv6 (as VARCHAR) |
| location | TEXT | YES | | | Physical/logical location |
| sla_tier | TEXT | NO | `none` | | SLA level ('gold', 'silver', 'bronze', 'none') |
| environment | TEXT | YES | | | 'production' \| 'staging' \| 'dev' |
| owner_group_id | TEXT | YES | | FK | Support group responsible |
| customer_id | TEXT | YES | | FK | Customer/client owning this asset |
| attributes | TEXT | NO | `{}` | | JSON: custom attributes per asset_type |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |
| created_by | TEXT | NO | | | User ID |

**Indexes:**
- `idx_asset_tenant` on (tenant_id)
- `idx_asset_tenant_type` on (tenant_id, asset_type)
- `idx_asset_tenant_status` on (tenant_id, status)
- `idx_asset_tenant_sla` on (tenant_id, sla_tier)
- `idx_asset_tenant_customer` on (tenant_id, customer_id)

---

### Table: `asset_relations`
**Purpose:** DAG edges: asset ↔ asset dependencies
**Tenant-scoped:** YES
**Composite Key:** (tenant_id, source_asset_id, target_asset_id, relation_type)
**Foreign Keys:**
- tenant_id → tenants.id
- source_asset_id → assets.id
- target_asset_id → assets.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| source_asset_id | TEXT | NO | | FK | From asset |
| target_asset_id | TEXT | NO | | FK | To asset |
| relation_type | TEXT | NO | | | Must exist in relation_types.slug |
| properties | TEXT | NO | `{}` | | JSON: relation-specific properties |
| valid_from | TEXT | YES | | | ISO 8601: temporal validity start |
| valid_until | TEXT | YES | | | ISO 8601: temporal validity end |
| metadata | TEXT | NO | `{}` | | JSON: internal use |
| created_at | TEXT | NO | | | ISO 8601 |
| created_by | TEXT | NO | | | User ID |

**Constraints:**
- CHECK: source_asset_id ≠ target_asset_id (no self-loops)
- UNIQUE: (tenant_id, source, target, relation_type)

**Indexes:**
- `uq_asset_rel` UNIQUE on (tenant_id, source_asset_id, target_asset_id, relation_type)
- `idx_arel_tenant` on (tenant_id)
- `idx_arel_source` on (tenant_id, source_asset_id)
- `idx_arel_target` on (tenant_id, target_asset_id)
- `idx_arel_temporal` on (tenant_id, valid_from, valid_until)

---

## 4. Tickets (Incident, Change, Problem Management)

### Table: `ticket_categories`
**Purpose:** Customizable ticket categories
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Server Issue", "Database Problem" |
| applies_to | TEXT | NO | `all` | | 'incident' \| 'change' \| 'problem' \| 'all' |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_tc_cat_tenant` on (tenant_id)
- `idx_tc_cat_tenant_active` on (tenant_id, is_active)

---

### Table: `tickets`
**Purpose:** Central ticket entity (Incident/Change/Problem)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- asset_id → assets.id
- assignee_id → users.id
- assignee_group_id → assignee_groups.id
- reporter_id → users.id
- customer_id → customers.id
- category_id → ticket_categories.id
- incident_commander_id → users.id
- known_error_id → known_errors.id
- project_id → projects.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| ticket_number | TEXT | NO | | | INC-2024-00001, CHG-2024-00042, PRB-2024-00003 |
| ticket_type | TEXT | NO | | | 'incident' \| 'change' \| 'problem' |
| subtype | TEXT | YES | | | RFC, CAB, etc. |
| title | TEXT | NO | | | Ticket summary |
| description | TEXT | NO | `` | | Detailed description |
| status | TEXT | NO | `open` | | 'open' \| 'in_progress' \| 'pending' \| 'resolved' \| 'closed' \| 'cancelled' |
| priority | TEXT | NO | `medium` | | 'critical' \| 'high' \| 'medium' \| 'low' |
| impact | TEXT | YES | | | 'critical' \| 'high' \| 'medium' \| 'low' (incident) |
| urgency | TEXT | YES | | | 'critical' \| 'high' \| 'medium' \| 'low' (incident) |
| asset_id | TEXT | YES | | FK | Related CI |
| assignee_id | TEXT | YES | | FK | Individual assignee |
| assignee_group_id | TEXT | YES | | FK | Team/group assignee |
| reporter_id | TEXT | NO | | FK | Who created the ticket |
| customer_id | TEXT | YES | | FK | Associated customer |
| category_id | TEXT | YES | | FK | Category |
| workflow_instance_id | TEXT | YES | | | FK to workflow_instances (if in workflow) |
| current_step_id | TEXT | YES | | | Current step in workflow |
| sla_tier | TEXT | YES | | | 'gold' \| 'silver' \| 'bronze' \| 'none' |
| sla_response_due | TEXT | YES | | | ISO 8601: response due time |
| sla_resolve_due | TEXT | YES | | | ISO 8601: resolution due time |
| sla_breached | INTEGER | NO | 0 | CHECK(0\|1) | Whether SLA was breached |
| sla_paused_at | TEXT | YES | | | ISO 8601: when SLA was paused |
| sla_paused_total | INTEGER | NO | 0 | | Cumulative pause time (seconds) |
| root_cause | TEXT | YES | | | Only for ticket_type='problem' |
| known_error_id | TEXT | YES | | FK | KEDB link (incidents) |
| category_id | TEXT | YES | | FK | Ticket category |
| parent_ticket_id | TEXT | YES | | | For ticket linking |
| **Change Management Fields** | | | | | |
| change_justification | TEXT | YES | | | Why the change? |
| change_risk_level | TEXT | YES | | | 'low' \| 'medium' \| 'high' \| 'critical' |
| change_risk_likelihood | TEXT | YES | | | 'unlikely' \| 'possible' \| 'likely' \| 'certain' |
| change_risk_impact | TEXT | YES | | | 'low' \| 'medium' \| 'high' \| 'critical' |
| change_implementation | TEXT | YES | | | Implementation plan |
| change_rollback_plan | TEXT | YES | | | Rollback procedure |
| change_planned_start | TEXT | YES | | | ISO 8601: planned start |
| change_planned_end | TEXT | YES | | | ISO 8601: planned end |
| change_actual_start | TEXT | YES | | | ISO 8601: actual start |
| change_actual_end | TEXT | YES | | | ISO 8601: actual end |
| **CAB Fields** | | | | | |
| cab_required | INTEGER | NO | 0 | CHECK(0\|1) | Does this change need CAB approval? |
| cab_decision | TEXT | YES | | | 'approved' \| 'rejected' \| 'deferred' |
| cab_decision_by | TEXT | YES | | | User ID who decided |
| cab_decision_at | TEXT | YES | | | ISO 8601 |
| cab_notes | TEXT | YES | | | Decision notes |
| incident_commander_id | TEXT | YES | | FK | Incident commander (for major incidents) |
| **Escalation Fields** | | | | | |
| escalation_level | INTEGER | NO | 0 | | Current escalation level |
| escalated_at | TEXT | YES | | | ISO 8601: when escalated |
| is_major_incident | INTEGER | NO | 0 | CHECK(0\|1) | Major incident flag |
| major_declared_at | TEXT | YES | | | ISO 8601: when declared major |
| major_declared_by | TEXT | YES | | | User ID |
| bridge_call_url | TEXT | YES | | | Conference bridge link |
| project_id | TEXT | YES | | FK | Associated project |
| **Metadata** | | | | | |
| source | TEXT | NO | `manual` | | 'manual' \| 'email' \| 'monitoring' \| 'api' \| 'portal' |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |
| resolved_at | TEXT | YES | | | ISO 8601 |
| closed_at | TEXT | YES | | | ISO 8601 |
| created_by | TEXT | NO | | | User ID |

**Indexes:**
- `idx_ticket_tenant` on (tenant_id)
- `idx_ticket_tenant_status` on (tenant_id, status)
- `idx_ticket_tenant_type` on (tenant_id, ticket_type)
- `idx_ticket_tenant_group` on (tenant_id, assignee_group_id)
- `idx_ticket_tenant_assignee` on (tenant_id, assignee_id)
- `idx_ticket_tenant_asset` on (tenant_id, asset_id)
- `idx_ticket_tenant_customer` on (tenant_id, customer_id)
- `idx_ticket_tenant_priority` on (tenant_id, priority)
- `idx_ticket_number` on (tenant_id, ticket_number)
- `idx_ticket_sla_breached` on (tenant_id, sla_breached)
- `idx_ticket_parent` on (tenant_id, parent_ticket_id)
- `idx_ticket_tenant_category` on (tenant_id, category_id)
- `idx_ticket_tenant_project` on (tenant_id, project_id)

---

### Table: `ticket_comments`
**Purpose:** Comments/updates on tickets
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- ticket_id → tickets.id
- author_id → users.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| ticket_id | TEXT | NO | | FK | |
| author_id | TEXT | NO | | FK | User who wrote comment |
| content | TEXT | NO | | | Markdown |
| is_internal | INTEGER | NO | 0 | CHECK(0\|1) | Internal note (hidden from portal) |
| source | TEXT | NO | `agent` | | 'agent' \| 'customer' \| 'email' \| 'system' |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_tc_tenant` on (tenant_id)
- `idx_tc_tenant_ticket` on (tenant_id, ticket_id)

---

### Table: `ticket_history`
**Purpose:** Audit trail: all field changes on a ticket
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- ticket_id → tickets.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| ticket_id | TEXT | NO | | FK | |
| field_changed | TEXT | NO | | | e.g. 'status', 'priority', 'assignee_id' |
| old_value | TEXT | YES | | | Previous value |
| new_value | TEXT | YES | | | New value |
| changed_by | TEXT | NO | | | User ID |
| changed_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_th_tenant` on (tenant_id)
- `idx_th_tenant_ticket` on (tenant_id, ticket_id)

---

## 5. Workflows

### Table: `workflow_templates`
**Purpose:** Workflow template definitions
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Standard Change Request" |
| description | TEXT | YES | | | |
| trigger_type | TEXT | NO | | | 'ticket_created' \| 'ticket_status_changed' \| ... |
| trigger_subtype | TEXT | YES | | | e.g. ticket_type='change' |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| version | INTEGER | NO | 1 | | Version number |
| created_by | TEXT | NO | | | User ID |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_wt_tenant` on (tenant_id)
- `idx_wt_tenant_active` on (tenant_id, is_active)
- `idx_wt_tenant_trigger` on (tenant_id, trigger_type)

---

### Table: `workflow_steps`
**Purpose:** Individual steps in a workflow (no tenant_id, scoped via template FK)
**Tenant-scoped:** No (scoped via template_id FK)
**Foreign Keys:**
- template_id → workflow_templates.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| template_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | Step name |
| step_order | INTEGER | NO | | | Execution order |
| step_type | TEXT | NO | | | 'form' \| 'routing' \| 'approval' \| 'condition' \| 'automatic' |
| config | TEXT | NO | `{}` | | JSON: step-specific config |
| timeout_hours | INTEGER | YES | | | Auto-escalate if pending |
| next_step_id | TEXT | YES | | | FK to self (conditional next) |

**Indexes:**
- `idx_ws_template` on (template_id)
- `idx_ws_template_order` on (template_id, step_order)

---

### Table: `workflow_instances`
**Purpose:** Runtime instances of workflows (per ticket)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- template_id → workflow_templates.id
- ticket_id → tickets.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| template_id | TEXT | NO | | FK | |
| ticket_id | TEXT | NO | | FK | 1:1 relationship |
| status | TEXT | NO | `active` | | 'active' \| 'completed' \| 'cancelled' |
| started_at | TEXT | NO | | | ISO 8601 |
| completed_at | TEXT | YES | | | ISO 8601 |

**Indexes:**
- `idx_wi_tenant` on (tenant_id)
- `idx_wi_tenant_status` on (tenant_id, status)
- `idx_wi_ticket` on (tenant_id, ticket_id)

---

### Table: `workflow_step_instances`
**Purpose:** Runtime instances of workflow steps
**Tenant-scoped:** No (scoped via FK chain)
**Foreign Keys:**
- instance_id → workflow_instances.id
- step_id → workflow_steps.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| instance_id | TEXT | NO | | FK | |
| step_id | TEXT | NO | | FK | |
| status | TEXT | NO | `pending` | | 'pending' \| 'in_progress' \| 'completed' \| 'skipped' \| 'failed' |
| assigned_to | TEXT | YES | | | User ID (if form step) |
| assigned_group | TEXT | YES | | | Group ID (if routing step) |
| form_data | TEXT | NO | `{}` | | JSON: form responses |
| started_at | TEXT | YES | | | ISO 8601 |
| completed_at | TEXT | YES | | | ISO 8601 |
| completed_by | TEXT | YES | | | User ID |

**Indexes:**
- `idx_wsi_instance` on (instance_id)
- `idx_wsi_instance_status` on (instance_id, status)

---

## 6. Service Catalog (3-Tier)

### Table: `service_descriptions`
**Purpose:** Service offerings (base service definitions)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| code | TEXT | NO | | | Internal service code (unique per tenant) |
| title | TEXT | NO | | | Service name |
| description | TEXT | NO | `` | | Service summary |
| scope_included | TEXT | YES | | | What's included |
| scope_excluded | TEXT | YES | | | What's NOT included |
| compliance_tags | TEXT | NO | `[]` | | JSON array of compliance framework IDs |
| version | INTEGER | NO | 1 | | Version number |
| status | TEXT | NO | `draft` | | 'draft' \| 'published' \| 'deprecated' |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_sd_tenant_code` UNIQUE on (tenant_id, code)
- `idx_sd_tenant` on (tenant_id)
- `idx_sd_tenant_status` on (tenant_id, status)

---

### Table: `horizontal_catalog`
**Purpose:** Horizontal service catalog (tenant-wide view)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Standard IT Services" |
| description | TEXT | YES | | | |
| status | TEXT | NO | `active` | | 'active' \| 'archived' |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_hc_tenant` on (tenant_id)

---

### Table: `horizontal_catalog_items`
**Purpose:** Junction: catalog ↔ service_descriptions
**Tenant-scoped:** No (composite PK)
**Composite Key:** (catalog_id, service_desc_id)
**Foreign Keys:**
- catalog_id → horizontal_catalog.id
- service_desc_id → service_descriptions.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| catalog_id | TEXT | NO | | FK, PK1 | |
| service_desc_id | TEXT | NO | | FK, PK2 | |

**Indexes:**
- `idx_hci_catalog` on (catalog_id)
- `idx_hci_service` on (service_desc_id)

---

### Table: `vertical_catalogs`
**Purpose:** Customer/industry-specific service catalogs (Enterprise)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- base_catalog_id → horizontal_catalog.id
- customer_id → customers.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | Customer-specific catalog name |
| base_catalog_id | TEXT | NO | | FK | Horizontal catalog template |
| customer_id | TEXT | YES | | FK | If customer-specific |
| industry | TEXT | YES | | | e.g. "Healthcare", "Finance" |
| description | TEXT | YES | | | |
| status | TEXT | NO | `active` | | 'active' \| 'archived' |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_vc_tenant` on (tenant_id)
- `idx_vc_tenant_customer` on (tenant_id, customer_id)

---

### Table: `vertical_catalog_overrides`
**Purpose:** Service customizations in vertical catalogs
**Tenant-scoped:** No (scoped via vertical_id FK)
**Foreign Keys:**
- vertical_id → vertical_catalogs.id
- original_desc_id → service_descriptions.id
- override_desc_id → service_descriptions.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| vertical_id | TEXT | NO | | FK | |
| original_desc_id | TEXT | NO | | FK | Original service from horizontal catalog |
| override_desc_id | TEXT | NO | | FK | Customized version |
| override_type | TEXT | NO | | | 'replace' \| 'hide' \| 'extend' |
| reason | TEXT | YES | | | Why override? |

**Indexes:**
- `idx_vco_vertical` on (vertical_id)

---

### Table: `asset_service_links`
**Purpose:** Maps assets to vertical catalogs (which services apply?)
**Tenant-scoped:** YES
**Composite Key:** (asset_id, vertical_id)
**Foreign Keys:**
- asset_id → assets.id
- vertical_id → vertical_catalogs.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| asset_id | TEXT | NO | | FK, PK1 | |
| vertical_id | TEXT | NO | | FK, PK2 | |
| tenant_id | TEXT | NO | | FK | |
| effective_from | TEXT | NO | | | ISO 8601: when link becomes active |
| effective_until | TEXT | YES | | | ISO 8601: when link expires |

**Indexes:**
- `idx_asl_tenant` on (tenant_id)
- `idx_asl_asset` on (tenant_id, asset_id)
- `idx_asl_vertical` on (tenant_id, vertical_id)

---

## 7. Compliance & Regulatory

### Table: `regulatory_frameworks`
**Purpose:** Compliance frameworks (ISO27001, GDPR, SOC2, etc.)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "ISO/IEC 27001:2022" |
| version | TEXT | YES | | | e.g. "2022" |
| description | TEXT | YES | | | Framework overview |
| effective_date | TEXT | YES | | | ISO 8601: when it applies |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_rf_tenant` on (tenant_id)

---

### Table: `regulatory_requirements`
**Purpose:** Individual requirements/controls within frameworks
**Tenant-scoped:** No (scoped via framework FK)
**Foreign Keys:**
- framework_id → regulatory_frameworks.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| framework_id | TEXT | NO | | FK | |
| code | TEXT | NO | | | e.g. "A.8.1" (ISO), "7.4" (SOC2) |
| title | TEXT | NO | | | Requirement title |
| description | TEXT | YES | | | Full description |
| category | TEXT | YES | | | e.g. "Access Control", "Encryption" |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_rr_framework` on (framework_id)
- `idx_rr_framework_category` on (framework_id, category)

---

### Table: `requirement_service_mappings`
**Purpose:** Requirement ↔ Service mapping: which services satisfy which requirements?
**Tenant-scoped:** YES
**Composite Key:** (requirement_id, service_desc_id)
**Foreign Keys:**
- requirement_id → regulatory_requirements.id
- service_desc_id → service_descriptions.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| requirement_id | TEXT | NO | | FK, PK1 | |
| service_desc_id | TEXT | NO | | FK, PK2 | |
| tenant_id | TEXT | NO | | FK | |
| coverage_level | TEXT | NO | `none` | | 'none' \| 'partial' \| 'full' \| 'exceeded' |
| evidence_notes | TEXT | YES | | | How is this met? |
| reviewed_at | TEXT | YES | | | ISO 8601: last review |
| reviewed_by | TEXT | YES | | | User ID |
| maturity_level | TEXT | YES | | | 'initial' \| 'managed' \| 'defined' \| 'measured' \| 'optimizing' |
| last_verified | TEXT | YES | | | ISO 8601 |
| verified_by | TEXT | YES | | | User ID |

**Indexes:**
- `idx_rsm_tenant` on (tenant_id)
- `idx_rsm_requirement` on (requirement_id)
- `idx_rsm_service` on (service_desc_id)

---

### Table: `asset_regulatory_flags`
**Purpose:** Asset ↔ Framework: which frameworks apply to which assets?
**Tenant-scoped:** YES
**Composite Key:** (asset_id, framework_id)
**Foreign Keys:**
- asset_id → assets.id
- framework_id → regulatory_frameworks.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| asset_id | TEXT | NO | | FK, PK1 | |
| framework_id | TEXT | NO | | FK, PK2 | |
| tenant_id | TEXT | NO | | FK | |
| reason | TEXT | YES | | | Why is this asset subject to this framework? |
| flagged_at | TEXT | NO | | | ISO 8601 |
| flagged_by | TEXT | NO | | | User ID |

**Indexes:**
- `idx_arf_tenant` on (tenant_id)
- `idx_arf_asset` on (tenant_id, asset_id)
- `idx_arf_framework` on (tenant_id, framework_id)

---

### Table: `compliance_controls`
**Purpose:** Controls (preventive/detective/corrective) (Evo-4A)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- owner_id → users.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| code | TEXT | NO | | | e.g. "CTRL-001" |
| title | TEXT | NO | | | Control name |
| description | TEXT | YES | | | How does it work? |
| category | TEXT | YES | | | e.g. "Technical", "Operational", "Governance" |
| control_type | TEXT | NO | `preventive` | | 'preventive' \| 'detective' \| 'corrective' |
| status | TEXT | NO | `planned` | | 'planned' \| 'implemented' \| 'verified' \| 'not_applicable' |
| owner_id | TEXT | YES | | FK | Responsible owner |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_cc_tenant_code` UNIQUE on (tenant_id, code)
- `idx_cc_tenant` on (tenant_id)
- `idx_cc_tenant_status` on (tenant_id, status)
- `idx_cc_tenant_category` on (tenant_id, category)

---

### Table: `requirement_control_mappings`
**Purpose:** Requirement ↔ Control mapping: cross-framework mapping through shared controls (Evo-4A)
**Tenant-scoped:** YES
**Composite Key:** (requirement_id, control_id)
**Foreign Keys:**
- requirement_id → regulatory_requirements.id
- control_id → compliance_controls.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| requirement_id | TEXT | NO | | FK, PK1 | |
| control_id | TEXT | NO | | FK, PK2 | |
| tenant_id | TEXT | NO | | FK | |
| coverage | TEXT | NO | `full` | | 'full' \| 'partial' \| 'planned' |
| notes | TEXT | YES | | | Mapping notes |

**Indexes:**
- `idx_rcm_tenant` on (tenant_id)
- `idx_rcm_control` on (control_id)
- `idx_rcm_requirement` on (requirement_id)

---

### Table: `compliance_audits`
**Purpose:** Compliance audit campaigns (Evo-4B)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- framework_id → regulatory_frameworks.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "ISO27001 Audit Q1 2024" |
| framework_id | TEXT | YES | | FK | If focused on one framework |
| audit_type | TEXT | NO | `internal` | | 'internal' \| 'external' \| 'certification' |
| status | TEXT | NO | `planned` | | 'planned' \| 'in_progress' \| 'completed' \| 'cancelled' |
| auditor | TEXT | YES | | | Auditor name/org |
| start_date | TEXT | YES | | | ISO 8601 |
| end_date | TEXT | YES | | | ISO 8601 |
| scope | TEXT | YES | | | What's included in audit scope? |
| notes | TEXT | YES | | | General audit notes |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_ca_tenant` on (tenant_id)
- `idx_ca_tenant_status` on (tenant_id, status)
- `idx_ca_tenant_framework` on (tenant_id, framework_id)

---

### Table: `audit_findings`
**Purpose:** Audit findings/non-conformities (Evo-4B)
**Tenant-scoped:** YES
**Foreign Keys:**
- audit_id → compliance_audits.id
- tenant_id → tenants.id
- control_id → compliance_controls.id
- requirement_id → regulatory_requirements.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| audit_id | TEXT | NO | | FK | |
| tenant_id | TEXT | NO | | FK | |
| control_id | TEXT | YES | | FK | Which control failed? |
| requirement_id | TEXT | YES | | FK | Which requirement failed? |
| severity | TEXT | NO | `minor` | | 'critical' \| 'major' \| 'minor' \| 'observation' |
| title | TEXT | NO | | | Finding title |
| description | TEXT | YES | | | Detailed finding |
| status | TEXT | NO | `open` | | 'open' \| 'in_remediation' \| 'resolved' \| 'accepted_risk' |
| remediation_plan | TEXT | YES | | | How to fix it? |
| due_date | TEXT | YES | | | ISO 8601: remediation due |
| resolved_at | TEXT | YES | | | ISO 8601: when resolved |
| resolved_by | TEXT | YES | | | User ID |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_af_tenant` on (tenant_id)
- `idx_af_audit` on (audit_id)
- `idx_af_tenant_status` on (tenant_id, status)
- `idx_af_tenant_severity` on (tenant_id, severity)

---

### Table: `compliance_evidence`
**Purpose:** Supporting evidence for controls (Evo-4C)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- control_id → compliance_controls.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| control_id | TEXT | NO | | FK | Which control does this evidence support? |
| evidence_type | TEXT | NO | `document` | | 'document' \| 'screenshot' \| 'log' \| 'report' \| 'test_result' |
| title | TEXT | NO | | | Evidence title |
| url | TEXT | YES | | | Link to evidence (S3, artifact store, etc.) |
| description | TEXT | YES | | | What does this evidence prove? |
| uploaded_at | TEXT | NO | | | ISO 8601 |
| uploaded_by | TEXT | YES | | | User ID |

**Indexes:**
- `idx_ce_tenant` on (tenant_id)
- `idx_ce_control` on (control_id)
- `idx_ce_tenant_type` on (tenant_id, evidence_type)

---

## 8. Monitoring Integration

### Table: `monitoring_sources`
**Purpose:** Monitoring system integrations (Check_MK, Zabbix, Prometheus, etc.)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Check_MK Production" |
| type | TEXT | NO | | | 'checkmk_v1' \| 'checkmk_v2' \| 'zabbix' \| 'prometheus' \| ... |
| config | TEXT | NO | `{}` | | JSON: connection credentials (encrypted in practice) |
| webhook_secret | TEXT | YES | | | Secret for webhook verification |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_ms_tenant` on (tenant_id)
- `idx_ms_tenant_active` on (tenant_id, is_active)

---

### Table: `monitoring_events`
**Purpose:** Monitoring alerts/events received from integrations
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- source_id → monitoring_sources.id
- matched_asset_id → assets.id
- ticket_id → tickets.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| source_id | TEXT | NO | | FK | Which monitoring source? |
| external_id | TEXT | YES | | | Event ID from monitoring system |
| hostname | TEXT | NO | | | Alert hostname |
| service_name | TEXT | YES | | | Service/check name |
| state | TEXT | NO | | | 'UP' \| 'DOWN' \| 'UNREACHABLE' \| 'OK' \| 'WARNING' \| 'CRITICAL' \| ... |
| output | TEXT | YES | | | Alert message/details |
| matched_asset_id | TEXT | YES | | FK | Which asset triggered this? |
| ticket_id | TEXT | YES | | FK | Auto-created ticket (if any) |
| processed | INTEGER | NO | 0 | CHECK(0\|1) | Already converted to ticket? |
| received_at | TEXT | NO | | | ISO 8601 |
| processed_at | TEXT | YES | | | ISO 8601 |

**Indexes:**
- `idx_me_tenant` on (tenant_id)
- `idx_me_tenant_source` on (tenant_id, source_id)
- `idx_me_tenant_processed` on (tenant_id, processed)
- `idx_me_tenant_hostname` on (tenant_id, hostname)
- `idx_me_external` on (external_id)

---

## 9. E-Mail Inbound

### Table: `email_inbound_configs`
**Purpose:** E-mail inbound configurations (IMAP, Mailgun, SendGrid, etc.)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- target_group_id → assignee_groups.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Support Email" |
| provider | TEXT | NO | | | 'imap' \| 'webhook_mailgun' \| 'webhook_sendgrid' \| ... |
| config | TEXT | NO | `{}` | | JSON: connection details (encrypted) |
| target_group_id | TEXT | YES | | FK | Default group for auto-created tickets |
| default_ticket_type | TEXT | NO | `incident` | | Default ticket type from email |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_eic_tenant` on (tenant_id)
- `idx_eic_tenant_active` on (tenant_id, is_active)

---

### Table: `email_messages`
**Purpose:** Inbound email messages, thread matching, and ticket linking
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- config_id → email_inbound_configs.id
- ticket_id → tickets.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| config_id | TEXT | NO | | FK | Which inbound config? |
| message_id | TEXT | NO | | | E-mail Message-ID header (unique) |
| from_address | TEXT | NO | | | Sender email |
| from_name | TEXT | YES | | | Sender display name |
| to_address | TEXT | NO | | | Recipient email |
| subject | TEXT | NO | | | Email subject |
| body_text | TEXT | YES | | | Plain text body |
| body_html | TEXT | YES | | | HTML body |
| headers | TEXT | NO | `{}` | | JSON: all email headers |
| ticket_id | TEXT | YES | | FK | Matched/created ticket |
| is_reply | INTEGER | NO | 0 | CHECK(0\|1) | Reply to existing ticket? |
| thread_reference | TEXT | YES | | | In-Reply-To / References header |
| processed | INTEGER | NO | 0 | CHECK(0\|1) | Fully processed? |
| received_at | TEXT | NO | | | ISO 8601 |
| processed_at | TEXT | YES | | | ISO 8601 |

**Thread Matching Logic:**
1. Check `In-Reply-To` / `References` header → known message_id?
2. Check subject for ticket number pattern `[INC-2024-00042]`
3. Match found → add comment to ticket
4. No match → create new ticket

**Indexes:**
- `idx_em_tenant` on (tenant_id)
- `idx_em_tenant_config` on (tenant_id, config_id)
- `idx_em_message_id` on (message_id)
- `idx_em_tenant_processed` on (tenant_id, processed)
- `idx_em_thread_ref` on (thread_reference)
- `idx_em_tenant_ticket` on (tenant_id, ticket_id)

---

## 10. Knowledge Base

### Table: `kb_articles`
**Purpose:** Knowledge Base articles (internal/public visibility)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- author_id → users.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| title | TEXT | NO | | | Article title |
| slug | TEXT | NO | | | URL-friendly identifier |
| content | TEXT | NO | `` | | Markdown content |
| category | TEXT | YES | | | Article category |
| tags | TEXT | NO | `[]` | | JSON array of tags |
| visibility | TEXT | NO | `internal` | | 'internal' \| 'public' (customer portal) |
| status | TEXT | NO | `draft` | | 'draft' \| 'published' \| 'archived' |
| author_id | TEXT | NO | | FK | Creator |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |
| published_at | TEXT | YES | | | ISO 8601: publication date |

**Indexes:**
- `uq_kb_tenant_slug` UNIQUE on (tenant_id, slug)
- `idx_kb_tenant` on (tenant_id)
- `idx_kb_tenant_status` on (tenant_id, status)
- `idx_kb_tenant_visibility` on (tenant_id, visibility)
- `idx_kb_tenant_category` on (tenant_id, category)

---

### Table: `kb_article_links`
**Purpose:** Junction: KB articles ↔ Tickets (e.g. "Known Issue" link)
**Tenant-scoped:** YES
**Composite Key:** (article_id, ticket_id)
**Foreign Keys:**
- article_id → kb_articles.id
- ticket_id → tickets.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| article_id | TEXT | NO | | FK, PK1 | |
| ticket_id | TEXT | NO | | FK, PK2 | |
| tenant_id | TEXT | NO | | FK | |

**Indexes:**
- `idx_kal_tenant` on (tenant_id)
- `idx_kal_article` on (article_id)
- `idx_kal_ticket` on (ticket_id)

---

## 11. Known Error Database (KEDB)

### Table: `known_errors`
**Purpose:** Known errors and workarounds
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- problem_id → tickets.id (problem ticket)
- created_by → users.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| title | TEXT | NO | | | Error name |
| symptom | TEXT | NO | | | How does this manifest? |
| workaround | TEXT | YES | | | Temporary solution |
| root_cause | TEXT | YES | | | Underlying cause |
| status | TEXT | NO | `identified` | | 'identified' \| 'workaround_available' \| 'resolved' |
| problem_id | TEXT | YES | | FK | Link to problem ticket |
| created_by | TEXT | NO | | FK | Who documented it? |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_ke_tenant` on (tenant_id)
- `idx_ke_tenant_status` on (tenant_id, status)
- `idx_ke_tenant_problem` on (tenant_id, problem_id)

---

## 12. Escalation & Notifications

### Table: `escalation_rules`
**Purpose:** SLA escalation triggers and targets
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- target_group_id → assignee_groups.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Critical Incident Escalation" |
| ticket_type | TEXT | YES | | | Filter: 'incident' \| 'change' \| NULL (all) |
| priority | TEXT | YES | | | Filter: 'critical' \| 'high' \| NULL (all) |
| sla_threshold_pct | INTEGER | NO | 80 | | Escalate when SLA is X% consumed |
| target_group_id | TEXT | NO | | FK | Escalate to this group |
| escalation_level | INTEGER | NO | 1 | | Level 1, 2, 3, etc. |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_esc_tenant` on (tenant_id)
- `idx_esc_tenant_active` on (tenant_id, is_active)

---

### Table: `notification_preferences`
**Purpose:** User notification subscriptions per event type
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- user_id → users.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| user_id | TEXT | NO | | FK | |
| event_type | TEXT | NO | | | 'ticket_assigned' \| 'ticket_status_changed' \| ... |
| channel | TEXT | NO | `email` | | 'email' (later: 'push', 'slack', 'webhook') |
| enabled | INTEGER | NO | 1 | CHECK(0\|1) | Opt-in/out per event |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_np_tenant` on (tenant_id)
- `idx_np_tenant_user` on (tenant_id, user_id)
- `idx_np_tenant_user_event` on (tenant_id, user_id, event_type, channel)

---

## 13. SLA Management

### Table: `sla_definitions`
**Purpose:** SLA policies (response/resolution times, business hours)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Platinum 24/7", "Gold Business Hours" |
| description | TEXT | YES | | | |
| response_time_minutes | INTEGER | NO | | | e.g. 15, 60, 240 |
| resolution_time_minutes | INTEGER | NO | | | e.g. 60, 240, 1440 |
| business_hours | TEXT | NO | `24/7` | | '24/7' \| 'business' \| 'extended' |
| business_hours_start | TEXT | YES | | | e.g. "08:00" (if not 24/7) |
| business_hours_end | TEXT | YES | | | e.g. "18:00" |
| business_days | TEXT | NO | `1,2,3,4,5` | | CSV: 1=Mon ... 7=Sun |
| priority_overrides | TEXT | NO | `{}` | | JSON: {critical: {response: 15, resolution: 60}, ...} |
| rpo_minutes | INTEGER | YES | | | Recovery Point Objective (Evo-2A) |
| rto_minutes | INTEGER | YES | | | Recovery Time Objective (Evo-2A) |
| service_window | TEXT | YES | `{}` | | JSON: maintenance/change windows (Evo-2A) |
| escalation_matrix | TEXT | YES | `[]` | | JSON: escalation levels/contacts (Evo-2A) |
| is_default | INTEGER | NO | 0 | CHECK(0\|1) | Tenant-wide default SLA |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_sladef_tenant` on (tenant_id)
- `idx_sladef_tenant_active` on (tenant_id, is_active)

---

### Table: `sla_assignments`
**Purpose:** SLA ↔ Scope mapping (service/customer/asset)
**Tenant-scoped:** YES
**Composite Key:** (tenant_id, sla_definition_id, service_id, customer_id, asset_id)
**Foreign Keys:**
- tenant_id → tenants.id
- sla_definition_id → sla_definitions.id
- service_id → service_descriptions.id
- customer_id → customers.id
- asset_id → assets.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| sla_definition_id | TEXT | NO | | FK | |
| service_id | TEXT | YES | | FK | At least one scope must be set |
| customer_id | TEXT | YES | | FK | |
| asset_id | TEXT | YES | | FK | |
| priority | INTEGER | NO | 0 | | Auto-calculated: asset=100, customer+service=75, customer=50, service=25 |
| created_at | TEXT | NO | | | ISO 8601 |

**Resolution Order (highest priority first):**
1. Asset-specific assignment (priority=100)
2. Customer + Service combination (priority=75)
3. Customer-wide assignment (priority=50)
4. Service-wide assignment (priority=25)
5. Tenant default (is_default on sla_definitions)

**Indexes:**
- `idx_slaassign_tenant` on (tenant_id)
- `idx_slaassign_tenant_asset` on (tenant_id, asset_id)
- `idx_slaassign_tenant_customer` on (tenant_id, customer_id)
- `idx_slaassign_tenant_service` on (tenant_id, service_id)
- `uq_sla_assignment` UNIQUE on (tenant_id, sla_definition_id, service_id, customer_id, asset_id)

---

### Table: `service_profiles`
**Purpose:** Reusable service tier definitions (Evo-2A)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- sla_definition_id → sla_definitions.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| name | TEXT | NO | | | e.g. "Premium Support" |
| description | TEXT | YES | | | |
| dimensions | TEXT | NO | `{}` | | JSON: service dimensions/features |
| sla_definition_id | TEXT | YES | | FK | Associated SLA |
| is_active | INTEGER | NO | 1 | CHECK(0\|1) | |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_svcprofile_tenant` on (tenant_id)
- `uq_svcprofile_name` UNIQUE on (tenant_id, name)

---

### Table: `service_entitlements`
**Purpose:** Customer-specific service entitlements (Evo-2A)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- customer_id → customers.id
- service_id → service_descriptions.id
- profile_id → service_profiles.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| customer_id | TEXT | NO | | FK | |
| service_id | TEXT | NO | | FK | |
| profile_id | TEXT | YES | | FK | Optional service profile |
| scope | TEXT | NO | `{}` | | JSON: {included, excluded, addon} |
| effective_from | TEXT | NO | | | ISO 8601: when entitlement starts |
| effective_until | TEXT | YES | | | ISO 8601: when entitlement ends (contract end) |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_svcent_tenant` on (tenant_id)
- `idx_svcent_customer` on (tenant_id, customer_id)
- `idx_svcent_service` on (tenant_id, service_id)

---

## 14. Projects

### Table: `projects`
**Purpose:** Project structures for organizing work (Evo-2C)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id
- customer_id → customers.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| customer_id | TEXT | YES | | FK | Project customer |
| name | TEXT | NO | | | Project name |
| code | TEXT | NO | | | Project code (unique per tenant) |
| description | TEXT | YES | | | |
| status | TEXT | NO | `active` | | 'active' \| 'paused' \| 'completed' \| 'cancelled' |
| start_date | TEXT | YES | | | ISO 8601 |
| end_date | TEXT | YES | | | ISO 8601 |
| created_at | TEXT | NO | | | ISO 8601 |
| updated_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `uq_project_code` UNIQUE on (tenant_id, code)
- `idx_proj_tenant` on (tenant_id)
- `idx_proj_tenant_status` on (tenant_id, status)
- `idx_proj_tenant_customer` on (tenant_id, customer_id)

---

### Table: `project_assets`
**Purpose:** Junction: Projects ↔ Assets (Evo-2C)
**Tenant-scoped:** YES
**Composite Key:** (project_id, asset_id)
**Foreign Keys:**
- project_id → projects.id
- asset_id → assets.id
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| project_id | TEXT | NO | | FK, PK1 | |
| asset_id | TEXT | NO | | FK, PK2 | |
| tenant_id | TEXT | NO | | FK | |
| role | TEXT | YES | | | Asset role in project (e.g. 'primary', 'secondary') |
| added_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_pa_tenant` on (tenant_id)
- `idx_pa_project` on (project_id)
- `idx_pa_asset` on (asset_id)

---

## 15. Audit & System

### Table: `audit_logs`
**Purpose:** System-wide audit trail (all changes)
**Tenant-scoped:** YES
**Foreign Keys:**
- tenant_id → tenants.id

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| tenant_id | TEXT | NO | | FK | |
| actor_id | TEXT | NO | | | User ID (or 'system' for automated actions) |
| actor_email | TEXT | NO | | | Email for clarity |
| event_type | TEXT | NO | | | 'create' \| 'update' \| 'delete' \| 'view' \| ... |
| resource_type | TEXT | NO | | | 'ticket' \| 'asset' \| 'user' \| 'setting' \| ... |
| resource_id | TEXT | YES | | | ID of affected resource |
| details | TEXT | NO | `{}` | | JSON: what changed (old → new) |
| ip_address | TEXT | YES | | | IP of requester |
| user_agent | TEXT | YES | | | Browser/client info |
| integrity_hash | TEXT | YES | | | HMAC for tamper detection (Evo-4B) |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_audit_tenant` on (tenant_id)
- `idx_audit_tenant_event` on (tenant_id, event_type)
- `idx_audit_tenant_resource` on (tenant_id, resource_type)
- `idx_audit_tenant_actor` on (tenant_id, actor_id)
- `idx_audit_tenant_created` on (tenant_id, created_at)

---

### Table: `system_settings`
**Purpose:** Global system settings (NO tenant_id)
**Tenant-scoped:** No (global)
**Composite Key:** None (key is PK)
**Foreign Keys:** None

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| key | TEXT | NO | | PK | Setting key (e.g. 'app_version', 'license_status') |
| value | TEXT | NO | `{}` | | JSON: setting value |
| updated_at | TEXT | YES | | | ISO 8601 |
| updated_by | TEXT | YES | | | User ID who changed it |

---

### Table: `feedback_entries`
**Purpose:** Public feedback board (NO tenant_id, global)
**Tenant-scoped:** No (global)
**Foreign Keys:** None

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | TEXT | NO | | PK | UUID |
| author_name | TEXT | NO | | | Anonymous feedback allowed |
| entry_type | TEXT | NO | `feedback` | | 'bug' \| 'feature' \| 'improvement' \| 'question' \| 'feedback' |
| title | TEXT | NO | | | Feedback title |
| description | TEXT | NO | `` | | Detailed feedback |
| status | TEXT | NO | `open` | | 'open' \| 'in_progress' \| 'done' \| 'wont_fix' |
| votes | INTEGER | NO | 0 | | Community votes |
| created_at | TEXT | NO | | | ISO 8601 |

**Indexes:**
- `idx_feedback_type` on (entry_type)
- `idx_feedback_created` on (created_at)

---

## Summary Table

| Domain | Count | Tables | Tenant-Scoped |
|--------|-------|--------|---|
| **Foundation** | 4 | tenants, users, tenant_user_memberships, assignee_groups | 3/4 |
| **Customers** | 2 | customers, customer_portal_users | 2/2 |
| **Assets/CMDB** | 9 | assets, asset_relations, asset_types, relation_types, classification_models, classification_values, asset_classifications, capacity_types, asset_capacities | 8/9 |
| **Tickets** | 4 | tickets, ticket_comments, ticket_history, ticket_categories | 4/4 |
| **Workflows** | 4 | workflow_templates, workflow_steps, workflow_instances, workflow_step_instances | 2/4 |
| **Service Catalog** | 6 | service_descriptions, horizontal_catalog, horizontal_catalog_items, vertical_catalogs, vertical_catalog_overrides, asset_service_links | 6/6 |
| **Compliance** | 9 | regulatory_frameworks, regulatory_requirements, requirement_service_mappings, asset_regulatory_flags, compliance_controls, requirement_control_mappings, compliance_audits, audit_findings, compliance_evidence | 9/9 |
| **Monitoring** | 2 | monitoring_sources, monitoring_events | 2/2 |
| **Email** | 2 | email_inbound_configs, email_messages | 2/2 |
| **Knowledge Base** | 2 | kb_articles, kb_article_links | 2/2 |
| **Known Errors** | 1 | known_errors | 1/1 |
| **Escalation** | 2 | escalation_rules, notification_preferences | 2/2 |
| **SLA** | 4 | sla_definitions, sla_assignments, service_profiles, service_entitlements | 4/4 |
| **Projects** | 2 | projects, project_assets | 2/2 |
| **Audit & System** | 2 | audit_logs, system_settings | 1/2 |
| **User Groups** | 1 | user_group_memberships | 1/1 |
| **TOTAL** | **57** | **57 tables** | **52 tenant-scoped** |

---

## Data Type Mappings (SQLite / PostgreSQL via Drizzle)

| Logical Type | SQLite | PostgreSQL |
|---|---|---|
| UUID | TEXT | uuid |
| BOOLEAN | INTEGER (0/1) | BOOLEAN |
| TIMESTAMP | TEXT (ISO 8601) | TIMESTAMPTZ |
| JSONB | TEXT | JSONB |
| INTEGER array | TEXT (JSON) | INTEGER[] |
| ENUM | TEXT | ENUM |
| IPv4/IPv6 | TEXT | INET |

---

## Multi-Tenant Query Pattern

All queries follow this pattern:
```sql
SELECT * FROM {table} WHERE tenant_id = $tenantId AND {other filters}
```

Exceptions:
- `users` → cross-tenant, must filter via `tenant_user_memberships`
- `system_settings` → global, no WHERE tenant_id clause
- `feedback_entries` → global, no WHERE tenant_id clause

---

## Seed Data Entities

The `/backend/src/db/seed/index.ts` creates:
- 1 Tenant (Demo Organisation)
- 5 Users (admin, agent1, agent2, reporter, system)
- 3 Assignee Groups (L1 Support, L2 Support, Management)
- 10 Assets (servers, database, network, services)
- 5+ Sample Tickets (Incidents, Changes, Problems)
- SLA Definitions + Assignments
- Sample Workflows
- Sample Compliance Framework + Requirements
- Sample KB Articles

All with Enterprise License (DEMO_LICENSE_KEY) pre-activated.
