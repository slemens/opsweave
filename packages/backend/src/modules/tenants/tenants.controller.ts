import type { Request, Response } from 'express';

import { sendSuccess, sendCreated, sendNoContent } from '../../lib/response.js';
import * as tenantsService from './tenants.service.js';
import type {
  CreateTenantInput,
  UpdateTenantInput,
  AddTenantMemberInput,
} from '@opsweave/shared';

// ─── GET /api/v1/tenants ────────────────────────────────────

/**
 * List all tenants. Super-admin only.
 */
export async function listTenants(
  _req: Request,
  res: Response,
): Promise<void> {
  const result = await tenantsService.listTenants();
  sendSuccess(res, result);
}

// ─── POST /api/v1/tenants ───────────────────────────────────

/**
 * Create a new tenant. Super-admin only.
 */
export async function createTenant(
  req: Request,
  res: Response,
): Promise<void> {
  const data = req.body as CreateTenantInput;
  const result = await tenantsService.createTenant(data);
  sendCreated(res, result);
}

// ─── GET /api/v1/tenants/:id ────────────────────────────────

/**
 * Get a single tenant by ID. Super-admin only.
 */
export async function getTenant(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await tenantsService.getTenant(id);
  sendSuccess(res, result);
}

// ─── PUT /api/v1/tenants/:id ────────────────────────────────

/**
 * Update a tenant. Super-admin only.
 */
export async function updateTenant(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params as { id: string };
  const data = req.body as UpdateTenantInput;
  const result = await tenantsService.updateTenant(id, data);
  sendSuccess(res, result);
}

// ─── GET /api/v1/tenants/:id/members ────────────────────────

/**
 * List all members of a tenant. Super-admin only.
 */
export async function listTenantMembers(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await tenantsService.listTenantMembers(id);
  sendSuccess(res, result);
}

// ─── POST /api/v1/tenants/:id/members ───────────────────────

/**
 * Add a user to a tenant. Super-admin only.
 */
export async function addTenantMember(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: tenantId } = req.params as { id: string };
  const { user_id: userId, role } = req.body as AddTenantMemberInput;
  await tenantsService.addTenantMember(tenantId, userId, role);
  sendCreated(res, { message: 'Member added successfully' });
}

// ─── DELETE /api/v1/tenants/:id/members/:uid ────────────────

/**
 * Remove a user from a tenant. Super-admin only.
 */
export async function removeTenantMember(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: tenantId, uid: userId } = req.params as {
    id: string;
    uid: string;
  };
  await tenantsService.removeTenantMember(tenantId, userId);
  sendNoContent(res);
}
