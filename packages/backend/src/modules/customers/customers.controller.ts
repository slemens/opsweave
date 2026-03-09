import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '../../lib/response.js';
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
  const tenantId = req.tenantId!;
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
  const tenantId = req.tenantId!;
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
  const tenantId = req.tenantId!;
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
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const data = req.body as { name?: string; industry?: string; contact_email?: string; is_active?: number };

  const customer = await customersService.updateCustomer(tenantId, id, data);
  sendSuccess(res, customer);
}
