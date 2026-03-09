import { Router } from 'express';

import { healthCheck, systemInfo } from './system.controller.js';

const systemRouter = Router();

/**
 * GET /api/v1/system/health
 * Public — no authentication required.
 */
systemRouter.get('/health', healthCheck);

/**
 * GET /api/v1/system/info
 * Public — no authentication required.
 */
systemRouter.get('/info', systemInfo);

export { systemRouter };
