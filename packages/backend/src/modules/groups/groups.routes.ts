import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  paginationSchema,
  idParamSchema,
  uuidSchema,
  createGroupSchema,
  updateGroupSchema,
  addGroupMemberSchema,
} from '@opsweave/shared';
import { z } from 'zod';

import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  listGroupMembers,
  addGroupMember,
  removeGroupMember,
  getGroupTickets,
} from './groups.controller.js';

const groupRouter = Router();

// ─── Param schemas ──────────────────────────────────────

/** Validates the :id + :uid route params for member removal */
const memberParamSchema = z.object({
  id: uuidSchema,
  uid: uuidSchema,
});

// ─── Routes ─────────────────────────────────────────────

/**
 * GET /api/v1/groups
 * List assignee groups.
 */
groupRouter.get(
  '/',
  validateQuery(paginationSchema),
  listGroups,
);

/**
 * POST /api/v1/groups
 * Create a new group.
 */
groupRouter.post(
  '/',
  requireRole('admin', 'manager'),
  validate(createGroupSchema),
  createGroup,
);

/**
 * GET /api/v1/groups/:id
 * Get a single group.
 */
groupRouter.get(
  '/:id',
  validateParams(idParamSchema),
  getGroup,
);

/**
 * PUT /api/v1/groups/:id
 * Update a group.
 */
groupRouter.put(
  '/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(updateGroupSchema),
  updateGroup,
);

/**
 * DELETE /api/v1/groups/:id
 * Delete a group.
 */
groupRouter.delete(
  '/:id',
  requireRole('admin'),
  validateParams(idParamSchema),
  deleteGroup,
);

/**
 * GET /api/v1/groups/:id/members
 * List group members.
 */
groupRouter.get(
  '/:id/members',
  validateParams(idParamSchema),
  listGroupMembers,
);

/**
 * POST /api/v1/groups/:id/members
 * Add a member to a group.
 */
groupRouter.post(
  '/:id/members',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(addGroupMemberSchema),
  addGroupMember,
);

/**
 * DELETE /api/v1/groups/:id/members/:uid
 * Remove a member from a group.
 */
groupRouter.delete(
  '/:id/members/:uid',
  requireRole('admin', 'manager'),
  validateParams(memberParamSchema),
  removeGroupMember,
);

/**
 * GET /api/v1/groups/:id/tickets
 * Get tickets assigned to a group.
 */
groupRouter.get(
  '/:id/tickets',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  getGroupTickets,
);

export { groupRouter };
