import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as groupsService from './groups.service.js';
import type {
  PaginationParams,
  CreateGroupInput,
  UpdateGroupInput,
  AddGroupMemberInput,
} from '@opsweave/shared';

// ─── List Groups ────────────────────────────────────────

/**
 * GET /api/v1/groups
 */
export async function listGroups(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const params = req.query as unknown as PaginationParams;

  const { groups, total } = await groupsService.listGroups(tenantId, params);
  sendPaginated(res, groups, total, params.page, params.limit);
}

// ─── Get Group ──────────────────────────────────────────

/**
 * GET /api/v1/groups/:id
 */
export async function getGroup(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const group = await groupsService.getGroup(tenantId, id);
  sendSuccess(res, group);
}

// ─── Create Group ───────────────────────────────────────

/**
 * POST /api/v1/groups
 */
export async function createGroup(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateGroupInput;

  const group = await groupsService.createGroup(tenantId, data);
  sendCreated(res, group);
}

// ─── Update Group ───────────────────────────────────────

/**
 * PUT /api/v1/groups/:id
 */
export async function updateGroup(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateGroupInput;

  const group = await groupsService.updateGroup(tenantId, id, data);
  sendSuccess(res, group);
}

// ─── Delete Group ───────────────────────────────────────

/**
 * DELETE /api/v1/groups/:id
 */
export async function deleteGroup(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  await groupsService.deleteGroup(tenantId, id);
  sendNoContent(res);
}

// ─── List Group Members ─────────────────────────────────

/**
 * GET /api/v1/groups/:id/members
 */
export async function listGroupMembers(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const members = await groupsService.listGroupMembers(tenantId, id);
  sendSuccess(res, members);
}

// ─── Add Group Member ───────────────────────────────────

/**
 * POST /api/v1/groups/:id/members
 */
export async function addGroupMember(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as AddGroupMemberInput;

  await groupsService.addGroupMember(
    tenantId,
    id,
    data.user_id,
    data.role_in_group,
  );
  sendCreated(res, { message: 'Member added successfully' });
}

// ─── Remove Group Member ────────────────────────────────

/**
 * DELETE /api/v1/groups/:id/members/:uid
 */
export async function removeGroupMember(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, uid } = req.params as { id: string; uid: string };

  await groupsService.removeGroupMember(tenantId, id, uid);
  sendNoContent(res);
}

// ─── Get Group Tickets ──────────────────────────────────

/**
 * GET /api/v1/groups/:id/tickets
 */
export async function getGroupTickets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const params = req.query as unknown as PaginationParams;

  const { tickets, total } = await groupsService.getGroupTickets(
    tenantId,
    id,
    params,
  );
  sendPaginated(res, tickets, total, params.page, params.limit);
}
