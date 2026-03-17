import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as customersService from './customers.service.js';
import type { PaginationParams } from '@opsweave/shared';

// ─── List Customers ────────────────────────────────────────

/**
 * GET /api/v1/customers
 */
export async function listCustomers(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const params = req.query as unknown as PaginationParams;

  const { customers, total } = await customersService.listCustomers(tenantId, params);
  sendPaginated(res, customers, total, params.page, params.limit);
}

// ─── Get Customer ──────────────────────────────────────────

/**
 * GET /api/v1/customers/:id
 */
export async function getCustomer(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const customer = await customersService.getCustomer(tenantId, id);
  sendSuccess(res, customer);
}

// ─── Create Customer ───────────────────────────────────────

/**
 * POST /api/v1/customers
 */
export async function createCustomer(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as { name: string; industry?: string; contact_email?: string };

  const customer = await customersService.createCustomer(tenantId, data);
  sendCreated(res, customer);
}

// ─── Update Customer ───────────────────────────────────────

/**
 * PUT /api/v1/customers/:id
 */
export async function updateCustomer(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as { name?: string; industry?: string; contact_email?: string; is_active?: number };

  const customer = await customersService.updateCustomer(tenantId, id, data);
  sendSuccess(res, customer);
}

// ─── Delete (Deactivate) Customer ─────────────────────────

/**
 * DELETE /api/v1/customers/:id
 */
export async function deleteCustomer(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const customer = await customersService.deactivateCustomer(tenantId, id);
  sendSuccess(res, customer);
}

// ─── Customer Overview ────────────────────────────────────

/**
 * GET /api/v1/customers/:id/overview
 */
export async function getCustomerOverview(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const overview = await customersService.getCustomerOverview(tenantId, id);
  sendSuccess(res, overview);
}

// ─── Portal Users ──────────────────────────────────────────

/**
 * GET /api/v1/customers/:id/portal-users
 */
export async function listPortalUsers(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const portalUsers = await customersService.getPortalUsers(tenantId, id);
  sendSuccess(res, portalUsers);
}

/**
 * POST /api/v1/customers/:id/portal-users
 */
export async function createPortalUser(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as { email: string; display_name: string; password: string };

  const portalUser = await customersService.createPortalUser(tenantId, id, data);
  sendCreated(res, portalUser);
}

/**
 * PUT /api/v1/customers/:id/portal-users/:uid
 */
export async function updatePortalUser(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, uid } = req.params as { id: string; uid: string };
  const data = req.body as { display_name?: string; is_active?: number };

  const portalUser = await customersService.updatePortalUser(tenantId, id, uid, data);
  sendSuccess(res, portalUser);
}

/**
 * DELETE /api/v1/customers/:id/portal-users/:uid
 */
export async function deletePortalUser(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, uid } = req.params as { id: string; uid: string };

  await customersService.deletePortalUser(tenantId, id, uid);
  sendNoContent(res);
}
