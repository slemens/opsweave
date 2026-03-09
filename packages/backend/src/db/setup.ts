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

const TABLES_SQL = `
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
  UNIQUE(tenant_id, source_asset_id, target_asset_id, relation_type)
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
  source TEXT NOT NULL DEFAULT 'manual',
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
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(tenant_id, ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(tenant_id, ticket_id);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_type ON assets(tenant_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_status ON assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON user_group_memberships(group_id);
`;

async function setup() {
  console.log('[setup] Initializing database...');
  await initDatabase();
  const db = getDb() as TypedDb;

  console.log('[setup] Creating tables...');
  const statements = TABLES_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    db.run(sql.raw(stmt));
  }

  console.log(`[setup] Created ${statements.length} objects (tables + indexes)`);
  console.log('[setup] Done!');
  process.exit(0);
}

setup().catch(err => {
  console.error('[setup] Failed:', err);
  process.exit(1);
});
