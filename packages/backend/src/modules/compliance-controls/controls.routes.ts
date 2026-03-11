import { Router } from 'express';

import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  createComplianceControlSchema,
  updateComplianceControlSchema,
  mapRequirementControlSchema,
  controlFilterSchema,
} from '@opsweave/shared';

import {
  listControls,
  getControl,
  createControl,
  updateControl,
  deleteControl,
  mapRequirementToControl,
  removeRequirementControlMapping,
  getCrossFrameworkMappings,
} from './controls.controller.js';

import {
  listEvidence,
  createEvidence,
  deleteEvidence,
} from './evidence.controller.js';

const controlRouter = Router();

// =============================================================================
// Controls CRUD
// =============================================================================

/**
 * GET /api/v1/compliance/controls
 * List compliance controls with optional status/category filter.
 */
controlRouter.get(
  '/',
  validateQuery(controlFilterSchema),
  listControls,
);

/**
 * POST /api/v1/compliance/controls
 * Create a new compliance control.
 */
controlRouter.post(
  '/',
  validate(createComplianceControlSchema),
  createControl,
);

/**
 * GET /api/v1/compliance/controls/:id
 * Get a single control with its requirement mappings.
 */
controlRouter.get(
  '/:id',
  validateParams(idParamSchema),
  getControl,
);

/**
 * PUT /api/v1/compliance/controls/:id
 * Update a compliance control.
 */
controlRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateComplianceControlSchema),
  updateControl,
);

/**
 * DELETE /api/v1/compliance/controls/:id
 * Delete a compliance control (must not have mappings).
 */
controlRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  deleteControl,
);

// =============================================================================
// Requirement-Control Mappings
// =============================================================================

/**
 * POST /api/v1/compliance/controls/mappings
 * Map a requirement to a control.
 */
controlRouter.post(
  '/mappings',
  validate(mapRequirementControlSchema),
  mapRequirementToControl,
);

/**
 * DELETE /api/v1/compliance/controls/mappings/:requirementId/:controlId
 * Remove a requirement-control mapping.
 */
controlRouter.delete(
  '/mappings/:requirementId/:controlId',
  removeRequirementControlMapping,
);

// =============================================================================
// Cross-Framework Mappings
// =============================================================================

/**
 * GET /api/v1/compliance/controls/:id/mappings
 * Get cross-framework mappings for a control.
 */
controlRouter.get(
  '/:id/mappings',
  validateParams(idParamSchema),
  getCrossFrameworkMappings,
);

// =============================================================================
// Evidence (per control)
// =============================================================================

/**
 * GET /api/v1/compliance/controls/:id/evidence
 * List evidence for a control.
 */
controlRouter.get(
  '/:id/evidence',
  validateParams(idParamSchema),
  listEvidence,
);

/**
 * POST /api/v1/compliance/controls/:id/evidence
 * Create evidence for a control.
 */
controlRouter.post(
  '/:id/evidence',
  validateParams(idParamSchema),
  createEvidence,
);

/**
 * DELETE /api/v1/compliance/controls/:evidenceId/evidence/:evidenceId
 * Delete evidence.
 */
controlRouter.delete(
  '/:id/evidence/:evidenceId',
  deleteEvidence,
);

export { controlRouter };
