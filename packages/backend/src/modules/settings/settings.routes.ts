import { Router } from 'express';
import { z } from 'zod';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateParams } from '../../middleware/validate.js';

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
  getPasswordPolicy,
  updatePasswordPolicy,
} from './settings.controller.js';

// ─── Validation Schemas ──────────────────────────────────

const updateSettingSchema = z.object({
  value: z.unknown(),
});

const activateLicenseSchema = z.object({
  license_key: z.string().min(1, 'License key is required'),
});

// AUDIT-FIX: M-03 — Validate settings key param to prevent path traversal
const settingsKeyParamSchema = z.object({
  key: z.string().regex(/^[a-zA-Z0-9._-]+$/),
});

const passwordPolicySchema = z.object({
  min_length: z.number().int().min(8).max(128).optional(),
  require_uppercase: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)).optional(),
  require_lowercase: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)).optional(),
  require_digit: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)).optional(),
  require_special: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)).optional(),
  expiry_days: z.number().int().min(0).max(365).optional(),
  history_count: z.number().int().min(0).max(24).optional(),
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
 * GET /api/v1/settings/password-policy
 * Get the password policy for the current tenant.
 * IMPORTANT: must be before /:key to avoid matching 'password-policy' as a key.
 */
settingsRouter.get('/password-policy', getPasswordPolicy);

/**
 * PUT /api/v1/settings/password-policy
 * Update the password policy for the current tenant (admin only).
 */
settingsRouter.put(
  '/password-policy',
  requireRole('admin'),
  validate(passwordPolicySchema),
  updatePasswordPolicy,
);

/**
 * GET /api/v1/settings/:key
 * Get a single setting by key.
 */
// AUDIT-FIX: M-03 — Validate key param format
settingsRouter.get('/:key', validateParams(settingsKeyParamSchema), getSettingByKey);

/**
 * PUT /api/v1/settings/:key
 * Create or update a setting (admin only).
 */
// AUDIT-FIX: M-03 — Validate key param format
settingsRouter.put(
  '/:key',
  requireRole('admin'),
  validateParams(settingsKeyParamSchema),
  validate(updateSettingSchema),
  updateSettingByKey,
);

/**
 * DELETE /api/v1/settings/:key
 * Delete a setting (admin only).
 */
// AUDIT-FIX: M-03 — Validate key param format
settingsRouter.delete('/:key', requireRole('admin'), validateParams(settingsKeyParamSchema), deleteSettingByKey);

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
