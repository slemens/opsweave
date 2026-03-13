/**
 * OpsWeave — Database Setup (create tables programmatically)
 *
 * Uses Drizzle's sql helper to create all tables from schema.
 * This avoids drizzle-kit CJS/ESM issues with .js imports.
 *
 * Usage: DB_DRIVER=sqlite DATABASE_URL=file:./data/opsweave.db npx tsx src/db/setup.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { initDatabase, getDb, type TypedDb } from '../config/database.js';
// AUDIT-FIX: H-11 — Structured logging
import logger from '../lib/logger.js';

export const TABLES_SQL = `
-- tenants
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

-- users (NO tenant_id)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  external_id TEXT,
  language TEXT NOT NULL DEFAULT 'de',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_superadmin INTEGER NOT NULL DEFAULT 0,
  last_login TEXT,
  password_changed_at TEXT,
  password_history TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

-- tenant_user_memberships
CREATE TABLE IF NOT EXISTS tenant_user_memberships (
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'viewer',
  is_default INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, user_id)
);

-- assignee_groups
CREATE TABLE IF NOT EXISTS assignee_groups (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'support',
  parent_group_id TEXT REFERENCES assignee_groups(id),
  created_at TEXT NOT NULL
);

-- user_group_memberships
CREATE TABLE IF NOT EXISTS user_group_memberships (
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT NOT NULL REFERENCES assignee_groups(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  role_in_group TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (user_id, group_id)
);

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  industry TEXT,
  contact_email TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- customer_portal_users
CREATE TABLE IF NOT EXISTS customer_portal_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL
);

-- assets
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
  owner_group_id TEXT REFERENCES assignee_groups(id),
  customer_id TEXT REFERENCES customers(id),
  attributes TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

-- asset_relations
CREATE TABLE IF NOT EXISTS asset_relations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  source_asset_id TEXT NOT NULL REFERENCES assets(id),
  target_asset_id TEXT NOT NULL REFERENCES assets(id),
  relation_type TEXT NOT NULL,
  properties TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  valid_from TEXT,
  valid_until TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  UNIQUE(tenant_id, source_asset_id, target_asset_id, relation_type)
);

-- asset_types (Evo-1A: Extensible Asset Type Registry)
CREATE TABLE IF NOT EXISTS asset_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  icon TEXT,
  color TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  attribute_schema TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, slug)
);

-- relation_types (Evo-3A: Extensible Relation Type Registry)
CREATE TABLE IF NOT EXISTS relation_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '{}',
  description TEXT,
  category TEXT,
  is_directional INTEGER NOT NULL DEFAULT 1,
  source_types TEXT NOT NULL DEFAULT '[]',
  target_types TEXT NOT NULL DEFAULT '[]',
  properties_schema TEXT NOT NULL DEFAULT '[]',
  is_system INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  color TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, slug)
);

-- classification_models (Evo-1C: Classification System)
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

-- classification_values (Evo-1C)
CREATE TABLE IF NOT EXISTS classification_values (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES classification_models(id),
  value TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '{}',
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(model_id, value)
);

-- asset_classifications (Evo-1C)
CREATE TABLE IF NOT EXISTS asset_classifications (
  asset_id TEXT NOT NULL REFERENCES assets(id),
  value_id TEXT NOT NULL REFERENCES classification_values(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  justification TEXT,
  classified_by TEXT,
  classified_at TEXT NOT NULL,
  UNIQUE(asset_id, value_id)
);

-- capacity_types (Evo-3C: Capacity System)
CREATE TABLE IF NOT EXISTS capacity_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '{}',
  unit TEXT NOT NULL,
  category TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, slug)
);

-- asset_capacities (Evo-3C)
CREATE TABLE IF NOT EXISTS asset_capacities (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  capacity_type_id TEXT NOT NULL REFERENCES capacity_types(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  direction TEXT NOT NULL DEFAULT 'provides',
  total REAL NOT NULL DEFAULT 0,
  allocated REAL NOT NULL DEFAULT 0,
  reserved REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(asset_id, capacity_type_id, direction)
);

-- asset_tenant_assignments (REQ-2.1: Multi-Tenant Asset Assignment)
CREATE TABLE IF NOT EXISTS asset_tenant_assignments (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  assignment_type TEXT NOT NULL DEFAULT 'dedicated',
  inherited_from_asset_id TEXT REFERENCES assets(id),
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  UNIQUE(asset_id, tenant_id)
);

-- ticket_categories
CREATE TABLE IF NOT EXISTS ticket_categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'all',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- tickets
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  ticket_number TEXT NOT NULL,
  ticket_type TEXT NOT NULL,
  subtype TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  impact TEXT,
  urgency TEXT,
  asset_id TEXT REFERENCES assets(id),
  assignee_id TEXT REFERENCES users(id),
  assignee_group_id TEXT REFERENCES assignee_groups(id),
  reporter_id TEXT NOT NULL REFERENCES users(id),
  customer_id TEXT REFERENCES customers(id),
  workflow_instance_id TEXT,
  current_step_id TEXT,
  sla_tier TEXT,
  sla_response_due TEXT,
  sla_resolve_due TEXT,
  sla_breached INTEGER NOT NULL DEFAULT 0,
  sla_paused_at TEXT,
  sla_paused_total INTEGER NOT NULL DEFAULT 0,
  root_cause TEXT,
  known_error_id TEXT,
  category_id TEXT REFERENCES ticket_categories(id),
  parent_ticket_id TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  change_justification TEXT,
  change_risk_level TEXT,
  change_risk_likelihood TEXT,
  change_risk_impact TEXT,
  change_implementation TEXT,
  change_rollback_plan TEXT,
  change_planned_start TEXT,
  change_planned_end TEXT,
  change_actual_start TEXT,
  change_actual_end TEXT,
  cab_required INTEGER NOT NULL DEFAULT 0,
  cab_decision TEXT,
  cab_decision_by TEXT,
  cab_decision_at TEXT,
  cab_notes TEXT,
  incident_commander_id TEXT REFERENCES users(id),
  escalation_level INTEGER NOT NULL DEFAULT 0,
  escalated_at TEXT,
  is_major_incident INTEGER NOT NULL DEFAULT 0,
  major_declared_at TEXT,
  major_declared_by TEXT,
  bridge_call_url TEXT,
  project_id TEXT REFERENCES projects(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  closed_at TEXT,
  created_by TEXT NOT NULL
);

-- ticket_comments
CREATE TABLE IF NOT EXISTS ticket_comments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_internal INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'agent',
  created_at TEXT NOT NULL
);

-- ticket_history
CREATE TABLE IF NOT EXISTS ticket_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

-- workflow_templates
CREATE TABLE IF NOT EXISTS workflow_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_subtype TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- workflow_steps
CREATE TABLE IF NOT EXISTS workflow_steps (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES workflow_templates(id),
  name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  timeout_hours INTEGER,
  next_step_id TEXT
);

-- workflow_instances
CREATE TABLE IF NOT EXISTS workflow_instances (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  template_id TEXT NOT NULL REFERENCES workflow_templates(id),
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL,
  completed_at TEXT
);

-- workflow_step_instances
CREATE TABLE IF NOT EXISTS workflow_step_instances (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL REFERENCES workflow_instances(id),
  step_id TEXT NOT NULL REFERENCES workflow_steps(id),
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT,
  assigned_group TEXT,
  form_data TEXT NOT NULL DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  completed_by TEXT
);

-- service_descriptions
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
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, code)
);

-- horizontal_catalog
CREATE TABLE IF NOT EXISTS horizontal_catalog (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

-- horizontal_catalog_items
CREATE TABLE IF NOT EXISTS horizontal_catalog_items (
  catalog_id TEXT NOT NULL REFERENCES horizontal_catalog(id),
  service_desc_id TEXT NOT NULL REFERENCES service_descriptions(id),
  PRIMARY KEY (catalog_id, service_desc_id)
);

-- vertical_catalogs
CREATE TABLE IF NOT EXISTS vertical_catalogs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  base_catalog_id TEXT NOT NULL REFERENCES horizontal_catalog(id),
  customer_id TEXT REFERENCES customers(id),
  industry TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

-- vertical_catalog_overrides
CREATE TABLE IF NOT EXISTS vertical_catalog_overrides (
  id TEXT PRIMARY KEY,
  vertical_id TEXT NOT NULL REFERENCES vertical_catalogs(id),
  original_desc_id TEXT NOT NULL REFERENCES service_descriptions(id),
  override_desc_id TEXT NOT NULL REFERENCES service_descriptions(id),
  override_type TEXT NOT NULL,
  reason TEXT
);

-- asset_service_links
CREATE TABLE IF NOT EXISTS asset_service_links (
  asset_id TEXT NOT NULL REFERENCES assets(id),
  vertical_id TEXT NOT NULL REFERENCES vertical_catalogs(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  PRIMARY KEY (asset_id, vertical_id)
);

-- regulatory_frameworks
CREATE TABLE IF NOT EXISTS regulatory_frameworks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  version TEXT,
  description TEXT,
  effective_date TEXT,
  created_at TEXT NOT NULL
);

-- regulatory_requirements
CREATE TABLE IF NOT EXISTS regulatory_requirements (
  id TEXT PRIMARY KEY,
  framework_id TEXT NOT NULL REFERENCES regulatory_frameworks(id),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TEXT NOT NULL
);

-- requirement_service_mappings
CREATE TABLE IF NOT EXISTS requirement_service_mappings (
  requirement_id TEXT NOT NULL REFERENCES regulatory_requirements(id),
  service_desc_id TEXT NOT NULL REFERENCES service_descriptions(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  coverage_level TEXT NOT NULL DEFAULT 'none',
  evidence_notes TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  maturity_level TEXT,
  last_verified TEXT,
  verified_by TEXT,
  PRIMARY KEY (requirement_id, service_desc_id)
);

-- asset_regulatory_flags
CREATE TABLE IF NOT EXISTS asset_regulatory_flags (
  asset_id TEXT NOT NULL REFERENCES assets(id),
  framework_id TEXT NOT NULL REFERENCES regulatory_frameworks(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  reason TEXT,
  flagged_at TEXT NOT NULL,
  flagged_by TEXT NOT NULL,
  PRIMARY KEY (asset_id, framework_id)
);

-- monitoring_sources
CREATE TABLE IF NOT EXISTS monitoring_sources (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  webhook_secret TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- monitoring_events
CREATE TABLE IF NOT EXISTS monitoring_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  source_id TEXT NOT NULL REFERENCES monitoring_sources(id),
  external_id TEXT,
  hostname TEXT NOT NULL,
  service_name TEXT,
  state TEXT NOT NULL,
  output TEXT,
  matched_asset_id TEXT REFERENCES assets(id),
  ticket_id TEXT REFERENCES tickets(id),
  processed INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL,
  processed_at TEXT
);

-- email_inbound_configs
CREATE TABLE IF NOT EXISTS email_inbound_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  target_group_id TEXT REFERENCES assignee_groups(id),
  default_ticket_type TEXT NOT NULL DEFAULT 'incident',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- email_messages
CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  config_id TEXT NOT NULL REFERENCES email_inbound_configs(id),
  message_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  headers TEXT NOT NULL DEFAULT '{}',
  ticket_id TEXT REFERENCES tickets(id),
  is_reply INTEGER NOT NULL DEFAULT 0,
  thread_reference TEXT,
  processed INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL,
  processed_at TEXT
);

-- kb_articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'draft',
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE(tenant_id, slug)
);

-- kb_article_links
CREATE TABLE IF NOT EXISTS kb_article_links (
  article_id TEXT NOT NULL REFERENCES kb_articles(id),
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  PRIMARY KEY (article_id, ticket_id)
);

-- sla_definitions
CREATE TABLE IF NOT EXISTS sla_definitions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  response_time_minutes INTEGER NOT NULL,
  resolution_time_minutes INTEGER NOT NULL,
  business_hours TEXT NOT NULL DEFAULT '24/7',
  business_hours_start TEXT,
  business_hours_end TEXT,
  business_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
  priority_overrides TEXT NOT NULL DEFAULT '{}',
  rpo_minutes INTEGER,
  rto_minutes INTEGER,
  service_window TEXT DEFAULT '{}',
  escalation_matrix TEXT DEFAULT '[]',
  availability_pct TEXT,
  support_level TEXT,
  recovery_class TEXT,
  business_criticality TEXT,
  penalty_clause TEXT,
  contract_reference TEXT,
  valid_from TEXT,
  valid_until TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- sla_assignments
CREATE TABLE IF NOT EXISTS sla_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  sla_definition_id TEXT NOT NULL REFERENCES sla_definitions(id),
  service_id TEXT REFERENCES service_descriptions(id),
  customer_id TEXT REFERENCES customers(id),
  asset_id TEXT REFERENCES assets(id),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, sla_definition_id, service_id, customer_id, asset_id)
);

-- service_profiles (Evo-2A)
CREATE TABLE IF NOT EXISTS service_profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  dimensions TEXT NOT NULL DEFAULT '{}',
  sla_definition_id TEXT REFERENCES sla_definitions(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, name)
);

-- service_entitlements (Evo-2A)
CREATE TABLE IF NOT EXISTS service_entitlements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  service_id TEXT NOT NULL REFERENCES service_descriptions(id),
  profile_id TEXT REFERENCES service_profiles(id),
  scope TEXT NOT NULL DEFAULT '{}',
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  created_at TEXT NOT NULL
);

-- known_errors (KEDB)
CREATE TABLE IF NOT EXISTS known_errors (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL,
  symptom TEXT NOT NULL,
  workaround TEXT,
  root_cause TEXT,
  status TEXT NOT NULL DEFAULT 'identified',
  problem_id TEXT REFERENCES tickets(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- escalation_rules
CREATE TABLE IF NOT EXISTS escalation_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  ticket_type TEXT,
  priority TEXT,
  sla_threshold_pct INTEGER NOT NULL DEFAULT 80,
  target_group_id TEXT NOT NULL REFERENCES assignee_groups(id),
  escalation_level INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

-- system_settings (NO tenant_id - global)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT,
  updated_by TEXT
);

-- Create important indexes
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_type ON tickets(tenant_id, ticket_type);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_group ON tickets(tenant_id, assignee_group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_parent ON tickets(tenant_id, parent_ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(tenant_id, ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(tenant_id, ticket_id);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_type ON assets(tenant_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_status ON assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON user_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_sladef_tenant ON sla_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slaassign_tenant ON sla_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slaassign_tenant_asset ON sla_assignments(tenant_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_slaassign_tenant_customer ON sla_assignments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_slaassign_tenant_service ON sla_assignments(tenant_id, service_id);
CREATE INDEX IF NOT EXISTS idx_ke_tenant ON known_errors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ke_tenant_status ON known_errors(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ke_tenant_problem ON known_errors(tenant_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_np_tenant ON notification_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_np_tenant_user ON notification_preferences(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_np_tenant_user_event ON notification_preferences(tenant_id, user_id, event_type, channel);
CREATE INDEX IF NOT EXISTS idx_esc_tenant ON escalation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_esc_tenant_active ON escalation_rules(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_event ON audit_logs(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_resource ON audit_logs(tenant_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_actor ON audit_logs(tenant_id, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at);

-- Evo indexes
CREATE INDEX IF NOT EXISTS idx_asset_types_tenant ON asset_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_types_tenant_category ON asset_types(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_relation_types_tenant ON relation_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classification_models_tenant ON classification_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classification_values_model ON classification_values(model_id);
CREATE INDEX IF NOT EXISTS idx_asset_classifications_asset ON asset_classifications(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_classifications_tenant ON asset_classifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capacity_types_tenant ON capacity_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_capacities_asset ON asset_capacities(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_capacities_tenant ON asset_capacities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_relations_temporal ON asset_relations(tenant_id, valid_from, valid_until);

-- projects (Evo-2C: Project Structures)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  customer_id TEXT REFERENCES customers(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, code)
);

-- project_assets (Evo-2C)
CREATE TABLE IF NOT EXISTS project_assets (
  project_id TEXT NOT NULL REFERENCES projects(id),
  asset_id TEXT NOT NULL REFERENCES assets(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  role TEXT,
  added_at TEXT NOT NULL,
  UNIQUE(project_id, asset_id)
);

-- compliance_controls (Evo-4A: Compliance Controls)
CREATE TABLE IF NOT EXISTS compliance_controls (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  control_type TEXT NOT NULL DEFAULT 'preventive',
  status TEXT NOT NULL DEFAULT 'planned',
  owner_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, code)
);

-- requirement_control_mappings (Evo-4A: Cross-Framework Mapping)
CREATE TABLE IF NOT EXISTS requirement_control_mappings (
  requirement_id TEXT NOT NULL REFERENCES regulatory_requirements(id),
  control_id TEXT NOT NULL REFERENCES compliance_controls(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  coverage TEXT NOT NULL DEFAULT 'full',
  notes TEXT,
  UNIQUE(requirement_id, control_id)
);

-- compliance_audits (Evo-4B: Audit Tracking)
CREATE TABLE IF NOT EXISTS compliance_audits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  framework_id TEXT REFERENCES regulatory_frameworks(id),
  audit_type TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'planned',
  auditor TEXT,
  start_date TEXT,
  end_date TEXT,
  scope TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- audit_findings (Evo-4B: Audit Tracking)
CREATE TABLE IF NOT EXISTS audit_findings (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES compliance_audits(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  control_id TEXT REFERENCES compliance_controls(id),
  requirement_id TEXT REFERENCES regulatory_requirements(id),
  severity TEXT NOT NULL DEFAULT 'minor',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  remediation_plan TEXT,
  due_date TEXT,
  resolved_at TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- compliance_evidence (Evo-4C: Granular Coverage & Evidence)
CREATE TABLE IF NOT EXISTS compliance_evidence (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  control_id TEXT NOT NULL REFERENCES compliance_controls(id),
  evidence_type TEXT NOT NULL DEFAULT 'document',
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  uploaded_at TEXT NOT NULL,
  uploaded_by TEXT
);

-- service_scope_items (REQ-2.2c: Structured scope per service)
CREATE TABLE IF NOT EXISTS service_scope_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  service_id TEXT NOT NULL REFERENCES service_descriptions(id),
  item_description TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'included',
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ─── Feedback Board (global, no tenant_id) ────────────────────
CREATE TABLE IF NOT EXISTS feedback_entries (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'feedback',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cc_tenant ON compliance_controls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cc_tenant_status ON compliance_controls(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cc_tenant_category ON compliance_controls(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_rcm_tenant ON requirement_control_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcm_control ON requirement_control_mappings(control_id);
CREATE INDEX IF NOT EXISTS idx_rcm_requirement ON requirement_control_mappings(requirement_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_customer ON projects(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_project ON project_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_asset ON project_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_tenant ON project_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_project ON tickets(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_svcprofile_tenant ON service_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_svcent_tenant ON service_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_svcent_customer ON service_entitlements(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_svcent_service ON service_entitlements(tenant_id, service_id);
CREATE INDEX IF NOT EXISTS idx_ca_tenant ON compliance_audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ca_tenant_status ON compliance_audits(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ca_tenant_framework ON compliance_audits(tenant_id, framework_id);
CREATE INDEX IF NOT EXISTS idx_af_tenant ON audit_findings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_af_audit ON audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_af_tenant_status ON audit_findings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_af_tenant_severity ON audit_findings(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_ce_tenant ON compliance_evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ce_control ON compliance_evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_ce_tenant_type ON compliance_evidence(tenant_id, evidence_type);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_ata_tenant ON asset_tenant_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ata_asset ON asset_tenant_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_ssi_tenant_service ON service_scope_items(tenant_id, service_id);
CREATE INDEX IF NOT EXISTS idx_ssi_service_type ON service_scope_items(service_id, scope_type);
`;

/**
 * Evo migration SQL — safe ALTER TABLE statements for existing databases.
 * Each statement is wrapped in a try/catch so duplicate columns don't fail.
 */
export const EVO_MIGRATIONS_SQL = [
  `ALTER TABLE asset_relations ADD COLUMN valid_from TEXT`,
  `ALTER TABLE asset_relations ADD COLUMN valid_until TEXT`,
  `ALTER TABLE asset_relations ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'`,
  `ALTER TABLE tickets ADD COLUMN project_id TEXT REFERENCES projects(id)`,
  `ALTER TABLE sla_definitions ADD COLUMN rpo_minutes INTEGER`,
  `ALTER TABLE sla_definitions ADD COLUMN rto_minutes INTEGER`,
  `ALTER TABLE sla_definitions ADD COLUMN service_window TEXT DEFAULT '{}'`,
  `ALTER TABLE sla_definitions ADD COLUMN escalation_matrix TEXT DEFAULT '[]'`,
  `ALTER TABLE requirement_service_mappings ADD COLUMN maturity_level TEXT`,
  `ALTER TABLE requirement_service_mappings ADD COLUMN last_verified TEXT`,
  `ALTER TABLE requirement_service_mappings ADD COLUMN verified_by TEXT`,
  `ALTER TABLE audit_logs ADD COLUMN integrity_hash TEXT`,
  `ALTER TABLE sla_definitions ADD COLUMN availability_pct TEXT`,
  `ALTER TABLE sla_definitions ADD COLUMN support_level TEXT`,
  `ALTER TABLE sla_definitions ADD COLUMN recovery_class TEXT`,
  `ALTER TABLE sla_definitions ADD COLUMN business_criticality TEXT`,
  `ALTER TABLE sla_definitions ADD COLUMN penalty_clause TEXT`,
  `ALTER TABLE sla_definitions ADD COLUMN contract_reference TEXT`,
  `ALTER TABLE sla_definitions ADD COLUMN valid_from TEXT`,
  `ALTER TABLE sla_definitions ADD COLUMN valid_until TEXT`,
];

// CLI entry point: only runs when executed directly (not when imported)
const isDirectExecution = process.argv[1]?.includes('setup');
if (isDirectExecution) {
  (async () => {
    logger.info('Initializing database');
    await initDatabase();
    const db = getDb() as TypedDb;

    logger.info('Creating tables');
    const statements = TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      const dbRecord = db as unknown as Record<string, unknown>;
      if (typeof dbRecord.run === 'function') {
        (dbRecord.run as (query: ReturnType<typeof sql.raw>) => void)(sql.raw(stmt));
      } else {
        await (dbRecord.execute as (query: ReturnType<typeof sql.raw>) => Promise<unknown>)(sql.raw(stmt));
      }
    }

    logger.info({ count: statements.length }, 'Created objects (tables + indexes)');
    process.exit(0);
  })().catch(err => {
    logger.fatal({ err }, 'Setup failed');
    process.exit(1);
  });
}
