import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import { checkUserLimit } from '../../middleware/license.js';
import {
  paginationSchema,
  idParamSchema,
  createUserSchema,
  updateUserSchema,
  updateLanguageSchema,
} from '@opsweave/shared';

import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateLanguage,
} from './users.controller.js';
import { countUsersInTenant } from './users.service.js';

const userRouter = Router();

/**
 * GET /api/v1/users
 * List users in the active tenant.
 */
userRouter.get(
  '/',
  requireRole('admin', 'manager'),
  validateQuery(paginationSchema),
  listUsers,
);

/**
 * POST /api/v1/users
 * Create a new user and add to the active tenant.
 */
userRouter.post(
  '/',
  requireRole('admin'),
  checkUserLimit(countUsersInTenant),
  validate(createUserSchema),
  createUser,
);

/**
 * GET /api/v1/users/:id
 * Get a single user.
 */
userRouter.get(
  '/:id',
  validateParams(idParamSchema),
  getUser,
);

/**
 * PUT /api/v1/users/:id
 * Update user profile (admin or self).
 */
userRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateUserSchema),
  updateUser,
);

/**
 * DELETE /api/v1/users/:id
 * Remove user from tenant (admin only).
 */
userRouter.delete(
  '/:id',
  requireRole('admin'),
  validateParams(idParamSchema),
  deleteUser,
);

/**
 * PATCH /api/v1/users/:id/language
 * Update user language preference (self or admin).
 */
userRouter.patch(
  '/:id/language',
  validateParams(idParamSchema),
  validate(updateLanguageSchema),
  updateLanguage,
);

export { userRouter };
