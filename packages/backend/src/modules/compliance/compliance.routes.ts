import { Router } from 'express';

import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  complianceFilterSchema,
  createRegulatoryFrameworkSchema,
  updateRegulatoryFrameworkSchema,
  createRequirementSchema,
  updateRequirementSchema,
  upsertMappingSchema,
  flagAssetSchema,
} from '@opsweave/shared';

import {
  listFrameworks,
  getFramework,
  createFramework,
  updateFramework,
  deleteFramework,
  listRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  upsertMapping,
  deleteMapping,
  getMatrix,
  getFrameworkAssets,
  flagAsset,
  unflagAsset,
} from './compliance.controller.js';

const complianceRouter = Router();

// =============================================================================
// Regulatory Frameworks
// =============================================================================

/**
 * GET /api/v1/compliance/frameworks
 * List frameworks with pagination and optional search.
 */
complianceRouter.get(
  '/frameworks',
  validateQuery(complianceFilterSchema),
  listFrameworks,
);

/**
 * POST /api/v1/compliance/frameworks
 * Create a new regulatory framework.
 */
complianceRouter.post(
  '/frameworks',
  validate(createRegulatoryFrameworkSchema),
  createFramework,
);

/**
 * GET /api/v1/compliance/frameworks/:id
 * Get a single framework with its requirements.
 */
complianceRouter.get(
  '/frameworks/:id',
  validateParams(idParamSchema),
  getFramework,
);

/**
 * PUT /api/v1/compliance/frameworks/:id
 * Update a framework.
 */
complianceRouter.put(
  '/frameworks/:id',
  validateParams(idParamSchema),
  validate(updateRegulatoryFrameworkSchema),
  updateFramework,
);

/**
 * DELETE /api/v1/compliance/frameworks/:id
 * Delete a framework (fails if requirements exist).
 */
complianceRouter.delete(
  '/frameworks/:id',
  validateParams(idParamSchema),
  deleteFramework,
);

// =============================================================================
// Requirements
// =============================================================================

/**
 * GET /api/v1/compliance/frameworks/:id/requirements
 * List requirements for a framework.
 */
complianceRouter.get(
  '/frameworks/:id/requirements',
  validateParams(idParamSchema),
  validateQuery(complianceFilterSchema),
  listRequirements,
);

/**
 * POST /api/v1/compliance/frameworks/:id/requirements
 * Create a requirement under a framework.
 */
complianceRouter.post(
  '/frameworks/:id/requirements',
  validateParams(idParamSchema),
  validate(createRequirementSchema),
  createRequirement,
);

/**
 * PUT /api/v1/compliance/requirements/:rid
 * Update a requirement.
 */
complianceRouter.put(
  '/requirements/:rid',
  validate(updateRequirementSchema),
  updateRequirement,
);

/**
 * DELETE /api/v1/compliance/requirements/:rid
 * Delete a requirement (fails if mappings exist).
 */
complianceRouter.delete(
  '/requirements/:rid',
  deleteRequirement,
);

// =============================================================================
// Mappings (Requirement <-> Service Description)
// =============================================================================

/**
 * POST /api/v1/compliance/requirements/:rid/mappings/:sid
 * Upsert a mapping between a requirement and a service description.
 */
complianceRouter.post(
  '/requirements/:rid/mappings/:sid',
  validate(upsertMappingSchema),
  upsertMapping,
);

/**
 * DELETE /api/v1/compliance/requirements/:rid/mappings/:sid
 * Remove a mapping.
 */
complianceRouter.delete(
  '/requirements/:rid/mappings/:sid',
  deleteMapping,
);

// =============================================================================
// Compliance Matrix
// =============================================================================

/**
 * GET /api/v1/compliance/frameworks/:id/matrix
 * Get the full compliance matrix for a framework (requirements + all mappings).
 */
complianceRouter.get(
  '/frameworks/:id/matrix',
  validateParams(idParamSchema),
  getMatrix,
);

// =============================================================================
// Asset Regulatory Flags
// =============================================================================

/**
 * GET /api/v1/compliance/frameworks/:id/assets
 * Get all assets flagged for a framework.
 */
complianceRouter.get(
  '/frameworks/:id/assets',
  validateParams(idParamSchema),
  getFrameworkAssets,
);

/**
 * POST /api/v1/compliance/frameworks/:id/assets
 * Flag an asset as subject to a framework.
 */
complianceRouter.post(
  '/frameworks/:id/assets',
  validateParams(idParamSchema),
  validate(flagAssetSchema),
  flagAsset,
);

/**
 * DELETE /api/v1/compliance/frameworks/:id/assets/:aid
 * Remove a regulatory flag from an asset.
 */
complianceRouter.delete(
  '/frameworks/:id/assets/:aid',
  validateParams(idParamSchema),
  unflagAsset,
);

export { complianceRouter };
