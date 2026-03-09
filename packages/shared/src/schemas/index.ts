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
  source: z.enum(TICKET_SOURCES).default('manual'),
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
  sla_tier: z.enum(SLA_TIERS).nullable().optional(),
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
});

export type TicketFilterParams = z.infer<typeof ticketFilterSchema>;

// ---------------------------------------------------------------------------
// Asset Filter Schemas
// ---------------------------------------------------------------------------

export const assetFilterSchema = paginationSchema.extend({
  asset_type: z.enum(ASSET_TYPES).optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  sla_tier: z.enum(SLA_TIERS).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
  owner_group_id: uuidSchema.optional(),
  customer_id: uuidSchema.optional(),
});

export type AssetFilterParams = z.infer<typeof assetFilterSchema>;
