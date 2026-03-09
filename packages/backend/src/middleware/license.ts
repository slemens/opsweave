import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { LicenseLimitError } from '../lib/errors.js';

// ─── Community Edition default limits ──────────────────────

const COMMUNITY_LIMITS = {
  maxAssets: 50,
  maxUsers: 5,
  maxWorkflows: 3,
  maxFrameworks: 1,
  maxMonitoringSources: 1,
} as const;

// ─── Embedded public key for license validation ────────────
// In production this would be the RS256 public key.
// Placeholder for now — replaced during build or injected via env.

const LICENSE_PUBLIC_KEY = process.env['LICENSE_PUBLIC_KEY'] ?? '';

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
  } catch {
    // Invalid or expired → fall back to community
    return COMMUNITY_LIMITS[resource];
  }
}

// ─── Middleware factory ────────────────────────────────────

/**
 * Creates middleware that checks whether a resource limit has been reached.
 *
 * @param resource  Which limit to check (e.g. 'maxAssets').
 * @param countFn   Async function that returns the current count for the
 *                  active tenant. Receives the tenant ID.
 *
 * Usage:
 * ```ts
 * router.post('/assets',
 *   requireAuth,
 *   tenantMiddleware,
 *   checkLimit('maxAssets', (tenantId) => assetService.countByTenant(tenantId)),
 *   createAssetHandler,
 * );
 * ```
 */
export function checkLimit(
  resource: keyof typeof COMMUNITY_LIMITS,
  countFn: (tenantId: string) => Promise<number>,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      next();
      return;
    }

    // TODO: read license_key from tenant record in DB
    // For now we pass undefined → community limits apply
    const licenseKey: string | undefined = undefined;

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
