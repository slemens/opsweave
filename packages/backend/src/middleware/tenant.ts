import type { Request, Response, NextFunction } from 'express';

import { UnauthorizedError } from '../lib/errors.js';

/**
 * Tenant middleware — extracts the active tenant from the authenticated
 * user and attaches `req.tenantId`.
 *
 * Must run AFTER `requireAuth` so that `req.user` is available.
 *
 * All downstream service/repository calls MUST use `req.tenantId`
 * in their WHERE clauses to enforce data isolation.
 */
export function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required before tenant resolution');
  }

  const tenantId = req.user.activeTenantId;

  if (!tenantId) {
    throw new UnauthorizedError('No active tenant set for this user');
  }

  req.tenantId = tenantId;
  next();
}
