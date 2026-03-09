import type { Request, Response } from 'express';

import { config } from '../../config/index.js';
import { sendSuccess } from '../../lib/response.js';
import { COMMUNITY_LIMITS } from '../../middleware/license.js';

// Read version from package.json at module level
const APP_VERSION = '0.1.0';

// ─── Health Check ──────────────────────────────────────────

interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  db: 'connected' | 'disconnected';
  timestamp: string;
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
  // TODO: once DB is initialised, add a real connectivity check
  const dbStatus = 'connected' as const;

  const health: HealthResponse = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    version: APP_VERSION,
    uptime: process.uptime(),
    db: dbStatus,
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, health);
}

// ─── System Info ───────────────────────────────────────────

interface InfoResponse {
  version: string;
  edition: 'community' | 'enterprise';
  dbDriver: string;
  queueDriver: string;
  defaultLanguage: string;
  limits: {
    maxAssets: number;
    maxUsers: number;
    maxWorkflows: number;
    maxFrameworks: number;
    maxMonitoringSources: number;
  };
}

/**
 * GET /api/v1/system/info
 *
 * Returns public system information and current edition limits.
 * No authentication required.
 */
export function systemInfo(
  _req: Request,
  res: Response,
): void {
  // TODO: read actual license to determine edition
  const info: InfoResponse = {
    version: APP_VERSION,
    edition: 'community',
    dbDriver: config.dbDriver,
    queueDriver: config.queueDriver,
    defaultLanguage: config.defaultLanguage,
    limits: { ...COMMUNITY_LIMITS },
  };

  sendSuccess(res, info);
}
