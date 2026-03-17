import { Router } from 'express';
import { z } from 'zod';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  assetFilterSchema,
  createAssetSchema,
  updateAssetSchema,
  createAssetRelationSchema,
  updateAssetRelationSchema,
  classifyAssetSchema,
} from '@opsweave/shared';

import {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetRelations,
  createAssetRelation,
  updateAssetRelation,
  deleteAssetRelation,
  getAssetStats,
  getFullAssetGraph,
  getAssetGraph,
  getAssetTickets,
  getAssetSlaChain,
  getAssetServices,
  getAssetCompliance,
  getAssetRelationHistory,
  getAssetCapacityHistory,
  getAssetHistory,
} from './assets.controller.js';
import {
  getAssetClassifications,
  classifyAsset,
  removeAssetClassification,
} from '../classifications/classifications.controller.js';
import {
  listAssetTenantAssignments,
  createAssetTenantAssignment,
  updateAssetTenantAssignment,
  removeAssetTenantAssignment,
} from './asset-tenant-assignments.controller.js';

const assetRouter = Router();

const assetRelationParamsSchema = z.object({
  id: z.string().uuid(),
  rid: z.string().uuid(),
});

const assetClassificationParamsSchema = z.object({
  id: z.string().uuid(),
  vid: z.string().uuid(),
});

// REQ-2.1 — Param schemas for tenant assignment routes
const assetTenantAssignmentParamsSchema = z.object({
  id: z.string().uuid(),
  aid: z.string().uuid(),
});

const createTenantAssignmentSchema = z.object({
  tenant_id: z.string().uuid(),
  assignment_type: z.enum(['dedicated', 'shared', 'inherited']),
  inherited_from_asset_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateTenantAssignmentSchema = z.object({
  assignment_type: z.enum(['dedicated', 'shared', 'inherited']).optional(),
  inherited_from_asset_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ─── Routes ─────────────────────────────────────────────

/**
 * GET /api/v1/assets
 * List assets with filtering and pagination.
 */
assetRouter.get(
  '/',
  validateQuery(assetFilterSchema),
  listAssets,
);

/**
 * POST /api/v1/assets
 * Create a new asset.
 */
assetRouter.post(
  '/',
  requireRole('admin', 'manager'),
  validate(createAssetSchema),
  createAsset,
);

/**
 * GET /api/v1/assets/stats
 * Get asset statistics.
 * IMPORTANT: must be before /:id to avoid matching 'stats' as an ID.
 */
assetRouter.get(
  '/stats',
  getAssetStats,
);

/**
 * GET /api/v1/assets/graph
 * Get full topology graph (all assets + all relations for this tenant).
 * IMPORTANT: must be before /:id to avoid routing conflicts.
 */
assetRouter.get(
  '/graph',
  getFullAssetGraph,
);

/**
 * GET /api/v1/assets/:id/graph
 * Get full connected component (BFS) graph centred on a given asset.
 * IMPORTANT: must be before /:id to avoid routing conflicts.
 */
assetRouter.get(
  '/:id/graph',
  validateParams(idParamSchema),
  getAssetGraph,
);

/**
 * GET /api/v1/assets/:id
 * Get a single asset.
 */
assetRouter.get(
  '/:id',
  validateParams(idParamSchema),
  getAsset,
);

/**
 * PUT /api/v1/assets/:id
 * Update an asset.
 */
assetRouter.put(
  '/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(updateAssetSchema),
  updateAsset,
);

/**
 * DELETE /api/v1/assets/:id
 * Delete an asset.
 */
assetRouter.delete(
  '/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  deleteAsset,
);

/**
 * GET /api/v1/assets/:id/relations
 * Get all relations for an asset.
 */
assetRouter.get(
  '/:id/relations',
  validateParams(idParamSchema),
  getAssetRelations,
);

/**
 * POST /api/v1/assets/:id/relations
 * Create a relation for an asset.
 */
assetRouter.post(
  '/:id/relations',
  validateParams(idParamSchema),
  validate(createAssetRelationSchema),
  createAssetRelation,
);

/**
 * DELETE /api/v1/assets/:id/relations/:rid
 * Delete a relation.
 */
assetRouter.delete(
  '/:id/relations/:rid',
  validateParams(assetRelationParamsSchema),
  deleteAssetRelation,
);

/**
 * PUT /api/v1/assets/:id/relations/:rid
 * Update a relation (properties, valid_from, valid_until, metadata).
 * REQ-3.2a: Edge Properties on Relations
 */
assetRouter.put(
  '/:id/relations/:rid',
  validateParams(assetRelationParamsSchema),
  validate(updateAssetRelationSchema),
  updateAssetRelation,
);

/**
 * GET /api/v1/assets/:id/tickets
 * Get tickets linked to an asset.
 */
assetRouter.get(
  '/:id/tickets',
  validateParams(idParamSchema),
  getAssetTickets,
);


/**
 * GET /api/v1/assets/:id/sla-chain
 * Get the SLA inheritance chain from this asset upward through the hierarchy.
 */
assetRouter.get(
  '/:id/sla-chain',
  validateParams(idParamSchema),
  getAssetSlaChain,
);

/**
 * GET /api/v1/assets/:id/services
 * Get services linked to this asset via vertical catalogs.
 */
assetRouter.get(
  '/:id/services',
  validateParams(idParamSchema),
  getAssetServices,
);

/**
 * GET /api/v1/assets/:id/compliance
 * Get regulatory/compliance flags for this asset.
 */
assetRouter.get(
  '/:id/compliance',
  validateParams(idParamSchema),
  getAssetCompliance,
);

// ─── REQ-3.3b — History Endpoints ────────────────────────

/**
 * GET /api/v1/assets/:id/relation-history
 * Get relation change history for an asset.
 */
assetRouter.get(
  '/:id/relation-history',
  validateParams(idParamSchema),
  getAssetRelationHistory,
);

/**
 * GET /api/v1/assets/:id/capacity-history
 * Get capacity change history for an asset.
 */
assetRouter.get(
  '/:id/capacity-history',
  validateParams(idParamSchema),
  getAssetCapacityHistory,
);

/**
 * GET /api/v1/assets/:id/history
 * Get field-level change history for an asset.
 */
assetRouter.get(
  '/:id/history',
  validateParams(idParamSchema),
  getAssetHistory,
);

// ─── Asset Classifications (Evo-1C) ─────────────────────

/**
 * GET /api/v1/assets/:id/classifications
 * Get all classifications for an asset.
 */
assetRouter.get(
  '/:id/classifications',
  validateParams(idParamSchema),
  getAssetClassifications,
);

/**
 * POST /api/v1/assets/:id/classifications
 * Classify an asset.
 */
assetRouter.post(
  '/:id/classifications',
  validateParams(idParamSchema),
  validate(classifyAssetSchema),
  classifyAsset,
);

/**
 * DELETE /api/v1/assets/:id/classifications/:vid
 * Remove a classification from an asset.
 */
assetRouter.delete(
  '/:id/classifications/:vid',
  validateParams(assetClassificationParamsSchema),
  removeAssetClassification,
);

// ─── Asset Tenant Assignments (REQ-2.1) ─────────────────

/**
 * GET /api/v1/assets/:id/tenant-assignments
 * List all tenant assignments for an asset.
 */
assetRouter.get(
  '/:id/tenant-assignments',
  validateParams(idParamSchema),
  listAssetTenantAssignments,
);

/**
 * POST /api/v1/assets/:id/tenant-assignments
 * Assign an asset to a tenant.
 */
assetRouter.post(
  '/:id/tenant-assignments',
  validateParams(idParamSchema),
  validate(createTenantAssignmentSchema),
  createAssetTenantAssignment,
);

/**
 * PUT /api/v1/assets/:id/tenant-assignments/:aid
 * Update a tenant assignment.
 */
assetRouter.put(
  '/:id/tenant-assignments/:aid',
  validateParams(assetTenantAssignmentParamsSchema),
  validate(updateTenantAssignmentSchema),
  updateAssetTenantAssignment,
);

/**
 * DELETE /api/v1/assets/:id/tenant-assignments/:aid
 * Remove a tenant assignment.
 */
assetRouter.delete(
  '/:id/tenant-assignments/:aid',
  validateParams(assetTenantAssignmentParamsSchema),
  removeAssetTenantAssignment,
);

export { assetRouter };
