import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';

import { sendSuccess } from '../../lib/response.js';
// AUDIT-FIX: M-04 — Safe context accessors instead of non-null assertions
import { requireUserId, requireTenantId } from '../../lib/context.js';
import { setAuthCookies, clearAuthCookies } from '../../lib/cookie.js';
import * as authService from './auth.service.js';
import { writeAuditLog } from '../audit/audit.service.js';
import type { LoginInput, SwitchTenantInput } from '@opsweave/shared';

// ─── POST /api/v1/auth/login ────────────────────────────────

/**
 * Authenticate a user by email + password.
 * Returns user info, JWT token, and list of tenants.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  const result = await authService.login(email, password);

  writeAuditLog(
    result.user.activeTenantId,
    result.user.id,
    result.user.email,
    'auth.login',
    'user',
    result.user.id,
    { passwordExpired: result.passwordExpired },
    req.ip,
    req.headers['user-agent'] ?? null,
  );

  // Set httpOnly auth cookie + CSRF cookie
  const csrfToken = randomBytes(32).toString('hex');
  setAuthCookies(res, result.token, csrfToken);

  sendSuccess(res, result);
}

// ─── POST /api/v1/auth/logout ───────────────────────────────

/**
 * Log the user out.
 * With stateless JWT this is a no-op server-side — the client
 * discards the token. Returns success for API consistency.
 */
export function logout(_req: Request, res: Response): void {
  clearAuthCookies(res);
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

  // Set httpOnly auth cookie + CSRF cookie with new token
  const csrfToken = randomBytes(32).toString('hex');
  setAuthCookies(res, result.token, csrfToken);

  sendSuccess(res, result);
}

// ─── PATCH /api/v1/auth/change-password ──────────────────

/**
 * Change the current user's password.
 * Validates against the tenant's password policy.
 */
export async function changePassword(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const tenantId = requireTenantId(req);
  const { current_password, new_password } = req.body as {
    current_password: string;
    new_password: string;
  };

  await authService.changePassword(userId, tenantId, current_password, new_password);

  const user = await authService.getMe(userId);
  writeAuditLog(
    tenantId,
    userId,
    user.user.email,
    'auth.password_changed',
    'user',
    userId,
    {},
    req.ip,
    req.headers['user-agent'] ?? null,
  );

  sendSuccess(res, { message: 'Password changed successfully' });
}

// ─── GET /api/v1/auth/password-policy ────────────────────

/**
 * Get the password policy for the current tenant.
 */
export async function getPasswordPolicy(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const policy = await authService.getPasswordPolicy(tenantId);
  sendSuccess(res, policy);
}
