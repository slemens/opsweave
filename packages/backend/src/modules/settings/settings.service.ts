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
export async function getAllSettings(): Promise<SettingEntry[]> {
  const rows = await db().select().from(systemSettings);
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
export async function getSetting(key: string): Promise<SettingEntry> {
  const [row] = await db()
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

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
export async function upsertSetting(
  key: string,
  value: unknown,
  userId: string,
): Promise<SettingEntry> {
  const now = new Date().toISOString();
  const jsonValue = JSON.stringify(value);

  const [existing] = await db()
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (existing) {
    await db()
      .update(systemSettings)
      .set({ value: jsonValue, updated_at: now, updated_by: userId })
      .where(eq(systemSettings.key, key));
  } else {
    await db()
      .insert(systemSettings)
      .values({ key, value: jsonValue, updated_at: now, updated_by: userId });
  }

  return { key, value, updated_at: now, updated_by: userId };
}

/**
 * Delete a setting by key.
 */
export async function deleteSetting(key: string): Promise<void> {
  const [existing] = await db()
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (!existing) {
    throw new NotFoundError(`Setting '${key}' not found`);
  }

  await db().delete(systemSettings).where(eq(systemSettings.key, key));
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
export async function getLicenseInfo(tenantId: string): Promise<LicenseInfo> {
  const [row] = await db()
    .select({ license_key: tenants.license_key })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

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
export async function getLicenseUsage(
  tenantId: string,
): Promise<Record<string, { current: number; max: number }>> {
  const info = await getLicenseInfo(tenantId);

  const assetCount = await countAssets(tenantId);
  const userCount = await countMemberships(tenantId);
  const workflowCount = await countWorkflows(tenantId);
  const frameworkCount = await countFrameworks(tenantId);
  const monitoringCount = await countMonitoringSources(tenantId);

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
export async function activateLicense(
  tenantId: string,
  licenseKey: string,
): Promise<LicenseInfo> {
  const payload = validateLicenseKey(licenseKey);
  if (!payload) {
    throw new ValidationError('Invalid or expired license key');
  }

  const now = new Date().toISOString();
  await db()
    .update(tenants)
    .set({ license_key: licenseKey, updated_at: now })
    .where(eq(tenants.id, tenantId));

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
export async function deactivateLicense(tenantId: string): Promise<void> {
  const now = new Date().toISOString();
  await db()
    .update(tenants)
    .set({ license_key: null, updated_at: now })
    .where(eq(tenants.id, tenantId));
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

async function countAssets(tenantId: string): Promise<number> {
  const [row] = await db()
    .select({ cnt: count() })
    .from(assets)
    .where(eq(assets.tenant_id, tenantId));
  return row?.cnt ?? 0;
}

async function countMemberships(tenantId: string): Promise<number> {
  const [row] = await db()
    .select({ cnt: count() })
    .from(tenantUserMemberships)
    .where(eq(tenantUserMemberships.tenant_id, tenantId));
  return row?.cnt ?? 0;
}

async function countWorkflows(tenantId: string): Promise<number> {
  const [row] = await db()
    .select({ cnt: count() })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.tenant_id, tenantId));
  return row?.cnt ?? 0;
}

async function countFrameworks(tenantId: string): Promise<number> {
  const [row] = await db()
    .select({ cnt: count() })
    .from(regulatoryFrameworks)
    .where(eq(regulatoryFrameworks.tenant_id, tenantId));
  return row?.cnt ?? 0;
}

async function countMonitoringSources(tenantId: string): Promise<number> {
  const [row] = await db()
    .select({ cnt: count() })
    .from(monitoringSources)
    .where(eq(monitoringSources.tenant_id, tenantId));
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
export async function getPasswordPolicy(tenantId: string): Promise<PasswordPolicy> {
  const [row] = await db()
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!row) return { ...DEFAULT_PASSWORD_POLICY };

  let settings: Record<string, unknown> = {};
  try { settings = JSON.parse(row.settings) as Record<string, unknown>; } catch { /* empty */ }

  return parsePolicyFromSettings(settings);
}

/**
 * Update the password policy for a tenant.
 * Merges the new policy into the existing tenant settings JSON.
 */
export async function updatePasswordPolicy(
  tenantId: string,
  policy: Partial<PasswordPolicy>,
): Promise<PasswordPolicy> {
  const [row] = await db()
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

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
  await db()
    .update(tenants)
    .set({ settings: JSON.stringify(settings), updated_at: now })
    .where(eq(tenants.id, tenantId));

  return validated;
}
