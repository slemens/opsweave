import { Router } from 'express';
import { z } from 'zod';

import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

import {
  listSettings,
  getRuntime,
  getSettingByKey,
  updateSettingByKey,
  deleteSettingByKey,
  getLicense,
  getLicenseUsageHandler,
  activateLicenseHandler,
  deactivateLicenseHandler,
} from './settings.controller.js';

// ─── Validation Schemas ──────────────────────────────────

const updateSettingSchema = z.object({
  value: z.unknown(),
});

const activateLicenseSchema = z.object({
  license_key: z.string().min(1, 'License key is required'),
});

// ─── Settings Router ─────────────────────────────────────

const settingsRouter = Router();

/**
 * GET /api/v1/settings
 * List all system settings.
 */
settingsRouter.get('/', listSettings);

/**
 * GET /api/v1/settings/runtime
 * Non-secret runtime configuration (admin only).
 * IMPORTANT: must be before /:key to avoid matching 'runtime' as a key.
 */
settingsRouter.get('/runtime', requireRole('admin'), getRuntime);

/**
 * GET /api/v1/settings/:key
 * Get a single setting by key.
 */
settingsRouter.get('/:key', getSettingByKey);

/**
 * PUT /api/v1/settings/:key
 * Create or update a setting (admin only).
 */
settingsRouter.put(
  '/:key',
  requireRole('admin'),
  validate(updateSettingSchema),
  updateSettingByKey,
);

/**
 * DELETE /api/v1/settings/:key
 * Delete a setting (admin only).
 */
settingsRouter.delete('/:key', requireRole('admin'), deleteSettingByKey);

// ─── License Router ──────────────────────────────────────

const licenseRouter = Router();

/**
 * GET /api/v1/license
 * Get license info for the current tenant.
 */
licenseRouter.get('/', getLicense);

/**
 * GET /api/v1/license/usage
 * Get resource usage vs. license limits.
 */
licenseRouter.get('/usage', getLicenseUsageHandler);

/**
 * POST /api/v1/license/activate
 * Activate a license key (admin only).
 */
licenseRouter.post(
  '/activate',
  requireRole('admin'),
  validate(activateLicenseSchema),
  activateLicenseHandler,
);

/**
 * DELETE /api/v1/license
 * Deactivate license, revert to community (admin only).
 */
licenseRouter.delete('/', requireRole('admin'), deactivateLicenseHandler);

export { settingsRouter, licenseRouter };
