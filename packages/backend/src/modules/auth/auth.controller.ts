import type { Request, Response } from 'express';

import { sendSuccess } from '../../lib/response.js';
// AUDIT-FIX: M-04 — Safe context accessors instead of non-null assertions
import { requireUserId } from '../../lib/context.js';
import * as authService from './auth.service.js';
import type { LoginInput, SwitchTenantInput } from '@opsweave/shared';

// ─── POST /api/v1/auth/login ────────────────────────────────

/**
 * Authenticate a user by email + password.
 * Returns user info, JWT token, and list of tenants.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  const result = await authService.login(email, password);

  sendSuccess(res, result);
}

// ─── POST /api/v1/auth/logout ───────────────────────────────

/**
 * Log the user out.
 * With stateless JWT this is a no-op server-side — the client
 * discards the token. Returns success for API consistency.
 */
export function logout(_req: Request, res: Response): void {
  sendSuccess(res, { message: 'Logged out successfully' });
}

// ─── GET /api/v1/auth/me ────────────────────────────────────

/**
 * Return the current authenticated user with their tenant list.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);

  const result = await authService.getMe(userId);

  sendSuccess(res, result);
}

// ─── POST /api/v1/auth/switch-tenant ────────────────────────

/**
 * Switch the active tenant context.
 * Returns a new JWT with the updated activeTenantId and role.
 */
export async function switchTenant(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const { tenant_id: tenantId } = req.body as SwitchTenantInput;

  const result = await authService.switchTenant(userId, tenantId);

  sendSuccess(res, result);
}
