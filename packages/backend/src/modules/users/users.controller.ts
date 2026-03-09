import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
import { ForbiddenError } from '../../lib/errors.js';
import * as usersService from './users.service.js';
import type {
  PaginationParams,
  CreateUserInput,
  UpdateUserInput,
  UpdateLanguageInput,
} from '@opsweave/shared';

// ─── List Users ─────────────────────────────────────────

/**
 * GET /api/v1/users
 */
export async function listUsers(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const params = req.query as unknown as PaginationParams;

  const { users, total } = await usersService.listUsers(tenantId, params);
  sendPaginated(res, users, total, params.page, params.limit);
}

// ─── Get User ───────────────────────────────────────────

/**
 * GET /api/v1/users/:id
 */
export async function getUser(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const user = await usersService.getUser(tenantId, id);
  sendSuccess(res, user);
}

// ─── Create User ────────────────────────────────────────

/**
 * POST /api/v1/users
 */
export async function createUser(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const creatorId = req.user!.id;
  const data = req.body as CreateUserInput;

  const user = await usersService.createUser(tenantId, data, creatorId);
  sendCreated(res, user);
}

// ─── Update User ────────────────────────────────────────

/**
 * PUT /api/v1/users/:id
 */
export async function updateUser(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params as { id: string };
  const requestUser = req.user!;
  const data = req.body as UpdateUserInput;

  usersService.assertCanEditUser(requestUser.id, id, requestUser.role);

  const user = await usersService.updateUser(id, data);
  sendSuccess(res, user);
}

// ─── Delete User (remove from tenant) ───────────────────

/**
 * DELETE /api/v1/users/:id
 */
export async function deleteUser(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const requestUser = req.user!;

  if (requestUser.id === id) {
    throw new ForbiddenError('Cannot remove yourself from the tenant');
  }

  await usersService.deleteUser(tenantId, id);
  sendNoContent(res);
}

// ─── Update Language ────────────────────────────────────

/**
 * PATCH /api/v1/users/:id/language
 */
export async function updateLanguage(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params as { id: string };
  const requestUser = req.user!;
  const data = req.body as UpdateLanguageInput;

  usersService.assertCanEditUser(requestUser.id, id, requestUser.role);

  await usersService.updateLanguage(id, data.language);
  sendSuccess(res, { language: data.language });
}
