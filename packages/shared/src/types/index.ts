// =============================================================================
// OpsWeave — Core Entity Types
// =============================================================================
// All entity IDs are string (UUIDs).
// All timestamps are string (ISO 8601).
// DB booleans use number (0 | 1); API booleans use boolean.
// No PostgreSQL ENUMs — all discriminated values are string unions.
// =============================================================================

// ---------------------------------------------------------------------------
// Multi-Tenant Foundation
// ---------------------------------------------------------------------------

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  license_key: string | null;
  is_active: number; // 0 | 1
  created_at: string;
  updated_at: string;
}

export type TenantRole = 'admin' | 'manager' | 'agent' | 'viewer';

export interface TenantUserMembership {
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  is_default: number; // 0 | 1
}

// ---------------------------------------------------------------------------
// Users & Groups
// ---------------------------------------------------------------------------

export type AuthProvider = 'local' | 'oidc';

/** Users have NO tenant_id — tenant association is via TenantUserMembership */
export interface User {
  id: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  auth_provider: AuthProvider;
  external_id: string | null;
  language: 'de' | 'en';
  is_active: number; // 0 | 1
  is_superadmin: number; // 0 | 1
  last_login: string | null;
  created_at: string;
}

export type GroupType = 'support' | 'operations' | 'development' | 'management' | 'other';

export interface AssigneeGroup {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  group_type: GroupType;
  parent_group_id: string | null;
  created_at: string;
}

export type GroupMemberRole = 'member' | 'lead';

export interface UserGroupMembership {
  user_id: string;
  group_id: string;
  tenant_id: string;
  role_in_group: GroupMemberRole;
}

// ---------------------------------------------------------------------------
// Assets & Relations (DAG)
// ---------------------------------------------------------------------------

/** Asset type is now a dynamic string loaded from the asset_types registry */
export type AssetType = string;

export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned';

export type SlaTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'none';

export type Environment = 'production' | 'staging' | 'development' | 'test' | 'dr';

export interface Asset {
  id: string;
  tenant_id: string;
  asset_type: string;
  name: string;
  display_name: string;
  status: AssetStatus;
  ip_address: string | null;
  location: string | null;
  sla_tier: SlaTier;
  environment: Environment | null;
  owner_group_id: string | null;
  customer_id: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

/** Relation type is now a dynamic string loaded from the relation_types registry */
export type RelationType = string;

export interface AssetRelation {
  id: string;
  tenant_id: string;
  source_asset_id: string;
  target_asset_id: string;
  relation_type: string;
  properties: Record<string, unknown>;
  valid_from: string | null;
  valid_until: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string;
}

// ---------------------------------------------------------------------------
// Extensible Type Registries (Evo-1A / Evo-3A)
// ---------------------------------------------------------------------------

export interface AttributeDefinition {
  key: string;
  label: { de: string; en: string };
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'url' | 'ip_address';
  required: boolean;
  default_value?: unknown;
  options?: Array<{ value: string; label: { de: string; en: string } }>;
  validation?: { min?: number; max?: number; pattern?: string };
  group?: string;
  sort_order: number;
}

export interface AssetTypeDefinition {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  color: string | null;
  is_system: number;
  is_active: number;
  attribute_schema: AttributeDefinition[];
  created_at: string;
  updated_at: string;
}

export interface RelationTypeDefinition {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  is_directional: number;
  source_types: string[];
  target_types: string[];
  properties_schema: AttributeDefinition[];
  capacity_mappings: CapacityMapping[];
  is_system: number;
  is_active: number;
  color: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Classification System (Evo-1C)
// ---------------------------------------------------------------------------

export interface ClassificationModel {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: number;
  is_active: number;
  created_at: string;
}

export interface ClassificationValue {
  id: string;
  model_id: string;
  value: string;
  label: { de: string; en: string };
  color: string | null;
  sort_order: number;
}

export interface AssetClassification {
  asset_id: string;
  value_id: string;
  tenant_id: string;
  justification: string | null;
  classified_by: string | null;
  classified_at: string;
}

// ---------------------------------------------------------------------------
// Capacity System (Evo-3C)
// ---------------------------------------------------------------------------

export interface CapacityType {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  unit: string;
  category: string | null;
  is_system: number;
  created_at: string;
}

export interface CapacityMapping {
  property_key: string;
  capacity_type_slug: string;
}

export interface AssetCapacity {
  id: string;
  asset_id: string;
  capacity_type_id: string;
  tenant_id: string;
  direction: 'provides' | 'consumes';
  total: number;
  allocated: number;
  reserved: number;
  source_relation_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export type TicketType = 'incident' | 'problem' | 'change';

export type TicketSubtype =
  | 'standard'
  | 'emergency'
  | 'normal'
  | 'major'
  | 'minor';

export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

export type TicketImpact = 'critical' | 'high' | 'medium' | 'low';

export type TicketUrgency = 'critical' | 'high' | 'medium' | 'low';

export type TicketSource = 'manual' | 'email' | 'monitoring' | 'api' | 'portal';

export interface Ticket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  ticket_type: TicketType;
  subtype: TicketSubtype | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  impact: TicketImpact | null;
  urgency: TicketUrgency | null;
  asset_id: string | null;
  assignee_id: string | null;
  assignee_group_id: string | null;
  reporter_id: string;
  customer_id: string | null;
  category_id: string | null;
  workflow_instance_id: string | null;
  current_step_id: string | null;
  sla_tier: SlaTier | null;
  sla_response_due: string | null;
  sla_resolve_due: string | null;
  project_id: string | null;
  parent_ticket_id: string | null;
  sla_breached: number; // 0 | 1
  sla_paused_at: string | null;
  sla_paused_total: number; // cumulative pause seconds
  root_cause: string | null; // only for problem tickets
  known_error_id: string | null; // FK → knownErrors, only for incidents
  // Change-specific RFC fields
  change_justification: string | null;
  change_risk_level: string | null;
  change_risk_likelihood: string | null;
  change_risk_impact: string | null;
  change_implementation: string | null;
  change_rollback_plan: string | null;
  change_planned_start: string | null;
  change_planned_end: string | null;
  change_actual_start: string | null;
  change_actual_end: string | null;
  // Major Incident & Escalation
  incident_commander_id: string | null;
  escalation_level: number;
  escalated_at: string | null;
  is_major_incident: number; // 0 | 1
  major_declared_at: string | null;
  major_declared_by: string | null;
  bridge_call_url: string | null;
  source: TicketSource;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  created_by: string;
}

export interface TicketCategory {
  id: string;
  tenant_id: string;
  name: string;
  applies_to: string; // 'incident'|'change'|'problem'|'all'
  is_active: number; // 0 | 1
  created_at: string;
}

export type CommentSource = 'agent' | 'customer' | 'email' | 'system';

export interface TicketComment {
  id: string;
  tenant_id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_internal: number; // 0 | 1
  source: CommentSource;
  created_at: string;
}

export interface TicketHistory {
  id: string;
  tenant_id: string;
  ticket_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
}

// ---------------------------------------------------------------------------
// Workflow Engine
// ---------------------------------------------------------------------------

export type WorkflowTriggerType = 'ticket_created' | 'ticket_updated' | 'manual';

export interface WorkflowTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  trigger_type: WorkflowTriggerType;
  trigger_subtype: TicketType | null;
  is_active: number; // 0 | 1
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type WorkflowStepType =
  | 'form'
  | 'routing'
  | 'approval'
  | 'condition'
  | 'automatic';

export interface WorkflowStep {
  id: string;
  template_id: string;
  name: string;
  step_order: number;
  step_type: WorkflowStepType;
  config: Record<string, unknown>;
  timeout_hours: number | null;
  next_step_id: string | null;
}

export type WorkflowInstanceStatus = 'active' | 'completed' | 'cancelled' | 'failed';

export interface WorkflowInstance {
  id: string;
  tenant_id: string;
  template_id: string;
  ticket_id: string;
  status: WorkflowInstanceStatus;
  started_at: string;
  completed_at: string | null;
}

export type WorkflowStepInstanceStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'failed';

export interface WorkflowStepInstance {
  id: string;
  instance_id: string;
  step_id: string;
  status: WorkflowStepInstanceStatus;
  assigned_to: string | null;
  assigned_group: string | null;
  form_data: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

// ---------------------------------------------------------------------------
// Service Catalog (3-Tier)
// ---------------------------------------------------------------------------

export type ServiceDescriptionStatus = 'draft' | 'published' | 'archived';

export interface ServiceDescription {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  description: string;
  scope_included: string | null;
  scope_excluded: string | null;
  compliance_tags: string[];
  version: number;
  status: ServiceDescriptionStatus;
  created_at: string;
  updated_at: string;
}

export type CatalogStatus = 'active' | 'inactive' | 'draft';

export interface HorizontalCatalog {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: CatalogStatus;
  created_at: string;
}

export interface HorizontalCatalogItem {
  catalog_id: string;
  service_desc_id: string;
}

export interface VerticalCatalog {
  id: string;
  tenant_id: string;
  name: string;
  base_catalog_id: string;
  customer_id: string | null;
  industry: string | null;
  description: string | null;
  status: CatalogStatus;
  created_at: string;
}

export type OverrideType = 'replace' | 'extend' | 'restrict';

export interface VerticalCatalogOverride {
  id: string;
  vertical_id: string;
  original_desc_id: string;
  override_desc_id: string;
  override_type: OverrideType;
  reason: string | null;
}

export interface AssetServiceLink {
  asset_id: string;
  vertical_id: string;
  tenant_id: string;
  effective_from: string;
  effective_until: string | null;
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export interface RegulatoryFramework {
  id: string;
  tenant_id: string;
  name: string;
  version: string | null;
  description: string | null;
  effective_date: string | null;
  created_at: string;
}

export interface RegulatoryRequirement {
  id: string;
  framework_id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

export type CoverageLevel = 'full' | 'partial' | 'none' | 'not_applicable';

export interface RequirementServiceMapping {
  requirement_id: string;
  service_desc_id: string;
  tenant_id: string;
  coverage_level: CoverageLevel;
  evidence_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface AssetRegulatoryFlag {
  asset_id: string;
  framework_id: string;
  tenant_id: string;
  reason: string | null;
  flagged_at: string;
  flagged_by: string;
}

// ---------------------------------------------------------------------------
// Compliance Controls (Evo-4A)
// ---------------------------------------------------------------------------

export type ControlType = 'preventive' | 'detective' | 'corrective';
export type ControlStatus = 'planned' | 'implemented' | 'verified' | 'not_applicable';
export type ControlCoverage = 'full' | 'partial' | 'planned';

export interface ComplianceControl {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  control_type: ControlType;
  status: ControlStatus;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementControlMapping {
  requirement_id: string;
  control_id: string;
  tenant_id: string;
  coverage: ControlCoverage;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Compliance Audits (Evo-4B)
// ---------------------------------------------------------------------------

export type AuditType = 'internal' | 'external' | 'certification';
export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type FindingSeverity = 'critical' | 'major' | 'minor' | 'observation';
export type FindingStatus = 'open' | 'in_remediation' | 'resolved' | 'accepted_risk';

export interface ComplianceAudit {
  id: string;
  tenant_id: string;
  name: string;
  framework_id: string | null;
  audit_type: AuditType;
  status: AuditStatus;
  auditor: string | null;
  start_date: string | null;
  end_date: string | null;
  scope: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditFinding {
  id: string;
  audit_id: string;
  tenant_id: string;
  control_id: string | null;
  requirement_id: string | null;
  severity: FindingSeverity;
  title: string;
  description: string | null;
  status: FindingStatus;
  remediation_plan: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Compliance Evidence (Evo-4C)
// ---------------------------------------------------------------------------

export type EvidenceType = 'document' | 'screenshot' | 'log' | 'report' | 'test_result';
export type MaturityLevel = 'initial' | 'managed' | 'defined' | 'measured' | 'optimizing';

export interface ComplianceEvidence {
  id: string;
  tenant_id: string;
  control_id: string;
  evidence_type: EvidenceType;
  title: string;
  url: string | null;
  description: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

// ---------------------------------------------------------------------------
// Monitoring
// ---------------------------------------------------------------------------

export type MonitoringSourceType =
  | 'checkmk_v1'
  | 'checkmk_v2'
  | 'zabbix'
  | 'prometheus'
  | 'nagios'
  | 'other';

export interface MonitoringSource {
  id: string;
  tenant_id: string;
  name: string;
  type: MonitoringSourceType;
  config: Record<string, unknown>;
  webhook_secret: string | null;
  is_active: number; // 0 | 1
  created_at: string;
}

export type MonitoringState = 'ok' | 'warning' | 'critical' | 'unknown';

export interface MonitoringEvent {
  id: string;
  tenant_id: string;
  source_id: string;
  external_id: string | null;
  hostname: string;
  service_name: string | null;
  state: MonitoringState;
  output: string | null;
  matched_asset_id: string | null;
  ticket_id: string | null;
  processed: number; // 0 | 1
  received_at: string;
  processed_at: string | null;
}

// ---------------------------------------------------------------------------
// E-Mail Inbound
// ---------------------------------------------------------------------------

export type EmailProvider = 'imap' | 'webhook_mailgun' | 'webhook_sendgrid' | 'smtp_gateway';

export interface EmailInboundConfig {
  id: string;
  tenant_id: string;
  name: string;
  provider: EmailProvider;
  config: Record<string, unknown>;
  target_group_id: string | null;
  default_ticket_type: TicketType;
  is_active: number; // 0 | 1
  created_at: string;
}

export interface EmailMessage {
  id: string;
  tenant_id: string;
  config_id: string;
  message_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  headers: Record<string, unknown>;
  ticket_id: string | null;
  is_reply: number; // 0 | 1
  thread_reference: string | null;
  processed: number; // 0 | 1
  received_at: string;
  processed_at: string | null;
}

// ---------------------------------------------------------------------------
// Knowledge Base
// ---------------------------------------------------------------------------

export type KbVisibility = 'internal' | 'public';
export type KbArticleStatus = 'draft' | 'published' | 'archived';

export interface KbArticle {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  tags: string[];
  visibility: KbVisibility;
  status: KbArticleStatus;
  author_id: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface KbArticleLink {
  article_id: string;
  ticket_id: string;
  tenant_id: string;
}

// ---------------------------------------------------------------------------
// Known Error Database (KEDB)
// ---------------------------------------------------------------------------

export type KnownErrorStatus = 'identified' | 'workaround_available' | 'resolved';

export interface KnownError {
  id: string;
  tenant_id: string;
  title: string;
  symptom: string;
  workaround: string | null;
  root_cause: string | null;
  status: KnownErrorStatus;
  problem_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Projects (Evo-2C)
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  name: string;
  code: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAsset {
  project_id: string;
  asset_id: string;
  tenant_id: string;
  role: string | null;
  added_at: string;
}

// ---------------------------------------------------------------------------
// Customers & Portal
// ---------------------------------------------------------------------------

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  industry: string | null;
  contact_email: string | null;
  is_active: number; // 0 | 1
  created_at: string;
}

/** Separate user table for portal customers — not the same as internal Users */
export interface CustomerPortalUser {
  id: string;
  tenant_id: string;
  customer_id: string;
  email: string;
  display_name: string;
  password_hash: string;
  is_active: number; // 0 | 1
  last_login: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

/** Global system settings — NO tenant_id */
export interface SystemSetting {
  key: string;
  value: unknown;
  updated_at: string | null;
  updated_by: string | null;
}

// ---------------------------------------------------------------------------
// Service Profiles & Entitlements (Evo-2A)
// ---------------------------------------------------------------------------

export interface ServiceProfile {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  dimensions: Record<string, unknown>;
  sla_definition_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceEntitlement {
  id: string;
  tenant_id: string;
  customer_id: string;
  service_id: string;
  profile_id: string | null;
  scope: Record<string, unknown>;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Projects (Evo-2C)
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  name: string;
  code: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAsset {
  project_id: string;
  asset_id: string;
  tenant_id: string;
  role: string | null;
  added_at: string;
}
