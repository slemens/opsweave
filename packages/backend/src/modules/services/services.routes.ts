import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  serviceDescriptionFilterSchema,
  createServiceDescriptionSchema,
  updateServiceDescriptionSchema,
  catalogFilterSchema,
  createHorizontalCatalogSchema,
  updateHorizontalCatalogSchema,
  addCatalogItemSchema,
  createServiceScopeItemSchema,
  updateServiceScopeItemSchema,
  reorderServiceScopeItemsSchema,
} from '@opsweave/shared';

import {
  listServiceDescriptions,
  getServiceDescription,
  createServiceDescription,
  updateServiceDescription,
  deleteServiceDescription,
  listHorizontalCatalogs,
  getHorizontalCatalog,
  createHorizontalCatalog,
  updateHorizontalCatalog,
  deleteHorizontalCatalog,
  addCatalogItem,
  removeCatalogItem,
  listVerticalCatalogs,
  getVerticalCatalog,
  createVerticalCatalog,
  updateVerticalCatalog,
  deleteVerticalCatalog,
  addVerticalOverride,
  removeVerticalOverride,
} from './services.controller.js';

import {
  listScopeItems,
  createScopeItem,
  updateScopeItem,
  deleteScopeItem,
  reorderScopeItems,
} from './service-scope.controller.js';

const serviceCatalogRouter = Router();

// ─── Service Descriptions ─────────────────────────────────

/**
 * GET /api/v1/services/descriptions
 * List service descriptions with filtering and pagination.
 */
serviceCatalogRouter.get(
  '/descriptions',
  validateQuery(serviceDescriptionFilterSchema),
  listServiceDescriptions,
);

/**
 * POST /api/v1/services/descriptions
 * Create a new service description.
 */
serviceCatalogRouter.post(
  '/descriptions',
  requireRole('admin', 'manager'),
  validate(createServiceDescriptionSchema),
  createServiceDescription,
);

/**
 * GET /api/v1/services/descriptions/:id
 * Get a single service description.
 */
serviceCatalogRouter.get(
  '/descriptions/:id',
  validateParams(idParamSchema),
  getServiceDescription,
);

/**
 * PUT /api/v1/services/descriptions/:id
 * Update a service description.
 */
serviceCatalogRouter.put(
  '/descriptions/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(updateServiceDescriptionSchema),
  updateServiceDescription,
);

/**
 * DELETE /api/v1/services/descriptions/:id
 * Delete a service description.
 */
serviceCatalogRouter.delete(
  '/descriptions/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  deleteServiceDescription,
);

// ─── Service Scope Items (REQ-2.2c) ──────────────────────

/**
 * GET /api/v1/services/descriptions/:id/scope-items
 * List all scope items for a service description.
 */
serviceCatalogRouter.get(
  '/descriptions/:id/scope-items',
  validateParams(idParamSchema),
  listScopeItems,
);

/**
 * POST /api/v1/services/descriptions/:id/scope-items
 * Create a new scope item for a service description.
 */
serviceCatalogRouter.post(
  '/descriptions/:id/scope-items',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(createServiceScopeItemSchema),
  createScopeItem,
);

/**
 * POST /api/v1/services/descriptions/:id/scope-items/reorder
 * Reorder scope items for a service description.
 */
serviceCatalogRouter.post(
  '/descriptions/:id/scope-items/reorder',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(reorderServiceScopeItemsSchema),
  reorderScopeItems,
);

/**
 * PUT /api/v1/services/descriptions/:id/scope-items/:sid
 * Update a scope item.
 */
serviceCatalogRouter.put(
  '/descriptions/:id/scope-items/:sid',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(updateServiceScopeItemSchema),
  updateScopeItem,
);

/**
 * DELETE /api/v1/services/descriptions/:id/scope-items/:sid
 * Delete a scope item.
 */
serviceCatalogRouter.delete(
  '/descriptions/:id/scope-items/:sid',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  deleteScopeItem,
);

// ─── Horizontal Catalogs ──────────────────────────────────

/**
 * GET /api/v1/services/catalogs/horizontal
 * List horizontal catalogs.
 */
serviceCatalogRouter.get(
  '/catalogs/horizontal',
  validateQuery(catalogFilterSchema),
  listHorizontalCatalogs,
);

/**
 * POST /api/v1/services/catalogs/horizontal
 * Create a new horizontal catalog.
 */
serviceCatalogRouter.post(
  '/catalogs/horizontal',
  requireRole('admin', 'manager'),
  validate(createHorizontalCatalogSchema),
  createHorizontalCatalog,
);

/**
 * GET /api/v1/services/catalogs/horizontal/:id
 * Get a single horizontal catalog with its items.
 */
serviceCatalogRouter.get(
  '/catalogs/horizontal/:id',
  validateParams(idParamSchema),
  getHorizontalCatalog,
);

/**
 * PUT /api/v1/services/catalogs/horizontal/:id
 * Update a horizontal catalog.
 */
serviceCatalogRouter.put(
  '/catalogs/horizontal/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(updateHorizontalCatalogSchema),
  updateHorizontalCatalog,
);

/**
 * DELETE /api/v1/services/catalogs/horizontal/:id
 * Delete a horizontal catalog.
 */
serviceCatalogRouter.delete(
  '/catalogs/horizontal/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  deleteHorizontalCatalog,
);

/**
 * POST /api/v1/services/catalogs/horizontal/:id/items
 * Add a service description to a horizontal catalog.
 */
serviceCatalogRouter.post(
  '/catalogs/horizontal/:id/items',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(addCatalogItemSchema),
  addCatalogItem,
);

/**
 * DELETE /api/v1/services/catalogs/horizontal/:id/items/:sid
 * Remove a service description from a horizontal catalog.
 */
serviceCatalogRouter.delete(
  '/catalogs/horizontal/:id/items/:sid',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  removeCatalogItem,
);

// ─── Vertical Catalogs (Enterprise) ──────────────────────

serviceCatalogRouter.get('/catalogs/vertical', listVerticalCatalogs);
serviceCatalogRouter.post('/catalogs/vertical', requireRole('admin', 'manager'), createVerticalCatalog);
serviceCatalogRouter.get('/catalogs/vertical/:id', validateParams(idParamSchema), getVerticalCatalog);
serviceCatalogRouter.put('/catalogs/vertical/:id', requireRole('admin', 'manager'), validateParams(idParamSchema), updateVerticalCatalog);
serviceCatalogRouter.delete('/catalogs/vertical/:id', requireRole('admin', 'manager'), validateParams(idParamSchema), deleteVerticalCatalog);
serviceCatalogRouter.post('/catalogs/vertical/:id/overrides', requireRole('admin', 'manager'), validateParams(idParamSchema), addVerticalOverride);
serviceCatalogRouter.delete('/catalogs/vertical/:id/overrides/:oid', requireRole('admin', 'manager'), removeVerticalOverride);

export { serviceCatalogRouter };
