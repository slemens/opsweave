import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
import { validateQuery, validateParams } from '../../middleware/validate.js';
import { paginationSchema, idParamSchema } from '@opsweave/shared';

import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOverview,
  listPortalUsers,
  createPortalUser,
  updatePortalUser,
  deletePortalUser,
} from './customers.controller.js';

const customerRouter = Router();

/**
 * GET /api/v1/customers
 * List customers.
 */
customerRouter.get(
  '/',
  validateQuery(paginationSchema),
  listCustomers,
);

/**
 * GET /api/v1/customers/:id
 * Get a single customer.
 */
customerRouter.get(
  '/:id',
  validateParams(idParamSchema),
  getCustomer,
);

/**
 * POST /api/v1/customers
 * Create a new customer.
 */
customerRouter.post(
  '/',
  requireRole('admin', 'manager'),
  createCustomer,
);

/**
 * PUT /api/v1/customers/:id
 * Update a customer.
 */
customerRouter.put(
  '/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  updateCustomer,
);

/**
 * DELETE /api/v1/customers/:id
 * Deactivate a customer (soft-delete). Returns 409 if open tickets exist.
 */
customerRouter.delete(
  '/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  deleteCustomer,
);

/**
 * GET /api/v1/customers/:id/overview
 * Get comprehensive customer overview (assets, tickets, SLAs, services).
 */
customerRouter.get(
  '/:id/overview',
  validateParams(idParamSchema),
  getCustomerOverview,
);

/**
 * GET /api/v1/customers/:id/portal-users
 * List portal users for a customer.
 */
customerRouter.get(
  '/:id/portal-users',
  validateParams(idParamSchema),
  listPortalUsers,
);

/**
 * POST /api/v1/customers/:id/portal-users
 * Create a portal user for a customer.
 */
customerRouter.post(
  '/:id/portal-users',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  createPortalUser,
);

/**
 * PUT /api/v1/customers/:id/portal-users/:uid
 * Update a portal user.
 */
customerRouter.put(
  '/:id/portal-users/:uid',
  requireRole('admin', 'manager'),
  updatePortalUser,
);

/**
 * DELETE /api/v1/customers/:id/portal-users/:uid
 * Delete a portal user.
 */
customerRouter.delete(
  '/:id/portal-users/:uid',
  requireRole('admin', 'manager'),
  deletePortalUser,
);

export { customerRouter };
