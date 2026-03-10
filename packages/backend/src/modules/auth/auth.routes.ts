import { Router } from 'express';
import { z } from 'zod';
import { loginSchema, switchTenantSchema } from '@opsweave/shared';

import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { login, logout, getMe, switchTenant, changePassword, getPasswordPolicy } from './auth.controller.js';

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(1),
});

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

/**
 * PATCH /api/v1/auth/change-password
 * Protected — change current user's password.
 */
authRouter.patch(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  changePassword,
);

/**
 * GET /api/v1/auth/password-policy
 * Protected — get tenant's password policy.
 */
authRouter.get('/password-policy', requireAuth, getPasswordPolicy);

export { authRouter };
