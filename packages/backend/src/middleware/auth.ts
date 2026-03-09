import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import type { RequestUser } from '../lib/context.js';

// ─── JWT payload shape ─────────────────────────────────────

interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
  activeTenantId: string;
  role: RequestUser['role'];
  isSuperAdmin: boolean;
  iat?: number;
  exp?: number;
}

// ─── Middleware: require authentication ─────────────────────

/**
 * Verifies the JWT from the `Authorization: Bearer <token>` header
 * and attaches the decoded user to `req.user`.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = header.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      displayName: decoded.displayName,
      activeTenantId: decoded.activeTenantId,
      role: decoded.role,
      isSuperAdmin: decoded.isSuperAdmin,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw err;
  }
}

// ─── Middleware factory: require specific roles ─────────────

/**
 * Returns middleware that asserts the authenticated user has one of
 * the specified roles within the active tenant.
 *
 * Usage: `router.post('/admin-only', requireAuth, requireRole('admin'), handler)`
 */
export function requireRole(...roles: RequestUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role) && !req.user.isSuperAdmin) {
      throw new ForbiddenError(
        `Requires one of roles: ${roles.join(', ')}`,
      );
    }

    next();
  };
}

/**
 * Returns middleware that asserts the authenticated user is a super-admin.
 */
export function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!req.user.isSuperAdmin) {
    throw new ForbiddenError('Super-admin access required');
  }

  next();
}
