import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
import { validateQuery, validateParams } from '../../middleware/validate.js';
import { paginationSchema, idParamSchema } from '@opsweave/shared';

import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  getCustomerOverview,
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
 * GET /api/v1/customers/:id/overview
 * Get comprehensive customer overview (assets, tickets, SLAs, services).
 */
customerRouter.get(
  '/:id/overview',
  validateParams(idParamSchema),
  getCustomerOverview,
);

export { customerRouter };
