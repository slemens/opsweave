// =============================================================================
// OpsWeave — Shared Constants
// =============================================================================
// All constant arrays use `as const` for literal type inference.
// =============================================================================

// ---------------------------------------------------------------------------
// Ticket Constants
// ---------------------------------------------------------------------------

export const TICKET_TYPES = ['incident', 'problem', 'change'] as const;
export type TicketTypeConst = (typeof TICKET_TYPES)[number];

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed',
] as const;
export type TicketStatusConst = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type TicketPriorityConst = (typeof TICKET_PRIORITIES)[number];

export const TICKET_IMPACTS = ['critical', 'high', 'medium', 'low'] as const;
export type TicketImpactConst = (typeof TICKET_IMPACTS)[number];

export const TICKET_URGENCIES = ['critical', 'high', 'medium', 'low'] as const;
export type TicketUrgencyConst = (typeof TICKET_URGENCIES)[number];

export const TICKET_SOURCES = [
  'manual',
  'email',
  'monitoring',
  'api',
  'portal',
] as const;
export type TicketSourceConst = (typeof TICKET_SOURCES)[number];

export const TICKET_SUBTYPES = [
  'standard',
  'emergency',
  'normal',
  'major',
  'minor',
] as const;
export type TicketSubtypeConst = (typeof TICKET_SUBTYPES)[number];

// ---------------------------------------------------------------------------
// Asset Constants
// ---------------------------------------------------------------------------

export const ASSET_TYPES = [
  'server_physical',
  'server_virtual',
  'network_switch',
  'network_router',
  'network_firewall',
  'storage',
  'database',
  'application',
  'service',
  'cluster',
  'load_balancer',
  'other',
] as const;
export type AssetTypeConst = (typeof ASSET_TYPES)[number];

export const ASSET_STATUSES = [
  'active',
  'inactive',
  'maintenance',
  'decommissioned',
] as const;
export type AssetStatusConst = (typeof ASSET_STATUSES)[number];

// ---------------------------------------------------------------------------
// SLA & Environment
// ---------------------------------------------------------------------------

export const SLA_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'none'] as const;
export type SlaTierConst = (typeof SLA_TIERS)[number];

export const ENVIRONMENTS = [
  'production',
  'staging',
  'development',
  'test',
  'dr',
] as const;
export type EnvironmentConst = (typeof ENVIRONMENTS)[number];

// ---------------------------------------------------------------------------
// Relation Types (Asset DAG)
// ---------------------------------------------------------------------------

export const RELATION_TYPES = [
  'runs_on',
  'connected_to',
  'stored_on',
  'powered_by',
  'member_of',
  'depends_on',
  'backup_of',
] as const;
export type RelationTypeConst = (typeof RELATION_TYPES)[number];

// ---------------------------------------------------------------------------
// User & Group Constants
// ---------------------------------------------------------------------------

export const USER_ROLES = ['admin', 'manager', 'agent', 'viewer'] as const;
export type UserRoleConst = (typeof USER_ROLES)[number];

export const AUTH_PROVIDERS = ['local', 'oidc'] as const;
export type AuthProviderConst = (typeof AUTH_PROVIDERS)[number];

export const GROUP_TYPES = [
  'support',
  'operations',
  'development',
  'management',
  'other',
] as const;
export type GroupTypeConst = (typeof GROUP_TYPES)[number];

export const GROUP_MEMBER_ROLES = ['member', 'lead'] as const;
export type GroupMemberRoleConst = (typeof GROUP_MEMBER_ROLES)[number];

// ---------------------------------------------------------------------------
// Workflow Constants
// ---------------------------------------------------------------------------

export const WORKFLOW_TRIGGER_TYPES = [
  'ticket_created',
  'ticket_updated',
  'manual',
] as const;
export type WorkflowTriggerTypeConst = (typeof WORKFLOW_TRIGGER_TYPES)[number];

export const WORKFLOW_STEP_TYPES = [
  'form',
  'routing',
  'approval',
  'condition',
  'automatic',
] as const;
export type WorkflowStepTypeConst = (typeof WORKFLOW_STEP_TYPES)[number];

export const WORKFLOW_INSTANCE_STATUSES = [
  'active',
  'completed',
  'cancelled',
  'failed',
] as const;
export type WorkflowInstanceStatusConst = (typeof WORKFLOW_INSTANCE_STATUSES)[number];

export const WORKFLOW_STEP_INSTANCE_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'failed',
] as const;
export type WorkflowStepInstanceStatusConst =
  (typeof WORKFLOW_STEP_INSTANCE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Service Catalog Constants
// ---------------------------------------------------------------------------

export const SERVICE_DESCRIPTION_STATUSES = [
  'draft',
  'published',
  'archived',
] as const;
export type ServiceDescriptionStatusConst =
  (typeof SERVICE_DESCRIPTION_STATUSES)[number];

export const CATALOG_STATUSES = ['active', 'inactive', 'draft'] as const;
export type CatalogStatusConst = (typeof CATALOG_STATUSES)[number];

export const OVERRIDE_TYPES = ['replace', 'extend', 'restrict'] as const;
export type OverrideTypeConst = (typeof OVERRIDE_TYPES)[number];

// ---------------------------------------------------------------------------
// Compliance Constants
// ---------------------------------------------------------------------------

export const COVERAGE_LEVELS = [
  'full',
  'partial',
  'none',
  'not_applicable',
] as const;
export type CoverageLevelConst = (typeof COVERAGE_LEVELS)[number];

// ---------------------------------------------------------------------------
// Monitoring Constants
// ---------------------------------------------------------------------------

export const MONITORING_SOURCE_TYPES = [
  'checkmk_v1',
  'checkmk_v2',
  'zabbix',
  'prometheus',
  'nagios',
  'other',
] as const;
export type MonitoringSourceTypeConst = (typeof MONITORING_SOURCE_TYPES)[number];

export const MONITORING_STATES = ['ok', 'warning', 'critical', 'unknown'] as const;
export type MonitoringStateConst = (typeof MONITORING_STATES)[number];

// ---------------------------------------------------------------------------
// E-Mail Constants
// ---------------------------------------------------------------------------

export const EMAIL_PROVIDERS = [
  'imap',
  'webhook_mailgun',
  'webhook_sendgrid',
  'smtp_gateway',
] as const;
export type EmailProviderConst = (typeof EMAIL_PROVIDERS)[number];

// ---------------------------------------------------------------------------
// Knowledge Base Constants
// ---------------------------------------------------------------------------

export const KB_VISIBILITIES = ['internal', 'public'] as const;
export type KbVisibilityConst = (typeof KB_VISIBILITIES)[number];

export const KB_ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;
export type KbArticleStatusConst = (typeof KB_ARTICLE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Comment Constants
// ---------------------------------------------------------------------------

export const COMMENT_SOURCES = ['agent', 'customer', 'email', 'system'] as const;
export type CommentSourceConst = (typeof COMMENT_SOURCES)[number];

// ---------------------------------------------------------------------------
// Supported Languages
// ---------------------------------------------------------------------------

export const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'de';

// ---------------------------------------------------------------------------
// Community Edition Limits
// ---------------------------------------------------------------------------

export const COMMUNITY_LIMITS = {
  maxAssets: 50,
  maxUsers: 5,
  maxWorkflows: 3,
  maxFrameworks: 1,
  maxMonitoringSources: 1,
} as const;

// ---------------------------------------------------------------------------
// Pagination Defaults
// ---------------------------------------------------------------------------

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 25,
  maxLimit: 100,
  defaultSort: 'created_at',
  defaultOrder: 'desc',
} as const;

// ---------------------------------------------------------------------------
// Ticket Number Prefixes
// ---------------------------------------------------------------------------

export const TICKET_NUMBER_PREFIXES: Record<string, string> = {
  incident: 'INC',
  problem: 'PRB',
  change: 'CHG',
} as const;
