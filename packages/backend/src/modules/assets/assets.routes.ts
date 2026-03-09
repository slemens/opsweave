import { Router } from 'express';

import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  assetFilterSchema,
  createAssetSchema,
  updateAssetSchema,
  createAssetRelationSchema,
} from '@opsweave/shared';

import {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetRelations,
  createAssetRelation,
  deleteAssetRelation,
  getAssetStats,
  getFullAssetGraph,
  getAssetGraph,
  getAssetTickets,
} from './assets.controller.js';

const assetRouter = Router();

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
  deleteAssetRelation,
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

export { assetRouter };
