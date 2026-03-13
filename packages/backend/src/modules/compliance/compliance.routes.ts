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
  createComplianceAuditSchema,
  updateComplianceAuditSchema,
  auditFilterSchema,
  createAuditFindingSchema,
  updateAuditFindingSchema,
  createComplianceEvidenceSchema,
  createCrossMappingSchema,
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
  listCrossMappings,
  createCrossMapping,
  deleteCrossMapping,
  getFrameworkCrossMappings,
  exportCrossMappingsCsv,
  importCrossMappingsCsv,
  getDashboard,
} from './compliance.controller.js';

import { controlRouter } from '../compliance-controls/controls.routes.js';

import {
  listAudits,
  getAudit,
  createAudit,
  updateAudit,
  deleteAudit,
  listFindings,
  createFinding,
  updateFinding,
  deleteFinding,
  exportAuditCsv,
  exportAuditJson,
} from '../compliance-controls/audits.controller.js';

import {
  listAllEvidence,
  listEvidence,
  createEvidence,
  deleteEvidence,
} from '../compliance-controls/evidence.controller.js';

const complianceRouter = Router();

// =============================================================================
// Compliance Controls (Evo-4A) — mounted at /api/v1/compliance/controls
// =============================================================================
complianceRouter.use('/controls', controlRouter);

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

// =============================================================================
// Compliance Audits (Evo-4B)
// =============================================================================

/**
 * GET /api/v1/compliance/audits
 * List compliance audits with optional filters.
 */
complianceRouter.get(
  '/audits',
  validateQuery(auditFilterSchema),
  listAudits,
);

/**
 * POST /api/v1/compliance/audits
 * Create a new compliance audit.
 */
complianceRouter.post(
  '/audits',
  validate(createComplianceAuditSchema),
  createAudit,
);

/**
 * GET /api/v1/compliance/audits/:id
 * Get a single audit with finding count.
 */
complianceRouter.get(
  '/audits/:id',
  validateParams(idParamSchema),
  getAudit,
);

/**
 * PUT /api/v1/compliance/audits/:id
 * Update a compliance audit.
 */
complianceRouter.put(
  '/audits/:id',
  validateParams(idParamSchema),
  validate(updateComplianceAuditSchema),
  updateAudit,
);

/**
 * DELETE /api/v1/compliance/audits/:id
 * Delete a compliance audit (must not have findings).
 */
complianceRouter.delete(
  '/audits/:id',
  validateParams(idParamSchema),
  deleteAudit,
);

// =============================================================================
// Audit Export
// =============================================================================

/**
 * GET /api/v1/compliance/audits/:id/export/csv
 * Export a single audit report as CSV.
 */
complianceRouter.get(
  '/audits/:id/export/csv',
  validateParams(idParamSchema),
  exportAuditCsv,
);

/**
 * GET /api/v1/compliance/audits/:id/export/json
 * Export a single audit report as JSON.
 */
complianceRouter.get(
  '/audits/:id/export/json',
  validateParams(idParamSchema),
  exportAuditJson,
);

// =============================================================================
// Audit Findings (Evo-4B)
// =============================================================================

/**
 * GET /api/v1/compliance/audits/:id/findings
 * List findings for an audit.
 */
complianceRouter.get(
  '/audits/:id/findings',
  validateParams(idParamSchema),
  listFindings,
);

/**
 * POST /api/v1/compliance/audits/:id/findings
 * Create a finding under an audit.
 */
complianceRouter.post(
  '/audits/:id/findings',
  validateParams(idParamSchema),
  validate(createAuditFindingSchema),
  createFinding,
);

/**
 * PUT /api/v1/compliance/findings/:id
 * Update a finding.
 */
complianceRouter.put(
  '/findings/:id',
  validateParams(idParamSchema),
  validate(updateAuditFindingSchema),
  updateFinding,
);

/**
 * DELETE /api/v1/compliance/findings/:id
 * Delete a finding.
 */
complianceRouter.delete(
  '/findings/:id',
  validateParams(idParamSchema),
  deleteFinding,
);

// =============================================================================
// Cross-Framework Requirement Mappings (Evo-4D: REQ-4.1)
// =============================================================================

/**
 * GET /api/v1/compliance/cross-mappings/export
 * Export all cross-mappings as CSV.
 */
complianceRouter.get(
  '/cross-mappings/export',
  exportCrossMappingsCsv,
);

/**
 * POST /api/v1/compliance/cross-mappings/import
 * Import cross-mappings from CSV.
 */
complianceRouter.post(
  '/cross-mappings/import',
  importCrossMappingsCsv,
);

/**
 * GET /api/v1/compliance/cross-mappings
 * List all cross-framework requirement mappings (optional ?requirement_id filter).
 */
complianceRouter.get(
  '/cross-mappings',
  listCrossMappings,
);

/**
 * POST /api/v1/compliance/cross-mappings
 * Create a cross-framework requirement mapping.
 */
complianceRouter.post(
  '/cross-mappings',
  validate(createCrossMappingSchema),
  createCrossMapping,
);

/**
 * DELETE /api/v1/compliance/cross-mappings/:id
 * Delete a cross-framework requirement mapping.
 */
complianceRouter.delete(
  '/cross-mappings/:id',
  validateParams(idParamSchema),
  deleteCrossMapping,
);

/**
 * GET /api/v1/compliance/frameworks/:id/cross-mappings
 * Get all cross-mappings for a specific framework.
 */
complianceRouter.get(
  '/frameworks/:id/cross-mappings',
  validateParams(idParamSchema),
  getFrameworkCrossMappings,
);

// =============================================================================
// Compliance Dashboard (Evo-4D: REQ-4.4)
// =============================================================================

/**
 * GET /api/v1/compliance/dashboard
 * Get compliance dashboard statistics.
 */
complianceRouter.get(
  '/dashboard',
  getDashboard,
);

// =============================================================================
// Compliance Evidence (Evo-4C)
// =============================================================================

/**
 * GET /api/v1/compliance/evidence
 * List ALL evidence across all controls.
 */
complianceRouter.get(
  '/evidence',
  listAllEvidence,
);

/**
 * GET /api/v1/compliance/controls/:id/evidence
 * List evidence for a control.
 */
complianceRouter.get(
  '/controls/:id/evidence',
  validateParams(idParamSchema),
  listEvidence,
);

/**
 * POST /api/v1/compliance/controls/:id/evidence
 * Add evidence to a control.
 */
complianceRouter.post(
  '/controls/:id/evidence',
  validateParams(idParamSchema),
  validate(createComplianceEvidenceSchema),
  createEvidence,
);

/**
 * DELETE /api/v1/compliance/evidence/:id
 * Delete evidence.
 */
complianceRouter.delete(
  '/evidence/:id',
  validateParams(idParamSchema),
  deleteEvidence,
);

export { complianceRouter };
