import { eq, count } from 'drizzle-orm';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  systemSettings,
  tenants,
  assets,
  tenantUserMemberships,
  workflowTemplates,
  regulatoryFrameworks,
  monitoringSources,
} from '../../db/schema/index.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { validateLicenseKey, COMMUNITY_LIMITS } from '../../middleware/license.js';
import { config } from '../../config/index.js';
import type { PasswordPolicy } from '../../lib/password-policy.js';
import { parsePolicyFromSettings, DEFAULT_PASSWORD_POLICY } from '../../lib/password-policy.js';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── System Settings CRUD ─────────────────────────────────

export interface SettingEntry {
  key: string;
  value: unknown;
  updated_at: string | null;
  updated_by: string | null;
}

/**
 * Get all system settings.
 */
export function getAllSettings(): SettingEntry[] {
  const rows = db().select().from(systemSettings).all();
  return rows.map((r) => ({
    key: r.key,
    value: parseJson(r.value),
    updated_at: r.updated_at,
    updated_by: r.updated_by,
  }));
}

/**
 * Get a single setting by key.
 */
export function getSetting(key: string): SettingEntry {
  const row = db()
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1)
    .get();

  if (!row) {
    throw new NotFoundError(`Setting '${key}' not found`);
  }

  return {
    key: row.key,
    value: parseJson(row.value),
    updated_at: row.updated_at,
    updated_by: row.updated_by,
  };
}

/**
 * Upsert a setting (insert or update).
 */
export function upsertSetting(
  key: string,
  value: unknown,
  userId: string,
): SettingEntry {
  const now = new Date().toISOString();
  const jsonValue = JSON.stringify(value);

  const existing = db()
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1)
    .get();

  if (existing) {
    db()
      .update(systemSettings)
      .set({ value: jsonValue, updated_at: now, updated_by: userId })
      .where(eq(systemSettings.key, key))
      .run();
  } else {
    db()
      .insert(systemSettings)
      .values({ key, value: jsonValue, updated_at: now, updated_by: userId })
      .run();
  }

  return { key, value, updated_at: now, updated_by: userId };
}

/**
 * Delete a setting by key.
 */
export function deleteSetting(key: string): void {
  const existing = db()
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1)
    .get();

  if (!existing) {
    throw new NotFoundError(`Setting '${key}' not found`);
  }

  db().delete(systemSettings).where(eq(systemSettings.key, key)).run();
}

// ─── Runtime Config (read-only, non-secret .env values) ──

export interface RuntimeConfig {
  nodeEnv: string;
  port: number;
  dbDriver: string;
  queueDriver: string;
  defaultLanguage: string;
  corsOrigin: string;
  serveStatic: boolean;
  oidcEnabled: boolean;
  jwtExpiresIn: string;
}

/**
 * Return non-secret runtime configuration.
 * Secrets (JWT secret, DB password, OIDC secret) are NEVER exposed.
 */
export function getRuntimeConfig(): RuntimeConfig {
  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    dbDriver: config.dbDriver,
    queueDriver: config.queueDriver,
    defaultLanguage: config.defaultLanguage,
    corsOrigin: config.corsOrigin,
    serveStatic: config.serveStatic,
    oidcEnabled: config.oidcEnabled,
    jwtExpiresIn: config.jwtExpiresIn,
  };
}

// ─── License ─────────────────────────────────────────────

export interface LicenseInfo {
  edition: 'community' | 'enterprise';
  status: 'active' | 'expired' | 'none';
  subject: string | null;
  expiresAt: string | null;
  issuedAt: string | null;
  limits: {
    maxAssets: number;
    maxUsers: number;
    maxWorkflows: number;
    maxFrameworks: number;
    maxMonitoringSources: number;
  };
  features: {
    oidcAuth: boolean;
    samlAuth: boolean;
    verticalCatalogs: boolean;
    advancedReporting: boolean;
    customerPortal: boolean;
    emailInbound: boolean;
  };
}

/**
 * Get the license info for a tenant.
 */
export function getLicenseInfo(tenantId: string): LicenseInfo {
  const row = db()
    .select({ license_key: tenants.license_key })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)
    .get();

  if (!row?.license_key) {
    return communityLicense();
  }

  const payload = validateLicenseKey(row.license_key);
  if (!payload) {
    return { ...communityLicense(), status: 'expired' };
  }

  return {
    edition: 'enterprise',
    status: 'active',
    subject: payload.sub,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    limits: payload.limits,
    features: payload.features,
  };
}

/**
 * Get usage counts for the tenant to compare against license limits.
 */
export function getLicenseUsage(
  tenantId: string,
): Record<string, { current: number; max: number }> {
  const info = getLicenseInfo(tenantId);

  const assetCount = countAssets(tenantId);
  const userCount = countMemberships(tenantId);
  const workflowCount = countWorkflows(tenantId);
  const frameworkCount = countFrameworks(tenantId);
  const monitoringCount = countMonitoringSources(tenantId);

  return {
    assets: { current: assetCount, max: info.limits.maxAssets },
    users: { current: userCount, max: info.limits.maxUsers },
    workflows: { current: workflowCount, max: info.limits.maxWorkflows },
    frameworks: { current: frameworkCount, max: info.limits.maxFrameworks },
    monitoring: { current: monitoringCount, max: info.limits.maxMonitoringSources },
  };
}

/**
 * Activate a license key for the current tenant.
 */
export function activateLicense(
  tenantId: string,
  licenseKey: string,
): LicenseInfo {
  const payload = validateLicenseKey(licenseKey);
  if (!payload) {
    throw new ValidationError('Invalid or expired license key');
  }

  const now = new Date().toISOString();
  db()
    .update(tenants)
    .set({ license_key: licenseKey, updated_at: now })
    .where(eq(tenants.id, tenantId))
    .run();

  return {
    edition: 'enterprise',
    status: 'active',
    subject: payload.sub,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    limits: payload.limits,
    features: payload.features,
  };
}

/**
 * Remove/deactivate the license for a tenant (revert to community).
 */
export function deactivateLicense(tenantId: string): void {
  const now = new Date().toISOString();
  db()
    .update(tenants)
    .set({ license_key: null, updated_at: now })
    .where(eq(tenants.id, tenantId))
    .run();
}

// ─── Private Helpers ─────────────────────────────────────

function communityLicense(): LicenseInfo {
  return {
    edition: 'community',
    status: 'none',
    subject: null,
    expiresAt: null,
    issuedAt: null,
    limits: { ...COMMUNITY_LIMITS },
    features: {
      oidcAuth: false,
      samlAuth: false,
      verticalCatalogs: false,
      advancedReporting: false,
      customerPortal: false,
      emailInbound: false,
    },
  };
}

function countAssets(tenantId: string): number {
  const [row] = db()
    .select({ cnt: count() })
    .from(assets)
    .where(eq(assets.tenant_id, tenantId))
    .all();
  return row?.cnt ?? 0;
}

function countMemberships(tenantId: string): number {
  const [row] = db()
    .select({ cnt: count() })
    .from(tenantUserMemberships)
    .where(eq(tenantUserMemberships.tenant_id, tenantId))
    .all();
  return row?.cnt ?? 0;
}

function countWorkflows(tenantId: string): number {
  const [row] = db()
    .select({ cnt: count() })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.tenant_id, tenantId))
    .all();
  return row?.cnt ?? 0;
}

function countFrameworks(tenantId: string): number {
  const [row] = db()
    .select({ cnt: count() })
    .from(regulatoryFrameworks)
    .where(eq(regulatoryFrameworks.tenant_id, tenantId))
    .all();
  return row?.cnt ?? 0;
}

function countMonitoringSources(tenantId: string): number {
  const [row] = db()
    .select({ cnt: count() })
    .from(monitoringSources)
    .where(eq(monitoringSources.tenant_id, tenantId))
    .all();
  return row?.cnt ?? 0;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ─── Password Policy ────────────────────────────────────

/**
 * Get the password policy for a tenant.
 */
export function getPasswordPolicy(tenantId: string): PasswordPolicy {
  const row = db()
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)
    .get();

  if (!row) return { ...DEFAULT_PASSWORD_POLICY };

  let settings: Record<string, unknown> = {};
  try { settings = JSON.parse(row.settings) as Record<string, unknown>; } catch { /* empty */ }

  return parsePolicyFromSettings(settings);
}

/**
 * Update the password policy for a tenant.
 * Merges the new policy into the existing tenant settings JSON.
 */
export function updatePasswordPolicy(
  tenantId: string,
  policy: Partial<PasswordPolicy>,
): PasswordPolicy {
  const row = db()
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)
    .get();

  if (!row) throw new NotFoundError('Tenant not found');

  let settings: Record<string, unknown> = {};
  try { settings = JSON.parse(row.settings) as Record<string, unknown>; } catch { /* empty */ }

  // Merge with existing policy
  const currentPolicy = parsePolicyFromSettings(settings);
  const mergedPolicy: PasswordPolicy = {
    min_length: policy.min_length ?? currentPolicy.min_length,
    require_uppercase: policy.require_uppercase ?? currentPolicy.require_uppercase,
    require_lowercase: policy.require_lowercase ?? currentPolicy.require_lowercase,
    require_digit: policy.require_digit ?? currentPolicy.require_digit,
    require_special: policy.require_special ?? currentPolicy.require_special,
    expiry_days: policy.expiry_days ?? currentPolicy.expiry_days,
    history_count: policy.history_count ?? currentPolicy.history_count,
  };

  // Validate bounds
  const validated = parsePolicyFromSettings({ password_policy: mergedPolicy });

  settings['password_policy'] = validated;

  const now = new Date().toISOString();
  db()
    .update(tenants)
    .set({ settings: JSON.stringify(settings), updated_at: now })
    .where(eq(tenants.id, tenantId))
    .run();

  return validated;
}
