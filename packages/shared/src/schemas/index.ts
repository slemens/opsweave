// =============================================================================
// OpsWeave — Zod Validation Schemas
// =============================================================================
// Used for request validation at API boundaries (backend) and form validation
// (frontend). Schemas define the shape of incoming data.
// =============================================================================

import { z } from 'zod';
import {
  TICKET_TYPES,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_IMPACTS,
  TICKET_URGENCIES,
  TICKET_SOURCES,
  TICKET_SUBTYPES,
  ASSET_TYPES,
  ASSET_STATUSES,
  SLA_TIERS,
  ENVIRONMENTS,
  RELATION_TYPES,
  USER_ROLES,
  GROUP_TYPES,
  SUPPORTED_LANGUAGES,
  PAGINATION_DEFAULTS,
  COMMENT_SOURCES,
  WORKFLOW_TRIGGER_TYPES,
  WORKFLOW_STEP_TYPES,
  SERVICE_DESCRIPTION_STATUSES,
  CATALOG_STATUSES,
  OVERRIDE_TYPES,
  COVERAGE_LEVELS,
  EMAIL_PROVIDERS,
  KB_VISIBILITIES,
  KB_ARTICLE_STATUSES,
  CHANGE_RISK_LEVELS,
  CHANGE_RISK_LIKELIHOODS,
  CHANGE_RISK_IMPACTS,
} from '../constants/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validates a UUID v4 string */
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z.string().regex(uuidPattern, 'Invalid UUID format');

/** Validates a UUID parameter (route param) */
export const idParamSchema = z.object({
  id: uuidSchema,
});

/** Validates two UUID parameters: id + ticketId (used for KB link/unlink routes) */
export const idAndTicketIdParamSchema = z.object({
  id: uuidSchema,
  ticketId: uuidSchema,
});

// ---------------------------------------------------------------------------
// Pagination & List Params
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(PAGINATION_DEFAULTS.page),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_DEFAULTS.maxLimit)
    .default(PAGINATION_DEFAULTS.limit),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().max(500).optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ---------------------------------------------------------------------------
// Auth Schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const switchTenantSchema = z.object({
  tenant_id: uuidSchema,
});

export type SwitchTenantInput = z.infer<typeof switchTenantSchema>;

// ---------------------------------------------------------------------------
// Tenant Schemas
// ---------------------------------------------------------------------------

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens',
    ),
  settings: z.record(z.unknown()).default({}),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  settings: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const addTenantMemberSchema = z.object({
  user_id: uuidSchema,
  role: z.enum(USER_ROLES).default('viewer'),
});

export type AddTenantMemberInput = z.infer<typeof addTenantMemberSchema>;

// ---------------------------------------------------------------------------
// User Schemas
// ---------------------------------------------------------------------------

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  display_name: z.string().min(1, 'Display name is required').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .optional(),
  language: z.enum(SUPPORTED_LANGUAGES).default('de'),
  role: z.enum(USER_ROLES).default('agent'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateLanguageSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
});

export type UpdateLanguageInput = z.infer<typeof updateLanguageSchema>;

// ---------------------------------------------------------------------------
// Group Schemas
// ---------------------------------------------------------------------------

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).nullable().default(null),
  group_type: z.enum(GROUP_TYPES).default('support'),
  parent_group_id: uuidSchema.nullable().default(null),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  group_type: z.enum(GROUP_TYPES).optional(),
  parent_group_id: uuidSchema.nullable().optional(),
});

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const addGroupMemberSchema = z.object({
  user_id: uuidSchema,
  role_in_group: z.enum(['member', 'lead']).default('member'),
});

export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;

// ---------------------------------------------------------------------------
// Ticket Schemas
// ---------------------------------------------------------------------------

export const createTicketSchema = z.object({
  ticket_type: z.enum(TICKET_TYPES),
  subtype: z.enum(TICKET_SUBTYPES).nullable().default(null),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().min(1, 'Description is required').max(50000),
  priority: z.enum(TICKET_PRIORITIES).default('medium'),
  impact: z.enum(TICKET_IMPACTS).nullable().default(null),
  urgency: z.enum(TICKET_URGENCIES).nullable().default(null),
  asset_id: uuidSchema.nullable().default(null),
  assignee_id: uuidSchema.nullable().default(null),
  assignee_group_id: uuidSchema.nullable().default(null),
  customer_id: uuidSchema.nullable().default(null),
  category_id: uuidSchema.nullable().default(null),
  parent_ticket_id: uuidSchema.nullable().default(null),
  source: z.enum(TICKET_SOURCES).default('manual'),
  root_cause: z.string().max(50000).nullable().default(null),
  // Change-specific RFC fields
  change_justification: z.string().max(50000).nullable().default(null),
  change_risk_level: z.enum(CHANGE_RISK_LEVELS).nullable().default(null),
  change_risk_likelihood: z.enum(CHANGE_RISK_LIKELIHOODS).nullable().default(null),
  change_risk_impact: z.enum(CHANGE_RISK_IMPACTS).nullable().default(null),
  change_implementation: z.string().max(50000).nullable().default(null),
  change_rollback_plan: z.string().max(50000).nullable().default(null),
  change_planned_start: z.string().nullable().default(null),
  change_planned_end: z.string().nullable().default(null),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).max(50000).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  impact: z.enum(TICKET_IMPACTS).nullable().optional(),
  urgency: z.enum(TICKET_URGENCIES).nullable().optional(),
  subtype: z.enum(TICKET_SUBTYPES).nullable().optional(),
  asset_id: uuidSchema.nullable().optional(),
  assignee_id: uuidSchema.nullable().optional(),
  assignee_group_id: uuidSchema.nullable().optional(),
  customer_id: uuidSchema.nullable().optional(),
  category_id: uuidSchema.nullable().optional(),
  parent_ticket_id: uuidSchema.nullable().optional(),
  sla_tier: z.enum(SLA_TIERS).nullable().optional(),
  root_cause: z.string().max(50000).nullable().optional(),
  known_error_id: uuidSchema.nullable().optional(),
  // Change-specific RFC fields
  change_justification: z.string().max(50000).nullable().optional(),
  change_risk_level: z.enum(CHANGE_RISK_LEVELS).nullable().optional(),
  change_risk_likelihood: z.enum(CHANGE_RISK_LIKELIHOODS).nullable().optional(),
  change_risk_impact: z.enum(CHANGE_RISK_IMPACTS).nullable().optional(),
  change_implementation: z.string().max(50000).nullable().optional(),
  change_rollback_plan: z.string().max(50000).nullable().optional(),
  change_planned_start: z.string().nullable().optional(),
  change_planned_end: z.string().nullable().optional(),
  change_actual_start: z.string().nullable().optional(),
  change_actual_end: z.string().nullable().optional(),
  incident_commander_id: uuidSchema.nullable().optional(),
  bridge_call_url: z.string().url().max(2000).nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const updateTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

export const assignTicketSchema = z.object({
  assignee_id: uuidSchema.nullable().default(null),
  assignee_group_id: uuidSchema.nullable().default(null),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

// ---------------------------------------------------------------------------
// Comment Schemas
// ---------------------------------------------------------------------------

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(50000),
  is_internal: z.boolean().default(false),
  source: z.enum(COMMENT_SOURCES).default('agent'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ---------------------------------------------------------------------------
// Asset Schemas
// ---------------------------------------------------------------------------

export const createAssetSchema = z.object({
  asset_type: z.enum(ASSET_TYPES),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255)
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
      'Name must start with alphanumeric and contain only alphanumeric, dots, hyphens, underscores',
    ),
  display_name: z.string().min(1, 'Display name is required').max(255),
  status: z.enum(ASSET_STATUSES).default('active'),
  ip_address: z
    .string()
    .max(45)
    .nullable()
    .default(null),
  location: z.string().max(500).nullable().default(null),
  sla_tier: z.enum(SLA_TIERS).default('none'),
  environment: z.enum(ENVIRONMENTS).nullable().default(null),
  owner_group_id: uuidSchema.nullable().default(null),
  customer_id: uuidSchema.nullable().default(null),
  attributes: z.record(z.unknown()).default({}),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = z.object({
  asset_type: z.enum(ASSET_TYPES).optional(),
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)
    .optional(),
  display_name: z.string().min(1).max(255).optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  ip_address: z.string().max(45).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  sla_tier: z.enum(SLA_TIERS).optional(),
  environment: z.enum(ENVIRONMENTS).nullable().optional(),
  owner_group_id: uuidSchema.nullable().optional(),
  customer_id: uuidSchema.nullable().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

// ---------------------------------------------------------------------------
// Asset Relation Schemas
// ---------------------------------------------------------------------------

export const createAssetRelationSchema = z
  .object({
    source_asset_id: uuidSchema,
    target_asset_id: uuidSchema,
    relation_type: z.enum(RELATION_TYPES),
    properties: z.record(z.unknown()).default({}),
  })
  .refine((data) => data.source_asset_id !== data.target_asset_id, {
    message: 'Source and target asset must be different',
    path: ['target_asset_id'],
  });

export type CreateAssetRelationInput = z.infer<typeof createAssetRelationSchema>;

// ---------------------------------------------------------------------------
// Ticket Filter Schemas
// ---------------------------------------------------------------------------

export const ticketFilterSchema = paginationSchema.extend({
  status: z.enum(TICKET_STATUSES).optional(),
  ticket_type: z.enum(TICKET_TYPES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignee_id: uuidSchema.optional(),
  assignee_group_id: uuidSchema.optional(),
  asset_id: uuidSchema.optional(),
  customer_id: uuidSchema.optional(),
  category_id: uuidSchema.optional(),
});

export type TicketFilterParams = z.infer<typeof ticketFilterSchema>;

// ---------------------------------------------------------------------------
// Asset Filter Schemas
// ---------------------------------------------------------------------------

export const assetFilterSchema = paginationSchema.extend({
  asset_type: z.enum(ASSET_TYPES).optional(),
  asset_types: z.string().optional(), // comma-separated asset types for category filtering
  status: z.enum(ASSET_STATUSES).optional(),
  sla_tier: z.enum(SLA_TIERS).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
  owner_group_id: uuidSchema.optional(),
  customer_id: uuidSchema.optional(),
});

export type AssetFilterParams = z.infer<typeof assetFilterSchema>;

// ---------------------------------------------------------------------------
// Workflow Schemas
// ---------------------------------------------------------------------------

export const createWorkflowTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).nullable().default(null),
  trigger_type: z.enum(WORKFLOW_TRIGGER_TYPES),
  trigger_subtype: z.enum(TICKET_TYPES).nullable().default(null),
  is_active: z.boolean().default(true),
});
export type CreateWorkflowTemplateInput = z.infer<typeof createWorkflowTemplateSchema>;

export const updateWorkflowTemplateSchema = createWorkflowTemplateSchema.partial();
export type UpdateWorkflowTemplateInput = z.infer<typeof updateWorkflowTemplateSchema>;

export const createWorkflowStepSchema = z.object({
  name: z.string().min(1).max(200),
  step_type: z.enum(WORKFLOW_STEP_TYPES),
  config: z.record(z.unknown()).default({}),
  timeout_hours: z.number().int().positive().nullable().default(null),
});
export type CreateWorkflowStepInput = z.infer<typeof createWorkflowStepSchema>;

export const reorderWorkflowStepsSchema = z.object({
  step_ids: z.array(z.string().min(1)).min(1),
});
export type ReorderWorkflowStepsInput = z.infer<typeof reorderWorkflowStepsSchema>;

export const instantiateWorkflowSchema = z.object({
  template_id: z.string().min(1),
  ticket_id: z.string().min(1),
});
export type InstantiateWorkflowInput = z.infer<typeof instantiateWorkflowSchema>;

export const completeWorkflowStepSchema = z.object({
  form_data: z.record(z.unknown()).default({}),
  next_step_id: z.string().nullable().default(null),
});
export type CompleteWorkflowStepInput = z.infer<typeof completeWorkflowStepSchema>;

export const workflowFilterSchema = paginationSchema.extend({
  is_active: z.enum(['true', 'false']).optional(),
  trigger_type: z.enum(WORKFLOW_TRIGGER_TYPES).optional(),
});
export type WorkflowFilterParams = z.infer<typeof workflowFilterSchema>;

// ---------------------------------------------------------------------------
// Service Catalog Schemas
// ---------------------------------------------------------------------------

export const createServiceDescriptionSchema = z.object({
  code: z.string().min(1).max(100).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores'),
  title: z.string().min(1).max(500),
  description: z.string().max(50000).default(''),
  scope_included: z.string().max(10000).nullable().default(null),
  scope_excluded: z.string().max(10000).nullable().default(null),
  compliance_tags: z.array(z.string()).default([]),
  status: z.enum(SERVICE_DESCRIPTION_STATUSES).default('draft'),
});
export type CreateServiceDescriptionInput = z.infer<typeof createServiceDescriptionSchema>;

export const updateServiceDescriptionSchema = createServiceDescriptionSchema.partial();
export type UpdateServiceDescriptionInput = z.infer<typeof updateServiceDescriptionSchema>;

export const createHorizontalCatalogSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(10000).nullable().default(null),
  status: z.enum(CATALOG_STATUSES).default('active'),
});
export type CreateHorizontalCatalogInput = z.infer<typeof createHorizontalCatalogSchema>;

export const updateHorizontalCatalogSchema = createHorizontalCatalogSchema.partial();
export type UpdateHorizontalCatalogInput = z.infer<typeof updateHorizontalCatalogSchema>;

export const addCatalogItemSchema = z.object({
  service_desc_id: uuidSchema,
});
export type AddCatalogItemInput = z.infer<typeof addCatalogItemSchema>;

export const createVerticalCatalogSchema = z.object({
  name: z.string().min(1).max(255),
  base_catalog_id: uuidSchema,
  customer_id: uuidSchema.nullable().default(null),
  industry: z.string().max(100).nullable().default(null),
  description: z.string().max(10000).nullable().default(null),
  status: z.enum(CATALOG_STATUSES).default('active'),
});
export type CreateVerticalCatalogInput = z.infer<typeof createVerticalCatalogSchema>;

export const updateVerticalCatalogSchema = createVerticalCatalogSchema.partial();
export type UpdateVerticalCatalogInput = z.infer<typeof updateVerticalCatalogSchema>;

export const addVerticalOverrideSchema = z.object({
  original_desc_id: uuidSchema,
  override_desc_id: uuidSchema,
  override_type: z.enum(OVERRIDE_TYPES),
  reason: z.string().max(1000).nullable().default(null),
});
export type AddVerticalOverrideInput = z.infer<typeof addVerticalOverrideSchema>;

export const serviceDescriptionFilterSchema = paginationSchema.extend({
  status: z.enum(SERVICE_DESCRIPTION_STATUSES).optional(),
  q: z.string().optional(),
});
export type ServiceDescriptionFilterParams = z.infer<typeof serviceDescriptionFilterSchema>;

export const catalogFilterSchema = paginationSchema.extend({
  status: z.enum(CATALOG_STATUSES).optional(),
});
export type CatalogFilterParams = z.infer<typeof catalogFilterSchema>;

// ---------------------------------------------------------------------------
// Compliance Schemas
// ---------------------------------------------------------------------------

export const createRegulatoryFrameworkSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().max(50).nullable().default(null),
  description: z.string().max(10000).nullable().default(null),
  effective_date: z.string().nullable().default(null),
});
export type CreateRegulatoryFrameworkInput = z.infer<typeof createRegulatoryFrameworkSchema>;

export const updateRegulatoryFrameworkSchema = createRegulatoryFrameworkSchema.partial();
export type UpdateRegulatoryFrameworkInput = z.infer<typeof updateRegulatoryFrameworkSchema>;

export const createRequirementSchema = z.object({
  code: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable().default(null),
  category: z.string().max(100).nullable().default(null),
});
export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;

export const updateRequirementSchema = createRequirementSchema.partial();
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;

export const upsertMappingSchema = z.object({
  coverage_level: z.enum(COVERAGE_LEVELS),
  evidence_notes: z.string().max(10000).nullable().default(null),
});
export type UpsertMappingInput = z.infer<typeof upsertMappingSchema>;

export const flagAssetSchema = z.object({
  asset_id: uuidSchema,
  reason: z.string().max(1000).nullable().default(null),
});
export type FlagAssetInput = z.infer<typeof flagAssetSchema>;

export const complianceFilterSchema = paginationSchema.extend({
  q: z.string().optional(),
});
export type ComplianceFilterParams = z.infer<typeof complianceFilterSchema>;

// ---------------------------------------------------------------------------
// Knowledge Base Schemas
// ---------------------------------------------------------------------------

export const createKbArticleSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens').optional(),
  content: z.string().default(''),
  category: z.string().max(100).nullable().default(null),
  tags: z.array(z.string().max(100)).default([]),
  visibility: z.enum(KB_VISIBILITIES).default('internal'),
  status: z.enum(KB_ARTICLE_STATUSES).default('draft'),
});
export type CreateKbArticleInput = z.infer<typeof createKbArticleSchema>;

export const updateKbArticleSchema = createKbArticleSchema.partial();
export type UpdateKbArticleInput = z.infer<typeof updateKbArticleSchema>;

export const kbFilterSchema = paginationSchema.extend({
  q: z.string().optional(),
  status: z.enum(KB_ARTICLE_STATUSES).optional(),
  visibility: z.enum(KB_VISIBILITIES).optional(),
  category: z.string().optional(),
  linked_ticket_id: z.string().uuid().optional(),
});
export type KbFilterParams = z.infer<typeof kbFilterSchema>;

// ---------------------------------------------------------------------------
// Email Inbound Schemas
// ---------------------------------------------------------------------------

export const createEmailConfigSchema = z.object({
  name: z.string().min(1).max(255),
  provider: z.enum(EMAIL_PROVIDERS),
  config: z.record(z.unknown()).default({}),
  target_group_id: uuidSchema.nullable().default(null),
  default_ticket_type: z.enum(TICKET_TYPES).default('incident'),
  is_active: z.boolean().default(true),
});
export type CreateEmailConfigInput = z.infer<typeof createEmailConfigSchema>;

export const updateEmailConfigSchema = createEmailConfigSchema.partial();
export type UpdateEmailConfigInput = z.infer<typeof updateEmailConfigSchema>;

export const emailFilterSchema = paginationSchema.extend({
  config_id: uuidSchema.optional(),
  processed: z.enum(['true', 'false']).optional(),
});
export type EmailFilterParams = z.infer<typeof emailFilterSchema>;

// ---------------------------------------------------------------------------
// Customer Portal Schemas
// ---------------------------------------------------------------------------

export const portalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
});
export type PortalLoginInput = z.infer<typeof portalLoginSchema>;

export const createPortalTicketSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(50000).default(''),
  ticket_type: z.enum(TICKET_TYPES).default('incident'),
  priority: z.enum(['critical', 'high', 'medium', 'low'] as const).default('medium'),
});
export type CreatePortalTicketInput = z.infer<typeof createPortalTicketSchema>;

export const createPortalCommentSchema = z.object({
  content: z.string().min(1).max(50000),
});
export type CreatePortalCommentInput = z.infer<typeof createPortalCommentSchema>;
