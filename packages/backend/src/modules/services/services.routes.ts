import { Router } from 'express';

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
} from './services.controller.js';

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
  validateParams(idParamSchema),
  deleteServiceDescription,
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
  validateParams(idParamSchema),
  deleteHorizontalCatalog,
);

/**
 * POST /api/v1/services/catalogs/horizontal/:id/items
 * Add a service description to a horizontal catalog.
 */
serviceCatalogRouter.post(
  '/catalogs/horizontal/:id/items',
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
  validateParams(idParamSchema),
  removeCatalogItem,
);

export { serviceCatalogRouter };
