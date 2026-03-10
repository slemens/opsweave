import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';

import { config } from '../../config/index.js';
import { getDb, type TypedDb } from '../../config/database.js';
import { sendSuccess } from '../../lib/response.js';
import { COMMUNITY_LIMITS, validateLicenseKey } from '../../middleware/license.js';
import { getTenantLicenseKey } from '../tenants/tenants.service.js';

// AUDIT-FIX: C-06 — Read version from package.json at startup (cached)
const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_VERSION = (() => {
  try {
    // From dist/modules/system/ → ../../../package.json = packages/backend/package.json
    const pkgPath = join(__dirname, '../../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
})();

// ─── Health Check ──────────────────────────────────────────

interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  db: 'connected' | 'degraded';
  dbError?: string;
  timestamp: string;
}

// AUDIT-FIX: C-04 — Real DB connectivity check with timeout
async function checkDbConnection(): Promise<{ status: 'connected' | 'degraded'; error?: string }> {
  try {
    const db = getDb() as TypedDb;

    // Race the SELECT 1 against a 3-second timeout
    const result = await Promise.race([
      // Drizzle run() executes raw SQL; SELECT 1 works on both PG and SQLite
      db.run(sql`SELECT 1`),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error('DB health check timed out after 3s')), 3000),
      ),
    ]);

    // If we get here, the query succeeded
    void result;
    return { status: 'connected' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown DB error';
    return { status: 'degraded', error: message };
  }
}

/**
 * GET /api/v1/system/health
 *
 * Returns the health status of the application.
 * No authentication required.
 */
export async function healthCheck(
  _req: Request,
  res: Response,
): Promise<void> {
  // AUDIT-FIX: C-04 — Execute real SELECT 1 instead of hardcoded 'connected'
  const dbCheck = await checkDbConnection();

  const health: HealthResponse = {
    status: dbCheck.status === 'connected' ? 'ok' : 'degraded',
    version: APP_VERSION,
    uptime: process.uptime(),
    db: dbCheck.status,
    timestamp: new Date().toISOString(),
  };

  if (dbCheck.error) {
    health.dbError = dbCheck.error;
  }

  const httpStatus = dbCheck.status === 'connected' ? 200 : 503;
  res.status(httpStatus).json({ data: health });
}

// ─── System Info ───────────────────────────────────────────

interface EditionLimits {
  maxAssets: number;
  maxUsers: number;
  maxWorkflows: number;
  maxFrameworks: number;
  maxMonitoringSources: number;
}

interface InfoResponse {
  version: string;
  edition: 'community' | 'enterprise';
  dbDriver: string;
  queueDriver: string;
  defaultLanguage: string;
  limits: EditionLimits;
}

// AUDIT-FIX: C-05 — Determine edition from tenant license
// Editions:
//   'community' — No license key, or invalid/expired license → default COMMUNITY_LIMITS apply
//   'enterprise' — Valid RS256-signed JWT with edition='enterprise' → limits from JWT payload
async function resolveEdition(tenantId: string | undefined): Promise<{
  edition: 'community' | 'enterprise';
  limits: EditionLimits;
}> {
  if (!tenantId) {
    // No tenant context (public endpoint without auth) → community
    return { edition: 'community', limits: { ...COMMUNITY_LIMITS } };
  }

  try {
    const licenseKey = await getTenantLicenseKey(tenantId);
    if (!licenseKey) {
      return { edition: 'community', limits: { ...COMMUNITY_LIMITS } };
    }

    const payload = validateLicenseKey(licenseKey);
    if (!payload) {
      return { edition: 'community', limits: { ...COMMUNITY_LIMITS } };
    }

    return {
      edition: 'enterprise',
      limits: {
        maxAssets: payload.limits.maxAssets,
        maxUsers: payload.limits.maxUsers,
        maxWorkflows: payload.limits.maxWorkflows,
        maxFrameworks: payload.limits.maxFrameworks,
        maxMonitoringSources: payload.limits.maxMonitoringSources,
      },
    };
  } catch {
    return { edition: 'community', limits: { ...COMMUNITY_LIMITS } };
  }
}

/**
 * GET /api/v1/system/info
 *
 * Returns public system information and current edition limits.
 * No authentication required — but if a valid JWT is present,
 * the tenant's actual license is used to determine the edition.
 */
export async function systemInfo(
  req: Request,
  res: Response,
): Promise<void> {
  // tenantId is optionally set by upstream auth/tenant middleware
  const tenantId = req.tenantId ?? undefined;

  const { edition, limits } = await resolveEdition(tenantId);

  const info: InfoResponse = {
    version: APP_VERSION,
    edition,
    dbDriver: config.dbDriver,
    queueDriver: config.queueDriver,
    defaultLanguage: config.defaultLanguage,
    limits,
  };

  sendSuccess(res, info);
}
