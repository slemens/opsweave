import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
// AUDIT-FIX: M-04 — Safe context accessors instead of non-null assertions
import { requireTenantId, requireUserId } from '../../lib/context.js';
import * as settingsService from './settings.service.js';
import type { PasswordPolicy } from '../../lib/password-policy.js';
import { writeAuditLog, resolveActorEmail } from '../audit/audit.service.js';

// ─── System Settings ─────────────────────────────────────

/**
 * GET /api/v1/settings
 * Return all system settings.
 */
export function listSettings(
  _req: Request,
  res: Response,
): void {
  const settings = settingsService.getAllSettings();
  sendSuccess(res, settings);
}

/**
 * GET /api/v1/settings/runtime
 * Return non-secret runtime configuration (admin only).
 */
export function getRuntime(
  _req: Request,
  res: Response,
): void {
  const runtime = settingsService.getRuntimeConfig();
  sendSuccess(res, runtime);
}

/**
 * GET /api/v1/settings/:key
 * Return a single setting by key.
 */
export function getSettingByKey(
  req: Request,
  res: Response,
): void {
  const { key } = req.params as { key: string };
  const setting = settingsService.getSetting(key);
  sendSuccess(res, setting);
}

/**
 * PUT /api/v1/settings/:key
 * Create or update a setting (admin only).
 */
export function updateSettingByKey(
  req: Request,
  res: Response,
): void {
  const { key } = req.params as { key: string };
  const { value } = req.body as { value: unknown };
  const userId = requireUserId(req);

  const setting = settingsService.upsertSetting(key, value, userId);
  sendSuccess(res, setting);
}

/**
 * DELETE /api/v1/settings/:key
 * Delete a setting (admin only).
 */
export function deleteSettingByKey(
  req: Request,
  res: Response,
): void {
  const { key } = req.params as { key: string };
  settingsService.deleteSetting(key);
  sendNoContent(res);
}

// ─── License ─────────────────────────────────────────────

/**
 * GET /api/v1/license
 * Return license info for the current tenant.
 */
export function getLicense(
  req: Request,
  res: Response,
): void {
  const tenantId = requireTenantId(req);
  const info = settingsService.getLicenseInfo(tenantId);
  sendSuccess(res, info);
}

/**
 * GET /api/v1/license/usage
 * Return current resource usage vs. license limits.
 */
export function getLicenseUsageHandler(
  req: Request,
  res: Response,
): void {
  const tenantId = requireTenantId(req);
  const usage = settingsService.getLicenseUsage(tenantId);
  sendSuccess(res, usage);
}

/**
 * POST /api/v1/license/activate
 * Validate and store a license key for the current tenant (admin only).
 */
export function activateLicenseHandler(
  req: Request,
  res: Response,
): void {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const { license_key } = req.body as { license_key: string };

  const info = settingsService.activateLicense(tenantId, license_key);

  writeAuditLog(
    tenantId,
    userId,
    resolveActorEmail(userId),
    'license.activated',
    'tenant',
    tenantId,
    { edition: info.edition, subject: info.subject },
    req.ip,
    req.headers['user-agent'] ?? null,
  );

  sendCreated(res, info);
}

/**
 * DELETE /api/v1/license
 * Remove the license key, reverting to community edition (admin only).
 */
export function deactivateLicenseHandler(
  req: Request,
  res: Response,
): void {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  settingsService.deactivateLicense(tenantId);

  writeAuditLog(
    tenantId,
    userId,
    resolveActorEmail(userId),
    'license.deactivated',
    'tenant',
    tenantId,
    {},
    req.ip,
    req.headers['user-agent'] ?? null,
  );

  sendNoContent(res);
}

// ─── Password Policy ────────────────────────────────────

/**
 * GET /api/v1/settings/password-policy
 * Get the password policy for the current tenant.
 */
export function getPasswordPolicy(
  req: Request,
  res: Response,
): void {
  const tenantId = requireTenantId(req);
  const policy = settingsService.getPasswordPolicy(tenantId);
  sendSuccess(res, policy);
}

/**
 * PUT /api/v1/settings/password-policy
 * Update the password policy for the current tenant (admin only).
 */
export function updatePasswordPolicy(
  req: Request,
  res: Response,
): void {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const data = req.body as Partial<PasswordPolicy>;
  const updated = settingsService.updatePasswordPolicy(tenantId, data);

  writeAuditLog(
    tenantId,
    userId,
    resolveActorEmail(userId),
    'settings.password_policy_updated',
    'tenant',
    tenantId,
    updated as unknown as Record<string, unknown>,
    req.ip,
    req.headers['user-agent'] ?? null,
  );

  sendSuccess(res, updated);
}
