import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import * as settingsService from './settings.service.js';

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
  const userId = req.user!.id;

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
  const tenantId = req.tenantId!;
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
  const tenantId = req.tenantId!;
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
  const tenantId = req.tenantId!;
  const { license_key } = req.body as { license_key: string };

  const info = settingsService.activateLicense(tenantId, license_key);
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
  const tenantId = req.tenantId!;
  settingsService.deactivateLicense(tenantId);
  sendNoContent(res);
}
