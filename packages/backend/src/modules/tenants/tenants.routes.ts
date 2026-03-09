import { Router } from 'express';
import {
  createTenantSchema,
  updateTenantSchema,
  addTenantMemberSchema,
  idParamSchema,
} from '@opsweave/shared';

import { requireAuth } from '../../middleware/auth.js';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { validate, validateParams } from '../../middleware/validate.js';
import {
  listTenants,
  createTenant,
  getTenant,
  updateTenant,
  listTenantMembers,
  addTenantMember,
  removeTenantMember,
} from './tenants.controller.js';

// ─── Tenant Router ──────────────────────────────────────────
// All routes require super-admin access.

const tenantRouter = Router();

// Apply auth + super-admin guard to all routes in this router
tenantRouter.use(requireAuth);
tenantRouter.use(requireSuperAdmin);

/**
 * GET /api/v1/tenants
 * List all tenants.
 */
tenantRouter.get('/', listTenants);

/**
 * POST /api/v1/tenants
 * Create a new tenant.
 */
tenantRouter.post('/', validate(createTenantSchema), createTenant);

/**
 * GET /api/v1/tenants/:id
 * Get a single tenant.
 */
tenantRouter.get('/:id', validateParams(idParamSchema), getTenant);

/**
 * PUT /api/v1/tenants/:id
 * Update a tenant.
 */
tenantRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateTenantSchema),
  updateTenant,
);

/**
 * GET /api/v1/tenants/:id/members
 * List tenant members.
 */
tenantRouter.get(
  '/:id/members',
  validateParams(idParamSchema),
  listTenantMembers,
);

/**
 * POST /api/v1/tenants/:id/members
 * Add a user to a tenant.
 */
tenantRouter.post(
  '/:id/members',
  validateParams(idParamSchema),
  validate(addTenantMemberSchema),
  addTenantMember,
);

/**
 * DELETE /api/v1/tenants/:id/members/:uid
 * Remove a user from a tenant.
 */
tenantRouter.delete('/:id/members/:uid', removeTenantMember);

export { tenantRouter };
