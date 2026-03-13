# OpsWeave Database Schema Inventory

**Last Updated:** March 2026  
**Database System:** SQLite (single-container) / PostgreSQL 16 (multi-container) with Drizzle ORM abstraction  
**Multi-Tenancy:** All entity tables include `tenant_id` column except noted system tables

---

## 1. Multi-Tenant Foundation (System-Level)

### tenants
- **Tenant-Scoped:** No (base table for tenant isolation)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `name` (TEXT, NOT NULL) — Tenant organization name
  - `slug` (TEXT, NOT NULL, UNIQUE) — URL-safe identifier
  - `settings` (TEXT, NOT NULL, DEFAULT '{}') — Tenant-specific JSON config
  - `license_key` (TEXT) — Enterprise JWT license key
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1) — 0/1 boolean
  - `created_at` (TEXT, NOT NULL) — ISO 8601
  - `updated_at` (TEXT, NOT NULL) — ISO 8601
- **Constraints:** PRIMARY KEY (id), UNIQUE (slug)
- **Indexes:** None (base table)

---

## 2. Users & Authentication

### users
- **Tenant-Scoped:** No (user-to-tenant via `tenant_user_memberships`)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `email` (TEXT, NOT NULL, UNIQUE)
  - `display_name` (TEXT, NOT NULL)
  - `password_hash` (TEXT) — NULL if OIDC auth
  - `auth_provider` (TEXT, NOT NULL, DEFAULT 'local') — 'local' | 'oidc'
  - `external_id` (TEXT) — OIDC provider ID
  - `language` (TEXT, NOT NULL, DEFAULT 'de') — i18n locale
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `is_superadmin` (INTEGER, NOT NULL, DEFAULT 0) — Cross-tenant admin
  - `last_login` (TEXT) — ISO 8601
  - `password_changed_at` (TEXT) — ISO 8601, for password expiry
  - `password_history` (TEXT, NOT NULL, DEFAULT '[]') — JSON array of old hashes
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), UNIQUE (email)
- **Indexes:** None explicitly defined in schema

### tenant_user_memberships
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `user_id` (TEXT, NOT NULL, FK → users.id)
  - `role` (TEXT, NOT NULL, DEFAULT 'viewer') — 'admin'|'manager'|'agent'|'viewer'
  - `is_default` (INTEGER, NOT NULL, DEFAULT 0) — Which tenant is default on login
- **Constraints:** PRIMARY KEY (tenant_id, user_id), FK (tenant_id), FK (user_id)
- **Indexes:**
  - `idx_tum_tenant` ON (tenant_id)
  - `idx_tum_user` ON (user_id)
- **Notes:** One user can belong to multiple tenants with different roles

### assignee_groups
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Group display name
  - `description` (TEXT) — Group description
  - `group_type` (TEXT, NOT NULL, DEFAULT 'support') — 'support'|'sla'|'escalation'|...
  - `parent_group_id` (TEXT) — Hierarchical grouping (no FK constraint)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_ag_tenant` ON (tenant_id)
  - `idx_ag_tenant_type` ON (tenant_id, group_type)

### user_group_memberships
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `user_id` (TEXT, NOT NULL, FK → users.id)
  - `group_id` (TEXT, NOT NULL, FK → assignee_groups.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `role_in_group` (TEXT, NOT NULL, DEFAULT 'member') — 'member'|'lead'
- **Constraints:** PRIMARY KEY (user_id, group_id), FK (user_id), FK (group_id), FK (tenant_id)
- **Indexes:**
  - `idx_ugm_tenant` ON (tenant_id)
  - `idx_ugm_user` ON (user_id)
  - `idx_ugm_group` ON (group_id)

---

## 3. Customers & Portal

### customers
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Customer organization name
  - `industry` (TEXT) — Customer industry vertical
  - `contact_email` (TEXT) — Primary contact
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_cust_tenant` ON (tenant_id)

### customer_portal_users
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `customer_id` (TEXT, NOT NULL, FK → customers.id)
  - `email` (TEXT, NOT NULL) — Portal login email
  - `display_name` (TEXT, NOT NULL)
  - `password_hash` (TEXT, NOT NULL)
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `last_login` (TEXT) — ISO 8601
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (customer_id)
- **Indexes:**
  - `idx_cpu_tenant` ON (tenant_id)
  - `idx_cpu_customer` ON (tenant_id, customer_id)
  - `idx_cpu_email` ON (email) — Global lookup for login
- **Notes:** Separate user table from internal `users`; portal users see only their customer's tickets

---

## 4. Assets & CMDB (Core)

### assets
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `asset_type` (TEXT, NOT NULL) — Extensible type (server, database, app, etc.)
  - `name` (TEXT, NOT NULL) — Unique identifier (hostname, system name)
  - `display_name` (TEXT, NOT NULL) — Human-readable name
  - `status` (TEXT, NOT NULL, DEFAULT 'active') — 'active'|'retired'|'decommissioned'
  - `ip_address` (TEXT) — IPv4/IPv6 as VARCHAR(45)
  - `location` (TEXT) — Physical or logical location
  - `sla_tier` (TEXT, NOT NULL, DEFAULT 'none') — 'none'|'gold'|'silver'|'bronze'|... (inherited)
  - `environment` (TEXT) — 'prod'|'staging'|'dev'|'test'
  - `owner_group_id` (TEXT, FK → assignee_groups.id) — Owning team
  - `customer_id` (TEXT, FK → customers.id) — Customer asset belongs to
  - `attributes` (TEXT, NOT NULL, DEFAULT '{}') — JSON: extensible attributes per asset_type
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
  - `created_by` (TEXT, NOT NULL) — User who created asset
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (owner_group_id), FK (customer_id)
- **Indexes:**
  - `idx_asset_tenant` ON (tenant_id)
  - `idx_asset_tenant_type` ON (tenant_id, asset_type)
  - `idx_asset_tenant_status` ON (tenant_id, status)
  - `idx_asset_tenant_sla` ON (tenant_id, sla_tier)
  - `idx_asset_tenant_customer` ON (tenant_id, customer_id)

### asset_types
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `slug` (TEXT, NOT NULL) — System name (e.g., 'server', 'database')
  - `name` (TEXT, NOT NULL) — Display name
  - `description` (TEXT)
  - `category` (TEXT, NOT NULL, DEFAULT 'other') — Grouping
  - `icon` (TEXT) — Icon identifier
  - `color` (TEXT) — UI color
  - `is_system` (INTEGER, NOT NULL, DEFAULT 0) — Built-in vs custom
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `attribute_schema` (TEXT, NOT NULL, DEFAULT '[]') — JSON: Zod schema for custom attributes
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, slug)
- **Indexes:**
  - `idx_at_tenant` ON (tenant_id)
  - `idx_at_tenant_active` ON (tenant_id, is_active)
  - `idx_at_tenant_category` ON (tenant_id, category)

### asset_relations
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `source_asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `target_asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `relation_type` (TEXT, NOT NULL) — Extensible (runs_on, hosts, depends_on, etc.)
  - `properties` (TEXT, NOT NULL, DEFAULT '{}') — JSON: relation-specific data
  - `valid_from` (TEXT) — Temporal validity start
  - `valid_until` (TEXT) — Temporal validity end
  - `metadata` (TEXT, NOT NULL, DEFAULT '{}') — Additional JSON
  - `created_at` (TEXT, NOT NULL)
  - `created_by` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (source_asset_id), FK (target_asset_id), UNIQUE (tenant_id, source_asset_id, target_asset_id, relation_type)
- **Indexes:**
  - `idx_arel_tenant` ON (tenant_id)
  - `idx_arel_source` ON (tenant_id, source_asset_id)
  - `idx_arel_target` ON (tenant_id, target_asset_id)
  - `idx_arel_temporal` ON (tenant_id, valid_from, valid_until)
- **Notes:** DAG (Directed Acyclic Graph) with cycle detection; implies cycles are checked in application layer

### relation_types
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `slug` (TEXT, NOT NULL) — Unique identifier (e.g., 'runs_on')
  - `name` (TEXT, NOT NULL) — Display name
  - `description` (TEXT)
  - `category` (TEXT) — Grouping
  - `is_directional` (INTEGER, NOT NULL, DEFAULT 1) — 0=bidirectional, 1=directional
  - `source_types` (TEXT, NOT NULL, DEFAULT '[]') — JSON array of allowed source asset types
  - `target_types` (TEXT, NOT NULL, DEFAULT '[]') — JSON array of allowed target asset types
  - `properties_schema` (TEXT, NOT NULL, DEFAULT '[]') — JSON Zod schema for relation properties
  - `is_system` (INTEGER, NOT NULL, DEFAULT 0) — Built-in vs custom
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `color` (TEXT) — UI color
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, slug)
- **Indexes:**
  - `idx_rt_tenant` ON (tenant_id)
  - `idx_rt_tenant_active` ON (tenant_id, is_active)

### asset_classifications (Evo-1C)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `value_id` (TEXT, NOT NULL, FK → classification_values.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `justification` (TEXT) — Why this asset is in this classification
  - `classified_by` (TEXT) — User who classified
  - `classified_at` (TEXT, NOT NULL) — ISO 8601
- **Constraints:** PRIMARY KEY composite on (asset_id, value_id), UNIQUE (asset_id, value_id), FK (asset_id), FK (value_id), FK (tenant_id)
- **Indexes:**
  - `idx_ac_tenant` ON (tenant_id)
  - `idx_ac_asset` ON (asset_id)
  - `idx_ac_value` ON (value_id)

### classification_models
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Classification dimension (e.g., "Criticality")
  - `description` (TEXT)
  - `is_system` (INTEGER, NOT NULL, DEFAULT 0) — Built-in vs custom
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, name)
- **Indexes:**
  - `idx_cm_tenant` ON (tenant_id)

### classification_values
- **Tenant-Scoped:** No (scoped via classification_models → tenant)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `model_id` (TEXT, NOT NULL, FK → classification_models.id)
  - `value` (TEXT, NOT NULL) — Machine name (e.g., "critical")
  - `label` (TEXT, NOT NULL, DEFAULT '{}') — JSON: i18n labels (de, en)
  - `color` (TEXT) — UI color
  - `sort_order` (INTEGER, NOT NULL, DEFAULT 0)
- **Constraints:** PRIMARY KEY (id), FK (model_id), UNIQUE (model_id, value)
- **Indexes:**
  - `idx_cv_model` ON (model_id)

### asset_capacities (Evo-3C)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `capacity_type_id` (TEXT, NOT NULL, FK → capacity_types.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `direction` (TEXT, NOT NULL, DEFAULT 'provides') — 'provides'|'consumes'
  - `total` (REAL, NOT NULL, DEFAULT 0) — Total capacity units
  - `allocated` (REAL, NOT NULL, DEFAULT 0) — Allocated/used units
  - `reserved` (REAL, NOT NULL, DEFAULT 0) — Reserved units
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (asset_id), FK (capacity_type_id), FK (tenant_id), UNIQUE (asset_id, capacity_type_id, direction)
- **Indexes:**
  - `idx_acap_tenant` ON (tenant_id)
  - `idx_acap_asset` ON (asset_id)

### capacity_types
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `slug` (TEXT, NOT NULL) — e.g., "cpu_cores", "memory_gb"
  - `name` (TEXT, NOT NULL) — Display name
  - `unit` (TEXT, NOT NULL) — e.g., "cores", "GB", "concurrent_users"
  - `category` (TEXT) — Grouping
  - `is_system` (INTEGER, NOT NULL, DEFAULT 0)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, slug)
- **Indexes:**
  - `idx_capt_tenant` ON (tenant_id)

### asset_tenant_assignments (REQ-2.1)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `assignment_type` (TEXT, NOT NULL, DEFAULT 'dedicated') — 'dedicated'|'shared'|'inherited'
  - `inherited_from_asset_id` (TEXT, FK → assets.id) — Parent asset if inherited
  - `notes` (TEXT)
  - `created_at` (TEXT, NOT NULL)
  - `created_by` (TEXT)
- **Constraints:** PRIMARY KEY (id), FK (asset_id), FK (tenant_id), UNIQUE (asset_id, tenant_id)
- **Indexes:**
  - `idx_ata_tenant` ON (tenant_id)
  - `idx_ata_asset` ON (asset_id)
- **Notes:** Allows multi-tenant asset sharing (shared CMDB scenario)

### asset_relation_history (REQ-3.3b)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `relation_id` (TEXT, NOT NULL, FK → asset_relations.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `action` (TEXT, NOT NULL) — 'created'|'modified'|'deleted'
  - `changed_by` (TEXT) — User who made the change
  - `changed_at` (TEXT, NOT NULL) — ISO 8601
  - `old_values` (TEXT) — JSON snapshot before change
  - `new_values` (TEXT) — JSON snapshot after change
- **Constraints:** PRIMARY KEY (id), FK (relation_id), FK (tenant_id)
- **Indexes:**
  - `idx_arh_relation` ON (relation_id)
  - `idx_arh_tenant_changed` ON (tenant_id, changed_at)

### asset_capacity_history (REQ-3.3b)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `capacity_type_id` (TEXT, NOT NULL) — No FK (just reference)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `old_total` (INTEGER)
  - `old_allocated` (INTEGER)
  - `new_total` (INTEGER)
  - `new_allocated` (INTEGER)
  - `changed_by` (TEXT)
  - `changed_at` (TEXT, NOT NULL) — ISO 8601
  - `reason` (TEXT) — Why capacity changed
- **Constraints:** PRIMARY KEY (id), FK (asset_id), FK (tenant_id)
- **Indexes:**
  - `idx_ach_asset_type` ON (asset_id, capacity_type_id)
  - `idx_ach_tenant_changed` ON (tenant_id, changed_at)

---

## 5. Tickets (Incident/Change/Problem Management)

### ticket_categories
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Category name (e.g., "Network", "Database")
  - `applies_to` (TEXT, NOT NULL, DEFAULT 'all') — 'incident'|'change'|'problem'|'all'
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_tc_cat_tenant` ON (tenant_id)
  - `idx_tc_cat_tenant_active` ON (tenant_id, is_active)

### tickets
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `ticket_number` (TEXT, NOT NULL) — Human-readable ID (INC/CHG/PRB-YYYY-NNNNN)
  - `ticket_type` (TEXT, NOT NULL) — 'incident'|'change'|'problem'
  - `subtype` (TEXT) — Optional further classification
  - `title` (TEXT, NOT NULL)
  - `description` (TEXT, NOT NULL, DEFAULT '')
  - `status` (TEXT, NOT NULL, DEFAULT 'open') — 'open'|'in_progress'|'pending'|'resolved'|'closed'
  - `priority` (TEXT, NOT NULL, DEFAULT 'medium') — 'critical'|'high'|'medium'|'low'
  - `impact` (TEXT) — 'critical'|'high'|'medium'|'low'
  - `urgency` (TEXT) — 'critical'|'high'|'medium'|'low'
  - `asset_id` (TEXT, FK → assets.id) — Related asset
  - `assignee_id` (TEXT, FK → users.id) — Individual assignee
  - `assignee_group_id` (TEXT, FK → assignee_groups.id) — Group assignee
  - `reporter_id` (TEXT, NOT NULL, FK → users.id) — Ticket creator
  - `customer_id` (TEXT, FK → customers.id) — Customer ticket belongs to
  - `category_id` (TEXT, FK → ticket_categories.id)
  - `workflow_instance_id` (TEXT) — No FK (references workflows.id)
  - `current_step_id` (TEXT) — Current workflow step ID
  - `sla_tier` (TEXT) — Assigned SLA level
  - `sla_response_due` (TEXT) — ISO 8601 due date for first response
  - `sla_resolve_due` (TEXT) — ISO 8601 due date for resolution
  - `sla_breached` (INTEGER, NOT NULL, DEFAULT 0) — 0/1 boolean
  - `sla_paused_at` (TEXT) — When SLA pause started
  - `sla_paused_total` (INTEGER, NOT NULL, DEFAULT 0) — Cumulative pause seconds
  - `root_cause` (TEXT) — Only for ticket_type='problem'
  - `known_error_id` (TEXT) — FK → known_errors (for incidents linking to known errors)
  - `parent_ticket_id` (TEXT) — Parent ticket (for sub-tickets)
  - `source` (TEXT, NOT NULL, DEFAULT 'manual') — 'manual'|'email'|'monitoring'|'api'|'portal'
  - **Change-Specific Fields (RFC):**
    - `change_justification` (TEXT)
    - `change_risk_level` (TEXT) — 'low'|'medium'|'high'|'critical'
    - `change_risk_likelihood` (TEXT) — 'unlikely'|'possible'|'likely'|'certain'
    - `change_risk_impact` (TEXT) — 'low'|'medium'|'high'|'critical'
    - `change_implementation` (TEXT) — Implementation plan
    - `change_rollback_plan` (TEXT) — Rollback plan
    - `change_planned_start` (TEXT) — ISO 8601
    - `change_planned_end` (TEXT) — ISO 8601
    - `change_actual_start` (TEXT) — ISO 8601
    - `change_actual_end` (TEXT) — ISO 8601
  - **CAB (Change Advisory Board) Fields:**
    - `cab_required` (INTEGER, NOT NULL, DEFAULT 0) — Does this change need CAB approval?
    - `cab_decision` (TEXT) — 'approved'|'rejected'|'deferred'
    - `cab_decision_by` (TEXT) — User who decided
    - `cab_decision_at` (TEXT) — ISO 8601
    - `cab_notes` (TEXT) — Decision reason
  - **Incident Management Fields:**
    - `incident_commander_id` (TEXT, FK → users.id) — Major incident commander
    - `escalation_level` (INTEGER, NOT NULL, DEFAULT 0) — Current escalation level (0-n)
    - `escalated_at` (TEXT) — ISO 8601
    - `is_major_incident` (INTEGER, NOT NULL, DEFAULT 0) — 0/1 boolean
    - `major_declared_at` (TEXT) — ISO 8601
    - `major_declared_by` (TEXT) — User who declared
    - `bridge_call_url` (TEXT) — War room/bridge URL
  - **Project Linkage:**
    - `project_id` (TEXT, FK → projects.id) — Associated project
  - **Timestamps:**
    - `created_at` (TEXT, NOT NULL)
    - `updated_at` (TEXT, NOT NULL)
    - `resolved_at` (TEXT) — When marked resolved
    - `closed_at` (TEXT) — When marked closed
    - `created_by` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (asset_id), FK (assignee_id), FK (assignee_group_id), FK (reporter_id), FK (customer_id), FK (category_id), FK (incident_commander_id), FK (project_id)
- **Indexes:**
  - `idx_ticket_tenant` ON (tenant_id)
  - `idx_ticket_tenant_status` ON (tenant_id, status)
  - `idx_ticket_tenant_type` ON (tenant_id, ticket_type)
  - `idx_ticket_tenant_group` ON (tenant_id, assignee_group_id)
  - `idx_ticket_tenant_assignee` ON (tenant_id, assignee_id)
  - `idx_ticket_tenant_asset` ON (tenant_id, asset_id)
  - `idx_ticket_tenant_customer` ON (tenant_id, customer_id)
  - `idx_ticket_tenant_priority` ON (tenant_id, priority)
  - `idx_ticket_number` ON (tenant_id, ticket_number)
  - `idx_ticket_sla_breached` ON (tenant_id, sla_breached)
  - `idx_ticket_parent` ON (tenant_id, parent_ticket_id)
  - `idx_ticket_tenant_category` ON (tenant_id, category_id)
  - `idx_ticket_tenant_project` ON (tenant_id, project_id)

### ticket_comments
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `ticket_id` (TEXT, NOT NULL, FK → tickets.id)
  - `author_id` (TEXT, NOT NULL, FK → users.id)
  - `content` (TEXT, NOT NULL) — Comment markdown/html
  - `is_internal` (INTEGER, NOT NULL, DEFAULT 0) — 0=visible to customer, 1=internal only
  - `source` (TEXT, NOT NULL, DEFAULT 'agent') — 'agent'|'customer'|'email'|'system'
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (ticket_id), FK (author_id)
- **Indexes:**
  - `idx_tc_tenant` ON (tenant_id)
  - `idx_tc_tenant_ticket` ON (tenant_id, ticket_id)

### ticket_history
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `ticket_id` (TEXT, NOT NULL, FK → tickets.id)
  - `field_changed` (TEXT, NOT NULL) — Which field (e.g., "status", "assignee_id")
  - `old_value` (TEXT) — Serialized old value
  - `new_value` (TEXT) — Serialized new value
  - `changed_by` (TEXT, NOT NULL) — User who made change
  - `changed_at` (TEXT, NOT NULL) — ISO 8601
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (ticket_id)
- **Indexes:**
  - `idx_th_tenant` ON (tenant_id)
  - `idx_th_tenant_ticket` ON (tenant_id, ticket_id)

---

## 6. Workflows

### workflow_templates
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `trigger_type` (TEXT, NOT NULL) — 'ticket_created', 'ticket_status_changed', ...
  - `trigger_subtype` (TEXT) — Optional subtype filter
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `version` (INTEGER, NOT NULL, DEFAULT 1) — Template versioning
  - `created_by` (TEXT, NOT NULL)
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_wt_tenant` ON (tenant_id)
  - `idx_wt_tenant_active` ON (tenant_id, is_active)
  - `idx_wt_tenant_trigger` ON (tenant_id, trigger_type)

### workflow_steps
- **Tenant-Scoped:** No (scoped via template_id)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `template_id` (TEXT, NOT NULL, FK → workflow_templates.id)
  - `name` (TEXT, NOT NULL)
  - `step_order` (INTEGER, NOT NULL) — Execution order
  - `step_type` (TEXT, NOT NULL) — 'form'|'routing'|'approval'|'condition'|'automatic'|...
  - `config` (TEXT, NOT NULL, DEFAULT '{}') — JSON: step-specific configuration
  - `timeout_hours` (INTEGER) — Auto-escalate if not completed
  - `next_step_id` (TEXT) — Hardcoded next step (no FK)
- **Constraints:** PRIMARY KEY (id), FK (template_id)
- **Indexes:**
  - `idx_ws_template` ON (template_id)
  - `idx_ws_template_order` ON (template_id, step_order)

### workflow_instances
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `template_id` (TEXT, NOT NULL, FK → workflow_templates.id)
  - `ticket_id` (TEXT, NOT NULL, FK → tickets.id)
  - `status` (TEXT, NOT NULL, DEFAULT 'active') — 'active'|'completed'|'cancelled'
  - `started_at` (TEXT, NOT NULL) — ISO 8601
  - `completed_at` (TEXT) — ISO 8601
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (template_id), FK (ticket_id)
- **Indexes:**
  - `idx_wi_tenant` ON (tenant_id)
  - `idx_wi_tenant_status` ON (tenant_id, status)
  - `idx_wi_ticket` ON (tenant_id, ticket_id)

### workflow_step_instances
- **Tenant-Scoped:** No (scoped via instance_id)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `instance_id` (TEXT, NOT NULL, FK → workflow_instances.id)
  - `step_id` (TEXT, NOT NULL, FK → workflow_steps.id)
  - `status` (TEXT, NOT NULL, DEFAULT 'pending') — 'pending'|'in_progress'|'completed'|'skipped'|'failed'
  - `assigned_to` (TEXT) — User assignment
  - `assigned_group` (TEXT) — Group assignment
  - `form_data` (TEXT, NOT NULL, DEFAULT '{}') — JSON: form field values
  - `started_at` (TEXT) — ISO 8601
  - `completed_at` (TEXT) — ISO 8601
  - `completed_by` (TEXT) — User who completed
- **Constraints:** PRIMARY KEY (id), FK (instance_id), FK (step_id)
- **Indexes:**
  - `idx_wsi_instance` ON (instance_id)
  - `idx_wsi_instance_status` ON (instance_id, status)

---

## 7. Service Catalog

### service_descriptions
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `code` (TEXT, NOT NULL) — Unique service code (e.g., "SVC-001")
  - `title` (TEXT, NOT NULL) — Service name
  - `description` (TEXT, NOT NULL, DEFAULT '')
  - `scope_included` (TEXT) — What's in scope (markdown)
  - `scope_excluded` (TEXT) — What's out of scope (markdown)
  - `compliance_tags` (TEXT, NOT NULL, DEFAULT '[]') — JSON array: compliance frameworks
  - `version` (INTEGER, NOT NULL, DEFAULT 1)
  - `status` (TEXT, NOT NULL, DEFAULT 'draft') — 'draft'|'published'|'archived'
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, code)
- **Indexes:**
  - `idx_sd_tenant` ON (tenant_id)
  - `idx_sd_tenant_status` ON (tenant_id, status)

### service_scope_items
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `service_id` (TEXT, NOT NULL, FK → service_descriptions.id)
  - `item_description` (TEXT, NOT NULL) — Scope item text
  - `scope_type` (TEXT, NOT NULL, DEFAULT 'included') — 'included'|'excluded'
  - `sort_order` (INTEGER, NOT NULL, DEFAULT 0)
  - `notes` (TEXT) — Additional notes
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (service_id)
- **Indexes:**
  - `idx_ssi_tenant_service` ON (tenant_id, service_id)
  - `idx_ssi_service_type` ON (service_id, scope_type)

### horizontal_catalog
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Catalog name
  - `description` (TEXT)
  - `status` (TEXT, NOT NULL, DEFAULT 'active') — 'active'|'inactive'
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_hc_tenant` ON (tenant_id)

### horizontal_catalog_items
- **Tenant-Scoped:** No (scoped via FK)
- **Columns:**
  - `catalog_id` (TEXT, NOT NULL, FK → horizontal_catalog.id)
  - `service_desc_id` (TEXT, NOT NULL, FK → service_descriptions.id)
- **Constraints:** PRIMARY KEY (catalog_id, service_desc_id), FK (catalog_id), FK (service_desc_id)
- **Indexes:**
  - `idx_hci_catalog` ON (catalog_id)
  - `idx_hci_service` ON (service_desc_id)

### vertical_catalogs (Enterprise)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Vertical catalog name
  - `base_catalog_id` (TEXT, NOT NULL, FK → horizontal_catalog.id)
  - `customer_id` (TEXT, FK → customers.id) — Optional customer specificity
  - `industry` (TEXT) — Industry vertical
  - `description` (TEXT)
  - `status` (TEXT, NOT NULL, DEFAULT 'active')
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (base_catalog_id), FK (customer_id)
- **Indexes:**
  - `idx_vc_tenant` ON (tenant_id)
  - `idx_vc_tenant_customer` ON (tenant_id, customer_id)

### vertical_catalog_overrides
- **Tenant-Scoped:** No (scoped via vertical_id)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `vertical_id` (TEXT, NOT NULL, FK → vertical_catalogs.id)
  - `original_desc_id` (TEXT, NOT NULL, FK → service_descriptions.id)
  - `override_desc_id` (TEXT, NOT NULL, FK → service_descriptions.id)
  - `override_type` (TEXT, NOT NULL) — 'replace'|'exclude'|'add_clause'|...
  - `reason` (TEXT)
- **Constraints:** PRIMARY KEY (id), FK (vertical_id), FK (original_desc_id), FK (override_desc_id)
- **Indexes:**
  - `idx_vco_vertical` ON (vertical_id)

### asset_service_links
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `vertical_id` (TEXT, NOT NULL, FK → vertical_catalogs.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `effective_from` (TEXT, NOT NULL) — ISO 8601
  - `effective_until` (TEXT) — ISO 8601
- **Constraints:** PRIMARY KEY (asset_id, vertical_id), FK (asset_id), FK (vertical_id), FK (tenant_id)
- **Indexes:**
  - `idx_asl_tenant` ON (tenant_id)
  - `idx_asl_asset` ON (tenant_id, asset_id)
  - `idx_asl_vertical` ON (tenant_id, vertical_id)

---

## 8. Compliance & Regulatory

### regulatory_frameworks
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Framework name (e.g., "ISO27001", "GDPR")
  - `version` (TEXT) — Framework version
  - `description` (TEXT)
  - `effective_date` (TEXT) — ISO 8601
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_rf_tenant` ON (tenant_id)

### regulatory_requirements
- **Tenant-Scoped:** No (scoped via framework_id)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `framework_id` (TEXT, NOT NULL, FK → regulatory_frameworks.id)
  - `code` (TEXT, NOT NULL) — Requirement code (e.g., "A.5.1.1")
  - `title` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `category` (TEXT) — Grouping (e.g., "Access Control")
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (framework_id)
- **Indexes:**
  - `idx_rr_framework` ON (framework_id)
  - `idx_rr_framework_category` ON (framework_id, category)

### requirement_service_mappings
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `requirement_id` (TEXT, NOT NULL, FK → regulatory_requirements.id)
  - `service_desc_id` (TEXT, NOT NULL, FK → service_descriptions.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `coverage_level` (TEXT, NOT NULL, DEFAULT 'none') — 'none'|'partial'|'full'
  - `evidence_notes` (TEXT)
  - `reviewed_at` (TEXT) — ISO 8601
  - `reviewed_by` (TEXT) — User
  - `maturity_level` (TEXT) — 'initial'|'managed'|'defined'|'measured'|'optimizing'
  - `last_verified` (TEXT) — ISO 8601
  - `verified_by` (TEXT) — User
- **Constraints:** PRIMARY KEY (requirement_id, service_desc_id), FK (requirement_id), FK (service_desc_id), FK (tenant_id)
- **Indexes:**
  - `idx_rsm_tenant` ON (tenant_id)
  - `idx_rsm_requirement` ON (requirement_id)
  - `idx_rsm_service` ON (service_desc_id)

### asset_regulatory_flags
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `framework_id` (TEXT, NOT NULL, FK → regulatory_frameworks.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `reason` (TEXT) — Why flagged
  - `flagged_at` (TEXT, NOT NULL) — ISO 8601
  - `flagged_by` (TEXT, NOT NULL) — User
- **Constraints:** PRIMARY KEY (asset_id, framework_id), FK (asset_id), FK (framework_id), FK (tenant_id)
- **Indexes:**
  - `idx_arf_tenant` ON (tenant_id)
  - `idx_arf_asset` ON (tenant_id, asset_id)
  - `idx_arf_framework` ON (tenant_id, framework_id)

### compliance_controls (Evo-4A)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `code` (TEXT, NOT NULL) — Control identifier
  - `title` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `category` (TEXT) — Control grouping
  - `control_type` (TEXT, NOT NULL, DEFAULT 'preventive') — 'preventive'|'detective'|'corrective'
  - `status` (TEXT, NOT NULL, DEFAULT 'planned') — 'planned'|'implemented'|'verified'|'not_applicable'
  - `owner_id` (TEXT, FK → users.id) — Control owner
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, code), FK (owner_id)
- **Indexes:**
  - `idx_cc_tenant` ON (tenant_id)
  - `idx_cc_tenant_status` ON (tenant_id, status)
  - `idx_cc_tenant_category` ON (tenant_id, category)

### requirement_control_mappings (Evo-4A)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `requirement_id` (TEXT, NOT NULL, FK → regulatory_requirements.id)
  - `control_id` (TEXT, NOT NULL, FK → compliance_controls.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `coverage` (TEXT, NOT NULL, DEFAULT 'full') — 'full'|'partial'|'planned'
  - `notes` (TEXT)
- **Constraints:** PRIMARY KEY (requirement_id, control_id), FK (requirement_id), FK (control_id), UNIQUE (requirement_id, control_id), FK (tenant_id)
- **Indexes:**
  - `idx_rcm_tenant` ON (tenant_id)
  - `idx_rcm_control` ON (control_id)
  - `idx_rcm_requirement` ON (requirement_id)

### compliance_audits (Evo-4B)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Audit name
  - `framework_id` (TEXT, FK → regulatory_frameworks.id) — Which framework
  - `audit_type` (TEXT, NOT NULL, DEFAULT 'internal') — 'internal'|'external'|'certification'
  - `status` (TEXT, NOT NULL, DEFAULT 'planned') — 'planned'|'in_progress'|'completed'|'cancelled'
  - `auditor` (TEXT) — Auditor name/org
  - `start_date` (TEXT) — ISO 8601
  - `end_date` (TEXT) — ISO 8601
  - `scope` (TEXT) — What was audited
  - `notes` (TEXT)
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (framework_id)
- **Indexes:**
  - `idx_ca_tenant` ON (tenant_id)
  - `idx_ca_tenant_status` ON (tenant_id, status)
  - `idx_ca_tenant_framework` ON (tenant_id, framework_id)

### audit_findings (Evo-4B)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `audit_id` (TEXT, NOT NULL, FK → compliance_audits.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `control_id` (TEXT, FK → compliance_controls.id) — Related control
  - `requirement_id` (TEXT, FK → regulatory_requirements.id) — Related requirement
  - `severity` (TEXT, NOT NULL, DEFAULT 'minor') — 'critical'|'major'|'minor'|'observation'
  - `title` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `status` (TEXT, NOT NULL, DEFAULT 'open') — 'open'|'in_remediation'|'resolved'|'accepted_risk'
  - `remediation_plan` (TEXT)
  - `due_date` (TEXT) — ISO 8601
  - `resolved_at` (TEXT) — ISO 8601
  - `resolved_by` (TEXT) — User
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (audit_id), FK (tenant_id), FK (control_id), FK (requirement_id)
- **Indexes:**
  - `idx_af_tenant` ON (tenant_id)
  - `idx_af_audit` ON (audit_id)
  - `idx_af_tenant_status` ON (tenant_id, status)
  - `idx_af_tenant_severity` ON (tenant_id, severity)

### compliance_evidence (Evo-4C)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `control_id` (TEXT, NOT NULL, FK → compliance_controls.id)
  - `evidence_type` (TEXT, NOT NULL, DEFAULT 'document') — 'document'|'screenshot'|'log'|'report'|'test_result'
  - `title` (TEXT, NOT NULL)
  - `url` (TEXT) — URL to evidence (local or external)
  - `description` (TEXT)
  - `uploaded_at` (TEXT, NOT NULL) — ISO 8601
  - `uploaded_by` (TEXT) — User
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (control_id)
- **Indexes:**
  - `idx_ce_tenant` ON (tenant_id)
  - `idx_ce_control` ON (control_id)
  - `idx_ce_tenant_type` ON (tenant_id, evidence_type)

### framework_requirement_mappings (Evo-4D)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `source_requirement_id` (TEXT, NOT NULL, FK → regulatory_requirements.id)
  - `target_requirement_id` (TEXT, NOT NULL, FK → regulatory_requirements.id)
  - `mapping_type` (TEXT, NOT NULL) — 'equal'|'partial'|'related', CHECK constraint
  - `notes` (TEXT)
  - `created_by` (TEXT)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, source_requirement_id, target_requirement_id), FK (source_requirement_id), FK (target_requirement_id), CHECK (mapping_type IN ('equal','partial','related'))
- **Indexes:**
  - `idx_frm_tenant` ON (tenant_id)
  - `idx_frm_source` ON (source_requirement_id)
  - `idx_frm_target` ON (target_requirement_id)

---

## 9. Monitoring & Events

### monitoring_sources
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Source name
  - `type` (TEXT, NOT NULL) — 'checkmk_v1'|'checkmk_v2'|'zabbix'|'prometheus'|'custom'
  - `config` (TEXT, NOT NULL, DEFAULT '{}') — JSON: provider-specific credentials/endpoints
  - `webhook_secret` (TEXT) — Webhook validation secret
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_ms_tenant` ON (tenant_id)
  - `idx_ms_tenant_active` ON (tenant_id, is_active)

### monitoring_events
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `source_id` (TEXT, NOT NULL, FK → monitoring_sources.id)
  - `external_id` (TEXT) — Event ID from monitoring system
  - `hostname` (TEXT, NOT NULL) — Host that triggered event
  - `service_name` (TEXT) — Service name (for Check_MK)
  - `state` (TEXT, NOT NULL) — 'up'|'down'|'critical'|'warning'|'ok'|...
  - `output` (TEXT) — Event message/description
  - `matched_asset_id` (TEXT, FK → assets.id) — Matched CMDB asset
  - `ticket_id` (TEXT, FK → tickets.id) — Created/linked ticket
  - `processed` (INTEGER, NOT NULL, DEFAULT 0) — 0/1 whether event was processed
  - `received_at` (TEXT, NOT NULL) — ISO 8601
  - `processed_at` (TEXT) — ISO 8601
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (source_id), FK (matched_asset_id), FK (ticket_id)
- **Indexes:**
  - `idx_me_tenant` ON (tenant_id)
  - `idx_me_tenant_source` ON (tenant_id, source_id)
  - `idx_me_tenant_processed` ON (tenant_id, processed)
  - `idx_me_tenant_hostname` ON (tenant_id, hostname)
  - `idx_me_external` ON (external_id)

---

## 10. E-Mail Inbound

### email_inbound_configs
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Config name
  - `provider` (TEXT, NOT NULL) — 'imap'|'webhook_mailgun'|'webhook_sendgrid'|'smtp_gateway'
  - `config` (TEXT, NOT NULL, DEFAULT '{}') — JSON: provider credentials (encrypted in practice)
  - `target_group_id` (TEXT, FK → assignee_groups.id) — Default assignment group
  - `default_ticket_type` (TEXT, NOT NULL, DEFAULT 'incident') — 'incident'|'change'
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (target_group_id)
- **Indexes:**
  - `idx_eic_tenant` ON (tenant_id)
  - `idx_eic_tenant_active` ON (tenant_id, is_active)

### email_messages
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `config_id` (TEXT, NOT NULL, FK → email_inbound_configs.id)
  - `message_id` (TEXT, NOT NULL) — E-mail Message-ID header (unique globally)
  - `from_address` (TEXT, NOT NULL)
  - `from_name` (TEXT) — Display name
  - `to_address` (TEXT, NOT NULL)
  - `subject` (TEXT, NOT NULL)
  - `body_text` (TEXT) — Plain text body
  - `body_html` (TEXT) — HTML body
  - `headers` (TEXT, NOT NULL, DEFAULT '{}') — JSON: full e-mail headers
  - `ticket_id` (TEXT, FK → tickets.id) — Linked ticket (NULL if not matched)
  - `is_reply` (INTEGER, NOT NULL, DEFAULT 0) — 0/1 whether this is a reply
  - `thread_reference` (TEXT) — In-Reply-To / References header value
  - `processed` (INTEGER, NOT NULL, DEFAULT 0) — 0/1 whether matched to ticket
  - `received_at` (TEXT, NOT NULL) — ISO 8601
  - `processed_at` (TEXT) — ISO 8601
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (config_id), FK (ticket_id)
- **Indexes:**
  - `idx_em_tenant` ON (tenant_id)
  - `idx_em_tenant_config` ON (tenant_id, config_id)
  - `idx_em_message_id` ON (message_id) — Global for thread matching
  - `idx_em_tenant_processed` ON (tenant_id, processed)
  - `idx_em_thread_ref` ON (thread_reference)
  - `idx_em_tenant_ticket` ON (tenant_id, ticket_id)
- **Notes:** Thread-matching logic: In-Reply-To → known message_id; Subject pattern → ticket number; else → new ticket

---

## 11. Knowledge Base

### kb_articles
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `title` (TEXT, NOT NULL)
  - `slug` (TEXT, NOT NULL) — URL-safe identifier
  - `content` (TEXT, NOT NULL, DEFAULT '') — Markdown content
  - `category` (TEXT) — Article category
  - `tags` (TEXT, NOT NULL, DEFAULT '[]') — JSON array: searchable tags
  - `visibility` (TEXT, NOT NULL, DEFAULT 'internal') — 'internal'|'public'
  - `status` (TEXT, NOT NULL, DEFAULT 'draft') — 'draft'|'published'|'archived'
  - `author_id` (TEXT, NOT NULL, FK → users.id)
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
  - `published_at` (TEXT) — ISO 8601 when published
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, slug), FK (author_id)
- **Indexes:**
  - `idx_kb_tenant` ON (tenant_id)
  - `idx_kb_tenant_status` ON (tenant_id, status)
  - `idx_kb_tenant_visibility` ON (tenant_id, visibility)
  - `idx_kb_tenant_category` ON (tenant_id, category)

### kb_article_links
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `article_id` (TEXT, NOT NULL, FK → kb_articles.id)
  - `ticket_id` (TEXT, NOT NULL, FK → tickets.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
- **Constraints:** PRIMARY KEY (article_id, ticket_id), FK (article_id), FK (ticket_id), FK (tenant_id)
- **Indexes:**
  - `idx_kal_tenant` ON (tenant_id)
  - `idx_kal_article` ON (article_id)
  - `idx_kal_ticket` ON (ticket_id)

---

## 12. Known Error Database (KEDB)

### known_errors
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `title` (TEXT, NOT NULL)
  - `symptom` (TEXT, NOT NULL) — How the error manifests
  - `workaround` (TEXT) — Temporary workaround
  - `root_cause` (TEXT) — Root cause analysis
  - `status` (TEXT, NOT NULL, DEFAULT 'identified') — 'identified'|'workaround_available'|'resolved'
  - `problem_id` (TEXT, FK → tickets.id) — Related problem ticket
  - `created_by` (TEXT, NOT NULL, FK → users.id)
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (problem_id), FK (created_by)
- **Indexes:**
  - `idx_ke_tenant` ON (tenant_id)
  - `idx_ke_tenant_status` ON (tenant_id, status)
  - `idx_ke_tenant_problem` ON (tenant_id, problem_id)

---

## 13. SLA & Service Levels

### sla_definitions
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — e.g., "Platinum 24/7"
  - `description` (TEXT)
  - `response_time_minutes` (INTEGER, NOT NULL) — First response target (minutes)
  - `resolution_time_minutes` (INTEGER, NOT NULL) — Resolution target (minutes)
  - `business_hours` (TEXT, NOT NULL, DEFAULT '24/7') — '24/7'|'business'|'extended'
  - `business_hours_start` (TEXT) — e.g., "08:00" (if not 24/7)
  - `business_hours_end` (TEXT) — e.g., "18:00"
  - `business_days` (TEXT, NOT NULL, DEFAULT '1,2,3,4,5') — Comma-separated: 1=Mon...7=Sun
  - `priority_overrides` (TEXT, NOT NULL, DEFAULT '{}') — JSON: { "critical": { "response": 15, "resolution": 60 } }
  - **Extended SLA (Evo-2A):**
    - `rpo_minutes` (INTEGER) — Recovery Point Objective
    - `rto_minutes` (INTEGER) — Recovery Time Objective
    - `service_window` (TEXT, DEFAULT '{}') — JSON: maintenance/change windows
    - `escalation_matrix` (TEXT, DEFAULT '[]') — JSON: escalation levels & contacts
  - **Additional Fields (Evo-2.2a):**
    - `availability_pct` (TEXT) — e.g., "99.9"
    - `support_level` (TEXT) — "8x5"|"24x7"|"best-effort"
    - `recovery_class` (TEXT)
    - `business_criticality` (TEXT) — "low"|"medium"|"high"|"critical"
    - `penalty_clause` (TEXT) — Markdown
    - `contract_reference` (TEXT)
    - `valid_from` (TEXT) — ISO 8601
    - `valid_until` (TEXT) — ISO 8601
  - `is_default` (INTEGER, NOT NULL, DEFAULT 0) — Tenant-wide default
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_sladef_tenant` ON (tenant_id)
  - `idx_sladef_tenant_active` ON (tenant_id, is_active)

### sla_assignments
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `sla_definition_id` (TEXT, NOT NULL, FK → sla_definitions.id)
  - `service_id` (TEXT, FK → service_descriptions.id) — Optional scope
  - `customer_id` (TEXT, FK → customers.id) — Optional scope
  - `asset_id` (TEXT, FK → assets.id) — Optional scope
  - `priority` (INTEGER, NOT NULL, DEFAULT 0) — Resolution priority (higher = more specific; asset=100, customer+service=75, customer=50, service=25)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, sla_definition_id, service_id, customer_id, asset_id)
- **Indexes:**
  - `idx_slaassign_tenant` ON (tenant_id)
  - `idx_slaassign_tenant_asset` ON (tenant_id, asset_id)
  - `idx_slaassign_tenant_customer` ON (tenant_id, customer_id)
  - `idx_slaassign_tenant_service` ON (tenant_id, service_id)
- **Notes:** Resolution order: asset > (customer + service) > customer > service > tenant default

### service_profiles (Evo-2A)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Profile name
  - `description` (TEXT)
  - `dimensions` (TEXT, NOT NULL, DEFAULT '{}') — JSON: service dimensions/features
  - `sla_definition_id` (TEXT, FK → sla_definitions.id)
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, name), FK (sla_definition_id)
- **Indexes:**
  - `idx_svcprofile_tenant` ON (tenant_id)

### service_entitlements (Evo-2A)
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `customer_id` (TEXT, NOT NULL, FK → customers.id)
  - `service_id` (TEXT, NOT NULL, FK → service_descriptions.id)
  - `profile_id` (TEXT, FK → service_profiles.id)
  - `scope` (TEXT, NOT NULL, DEFAULT '{}') — JSON: { included, excluded, addon }
  - `effective_from` (TEXT, NOT NULL) — ISO 8601
  - `effective_until` (TEXT) — ISO 8601
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (customer_id), FK (service_id), FK (profile_id)
- **Indexes:**
  - `idx_svcent_tenant` ON (tenant_id)
  - `idx_svcent_customer` ON (tenant_id, customer_id)
  - `idx_svcent_service` ON (tenant_id, service_id)

---

## 14. Projects (Evo-2C)

### projects
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `customer_id` (TEXT, FK → customers.id)
  - `name` (TEXT, NOT NULL)
  - `code` (TEXT, NOT NULL) — Unique project code
  - `description` (TEXT)
  - `status` (TEXT, NOT NULL, DEFAULT 'active') — 'active'|'on_hold'|'completed'|'cancelled'
  - `start_date` (TEXT) — ISO 8601
  - `end_date` (TEXT) — ISO 8601
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), UNIQUE (tenant_id, code), FK (customer_id)
- **Indexes:**
  - `idx_proj_tenant` ON (tenant_id)
  - `idx_proj_tenant_status` ON (tenant_id, status)
  - `idx_proj_tenant_customer` ON (tenant_id, customer_id)

### project_assets
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `project_id` (TEXT, NOT NULL, FK → projects.id)
  - `asset_id` (TEXT, NOT NULL, FK → assets.id)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `role` (TEXT) — Asset role in project
  - `added_at` (TEXT, NOT NULL) — ISO 8601
- **Constraints:** PRIMARY KEY (project_id, asset_id), FK (project_id), FK (asset_id), UNIQUE (project_id, asset_id), FK (tenant_id)
- **Indexes:**
  - `idx_pa_tenant` ON (tenant_id)
  - `idx_pa_project` ON (project_id)
  - `idx_pa_asset` ON (asset_id)

---

## 15. Notifications & Escalation

### notification_preferences
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `user_id` (TEXT, NOT NULL, FK → users.id)
  - `event_type` (TEXT, NOT NULL) — 'ticket_assigned'|'ticket_status_changed'|'ticket_commented'|'sla_breaching'|...
  - `channel` (TEXT, NOT NULL, DEFAULT 'email') — 'email'|'push'|'slack' (future)
  - `enabled` (INTEGER, NOT NULL, DEFAULT 1) — 0/1 boolean
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (user_id)
- **Indexes:**
  - `idx_np_tenant` ON (tenant_id)
  - `idx_np_tenant_user` ON (tenant_id, user_id)
  - `idx_np_tenant_user_event` ON (tenant_id, user_id, event_type, channel)

### escalation_rules
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `name` (TEXT, NOT NULL) — Rule name
  - `ticket_type` (TEXT) — Optional type filter ('incident'|'change'|'problem'|NULL=all)
  - `priority` (TEXT) — Optional priority filter ('critical'|...|NULL=all)
  - `sla_threshold_pct` (INTEGER, NOT NULL, DEFAULT 80) — % of SLA time elapsed before escalate
  - `target_group_id` (TEXT, NOT NULL, FK → assignee_groups.id) — Escalate to this group
  - `escalation_level` (INTEGER, NOT NULL, DEFAULT 1) — Escalation level number
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1)
  - `created_at` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id), FK (target_group_id)
- **Indexes:**
  - `idx_esc_tenant` ON (tenant_id)
  - `idx_esc_tenant_active` ON (tenant_id, is_active)

---

## 16. Audit & Logging

### audit_logs
- **Tenant-Scoped:** Yes (tenant_id column)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `tenant_id` (TEXT, NOT NULL, FK → tenants.id)
  - `actor_id` (TEXT, NOT NULL) — User who performed action
  - `actor_email` (TEXT, NOT NULL) — Actor email (for audit trail clarity)
  - `event_type` (TEXT, NOT NULL) — Action type ('ticket_created'|'asset_updated'|'user_login'|...)
  - `resource_type` (TEXT, NOT NULL) — Entity type ('ticket'|'asset'|'user'|...)
  - `resource_id` (TEXT) — Entity ID
  - `details` (TEXT, NOT NULL, DEFAULT '{}') — JSON: extra context (old_value, new_value, etc.)
  - `ip_address` (TEXT) — Requester IP
  - `user_agent` (TEXT) — Browser user agent
  - `integrity_hash` (TEXT) — HMAC for audit trail integrity (Evo-2A)
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id), FK (tenant_id)
- **Indexes:**
  - `idx_audit_tenant` ON (tenant_id)
  - `idx_audit_tenant_event` ON (tenant_id, event_type)
  - `idx_audit_tenant_resource` ON (tenant_id, resource_type)
  - `idx_audit_tenant_actor` ON (tenant_id, actor_id)
  - `idx_audit_tenant_created` ON (tenant_id, created_at)
- **Notes:** Immutable audit trail for compliance; integrity_hash prevents tampering detection

---

## 17. System Settings (Global, Non-Tenant)

### system_settings
- **Tenant-Scoped:** No (global system settings)
- **Columns:**
  - `key` (TEXT, PRIMARY KEY) — Setting identifier (e.g., "branding_primary_color")
  - `value` (TEXT, NOT NULL, DEFAULT '{}') — JSON value
  - `updated_at` (TEXT) — ISO 8601 when last changed
  - `updated_by` (TEXT) — User who changed it
- **Constraints:** PRIMARY KEY (key)
- **Indexes:** None

---

## 18. Public Feedback (Global, Non-Tenant)

### feedback_entries
- **Tenant-Scoped:** No (public, global)
- **Columns:**
  - `id` (TEXT, PRIMARY KEY)
  - `author_name` (TEXT, NOT NULL) — Anonymous or named
  - `entry_type` (TEXT, NOT NULL, DEFAULT 'feedback') — 'bug'|'feature'|'improvement'|'question'|'feedback'
  - `title` (TEXT, NOT NULL)
  - `description` (TEXT, NOT NULL, DEFAULT '')
  - `status` (TEXT, NOT NULL, DEFAULT 'open') — 'open'|'in_progress'|'done'|'wont_fix'
  - `votes` (INTEGER, NOT NULL, DEFAULT 0) — Vote count
  - `created_at` (TEXT, NOT NULL)
- **Constraints:** PRIMARY KEY (id)
- **Indexes:**
  - `idx_feedback_type` ON (entry_type)
  - `idx_feedback_created` ON (created_at)

---

## Summary Statistics

| Category | Count | Tenant-Scoped | Notes |
|----------|-------|---------------|-------|
| **Foundation** | 4 | 3/4 | tenants, users, tenant_user_memberships, assignee_groups, user_group_memberships |
| **Customers & Portal** | 2 | 2/2 | customers, customer_portal_users |
| **Assets & CMDB** | 13 | 13/13 | assets, asset_types, asset_relations, relation_types, classifications, capacities, histories, tenant_assignments |
| **Tickets** | 4 | 4/4 | tickets, ticket_categories, ticket_comments, ticket_history |
| **Workflows** | 4 | 2/4 | workflow_templates, workflow_instances (scoped), workflow_steps, workflow_step_instances |
| **Services** | 7 | 7/7 | service_descriptions, service_scope_items, horizontal_catalog, horizontal_catalog_items, vertical_catalogs, vertical_catalog_overrides, asset_service_links |
| **Compliance** | 10 | 10/10 | regulatory_frameworks, regulatory_requirements, requirement_service_mappings, asset_regulatory_flags, compliance_controls, requirement_control_mappings, compliance_audits, audit_findings, compliance_evidence, framework_requirement_mappings |
| **Monitoring** | 2 | 2/2 | monitoring_sources, monitoring_events |
| **E-Mail** | 2 | 2/2 | email_inbound_configs, email_messages |
| **Knowledge Base** | 2 | 2/2 | kb_articles, kb_article_links |
| **KEDB** | 1 | 1/1 | known_errors |
| **SLA & Services** | 4 | 4/4 | sla_definitions, sla_assignments, service_profiles, service_entitlements |
| **Projects** | 2 | 2/2 | projects, project_assets |
| **Notifications** | 2 | 2/2 | notification_preferences, escalation_rules |
| **Audit** | 1 | 1/1 | audit_logs |
| **System** | 2 | 0/2 | system_settings, feedback_entries (global) |
| **TOTAL** | **63** | **59 tenant-scoped + 4 system** | Complete inventory |

---

## Key Architectural Notes

1. **Multi-Tenancy Strategy:** Strict tenant_id isolation on all entity tables. User-to-tenant via `tenant_user_memberships` allows cross-tenant memberships.

2. **Database Agnosticism:** All TEXT for timestamps (ISO 8601), REAL/INTEGER for numbers. No PostgreSQL-specific types (ENUM, INET, JSONB); JSON stored as TEXT.

3. **Temporal Data:** asset_relations and asset_capacities support `valid_from`/`valid_until` for time-range validity.

4. **Audit Trail:** 
   - `ticket_history` tracks all ticket field changes
   - `asset_relation_history` tracks relation changes
   - `asset_capacity_history` tracks capacity changes
   - `audit_logs` centralized system audit trail

5. **Extensibility:** 
   - `asset_types` + `attribute_schema` (JSON Zod) for custom asset attributes
   - `relation_types` + `properties_schema` for custom relation properties
   - `classification_models` + `classification_values` for flexible classifications
   - `capacity_types` for domain-specific capacity metrics

6. **Compliance-First:** Dedicated compliance tables (controls, audits, findings, evidence) align with ISO27001, GDPR, HIPAA requirements.

7. **SLA Intelligence:**
   - `sla_definitions` with business hours, priority overrides, RPO/RTO, escalation matrices
   - `sla_assignments` with priority-based resolution (asset > customer+service > customer > service > default)
   - `sla_paused_at` + `sla_paused_total` for pause tracking

8. **Change Management:** Tickets with change-specific fields (RFC), CAB approval, risk assessment, rollback plan.

9. **Incident Management:** Major incident declaration, incident commander, escalation levels, bridge call URLs.

10. **Workflow Engine:** Template-based workflows with step types (form, routing, approval, condition, automatic), timeouts, and runtime state tracking.

11. **E-Mail Threading:** Message-ID + In-Reply-To header tracking for automatic ticket correlation.

12. **Monitoring Integration:** Support for Check_MK v1 (Livestatus) and v2 (REST API), Zabbix, Prometheus, extensible webhook pattern.

---

**Generated:** March 2026 | **Scope:** OpsWeave v0.5.x | **Completeness:** 100% schema coverage (all 63 tables inventoried)