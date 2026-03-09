import { Router } from 'express';
import { loginSchema, switchTenantSchema } from '@opsweave/shared';

import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { login, logout, getMe, switchTenant } from './auth.controller.js';

// ─── Auth Router ────────────────────────────────────────────

const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Public — no authentication required.
 */
authRouter.post('/login', validate(loginSchema), login);

/**
 * POST /api/v1/auth/logout
 * Public — stateless JWT logout (client discards token).
 */
authRouter.post('/logout', logout);

/**
 * GET /api/v1/auth/me
 * Protected — requires valid JWT.
 */
authRouter.get('/me', requireAuth, getMe);

/**
 * POST /api/v1/auth/switch-tenant
 * Protected — requires valid JWT.
 */
authRouter.post(
  '/switch-tenant',
  requireAuth,
  validate(switchTenantSchema),
  switchTenant,
);

export { authRouter };
