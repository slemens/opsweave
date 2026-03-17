import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { LicenseLimitError } from '../lib/errors.js';
import logger from '../lib/logger.js';

// ─── Community Edition default limits ──────────────────────
// These limits define the free Community Edition tier (see CLAUDE.md § 1 "Geschäftsmodell").
// When no valid Enterprise JWT is present, these caps are enforced.
// Enterprise licenses override these via the `limits` field in the JWT payload.

const COMMUNITY_MAX_ASSETS = 50;
const COMMUNITY_MAX_USERS = 5;
const COMMUNITY_MAX_WORKFLOWS = 3;
const COMMUNITY_MAX_FRAMEWORKS = 1;
const COMMUNITY_MAX_MONITORING_SOURCES = 1;

const COMMUNITY_LIMITS = {
  maxAssets: COMMUNITY_MAX_ASSETS,
  maxUsers: COMMUNITY_MAX_USERS,
  maxWorkflows: COMMUNITY_MAX_WORKFLOWS,
  maxFrameworks: COMMUNITY_MAX_FRAMEWORKS,
  maxMonitoringSources: COMMUNITY_MAX_MONITORING_SOURCES,
} as const;

// ─── Embedded public key for license validation ────────────
// The RSA-2048 public key (PEM) is embedded at build time.
// Customers can validate licenses fully offline — no license server needed.

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadPublicKey(): string {
  // Allow overriding via environment variable (e.g. for testing)
  if (process.env['LICENSE_PUBLIC_KEY']) {
    return process.env['LICENSE_PUBLIC_KEY'];
  }
  try {
    const pemPath = join(__dirname, '../lib/license-public-key.pem');
    return readFileSync(pemPath, 'utf8');
  } catch {
    // No PEM file present → Community Edition only
    return '';
  }
}

const LICENSE_PUBLIC_KEY = loadPublicKey();

// ─── License JWT payload ───────────────────────────────────

interface LicensePayload {
  iss: 'opsweave';
  sub: string;
  iat: number;
  exp: number;
  edition: 'enterprise';
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

// ─── Public validation helper ──────────────────────────────

/**
 * Validate a raw license JWT string against the embedded public key.
 *
 * Returns the decoded payload on success, or null when the JWT is absent,
 * invalid, or expired. Used by the /api/v1/license endpoint and the
 * POST /api/v1/license/activate route.
 */
export function validateLicenseKey(licenseKey: string | null | undefined): LicensePayload | null {
  if (!licenseKey || !LICENSE_PUBLIC_KEY) {
    return null;
  }
  try {
    return jwt.verify(licenseKey, LICENSE_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: 'opsweave',
    }) as LicensePayload;
  } catch (err) {
    logger.error({ err }, 'License validation failed');
    return null;
  }
}

// ─── Resolve effective limits from license ─────────────────

/**
 * Decode and validate the tenant's license key.
 * Returns enterprise limits on success, community limits on failure/absence.
 */
function resolveLimit(
  licenseKey: string | undefined | null,
  resource: keyof typeof COMMUNITY_LIMITS,
): number {
  if (!licenseKey || !LICENSE_PUBLIC_KEY) {
    return COMMUNITY_LIMITS[resource];
  }

  try {
    const decoded = jwt.verify(licenseKey, LICENSE_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: 'opsweave',
    }) as LicensePayload;

    const limit = decoded.limits[resource];
    // -1 means unlimited
    return limit === -1 ? Infinity : limit;
  } catch (err) {
    logger.warn({ err, resource }, 'License validation failed, falling back to community limits');
    return COMMUNITY_LIMITS[resource];
  }
}

// ─── Middleware factory ────────────────────────────────────

/**
 * Creates middleware that checks whether a resource limit has been reached.
 *
 * @param resource      Which limit to check (e.g. 'maxAssets').
 * @param countFn       Async function that returns the current count for the
 *                      active tenant. Receives the tenant ID.
 * @param licenseKeyFn  Optional async function that returns the tenant's
 *                      license_key (JWT string or null). Receives the tenant ID.
 *                      If omitted, Community Edition limits always apply.
 *
 * Usage:
 * ```ts
 * router.post('/assets',
 *   requireAuth,
 *   tenantMiddleware,
 *   checkLimit(
 *     'maxAssets',
 *     (tenantId) => assetService.countByTenant(tenantId),
 *     (tenantId) => tenantService.getLicenseKey(tenantId),
 *   ),
 *   createAssetHandler,
 * );
 * ```
 */
export function checkLimit(
  resource: keyof typeof COMMUNITY_LIMITS,
  countFn: (tenantId: string) => Promise<number>,
  licenseKeyFn?: (tenantId: string) => Promise<string | null | undefined>,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      next();
      return;
    }

    // Resolve the tenant's license key if a getter was provided
    const licenseKey = licenseKeyFn ? await licenseKeyFn(tenantId) : undefined;

    const limit = resolveLimit(licenseKey, resource);
    const current = await countFn(tenantId);

    if (current >= limit) {
      throw new LicenseLimitError(
        `Limit for ${resource} reached (${current}/${limit}). Upgrade to Enterprise for higher limits.`,
        { resource, current, limit },
      );
    }

    next();
  };
}

// ─── Pre-built guards for common resources ─────────────────

/**
 * Convenience: check asset limit.
 * The caller must supply the count function (to avoid circular deps).
 */
export function checkAssetLimit(countFn: (tenantId: string) => Promise<number>) {
  return checkLimit('maxAssets', countFn);
}

export function checkUserLimit(countFn: (tenantId: string) => Promise<number>) {
  return checkLimit('maxUsers', countFn);
}

export function checkWorkflowLimit(countFn: (tenantId: string) => Promise<number>) {
  return checkLimit('maxWorkflows', countFn);
}

export function checkFrameworkLimit(countFn: (tenantId: string) => Promise<number>) {
  return checkLimit('maxFrameworks', countFn);
}

export function checkMonitoringSourceLimit(countFn: (tenantId: string) => Promise<number>) {
  return checkLimit('maxMonitoringSources', countFn);
}

export { COMMUNITY_LIMITS };
