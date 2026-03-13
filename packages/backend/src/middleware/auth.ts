import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { getTokenFromCookie, CSRF_HEADER } from '../lib/cookie.js';
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
 * Verifies the JWT from either:
 * 1. httpOnly cookie `opsweave_token` (preferred, with CSRF validation)
 * 2. `Authorization: Bearer <token>` header (API clients, backward compat)
 *
 * When the token comes from a cookie, mutating requests (POST/PUT/PATCH/DELETE)
 * must include a valid `X-CSRF-Token` header matching the CSRF cookie.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  let token: string | null = null;
  let fromCookie = false;

  // 1. Try httpOnly cookie
  const cookieToken = getTokenFromCookie(req.cookies as Record<string, string>);
  if (cookieToken) {
    token = cookieToken;
    fromCookie = true;
  }

  // 2. Fall back to Authorization header
  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      token = header.slice(7);
    }
  }

  if (!token) {
    throw new UnauthorizedError('Missing authentication');
  }

  // CSRF validation for cookie-based auth on mutating requests
  if (fromCookie && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const csrfHeader = req.headers[CSRF_HEADER] as string | undefined;
    const csrfCookie = (req.cookies as Record<string, string>)?.['opsweave_csrf'];
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      throw new ForbiddenError('CSRF token mismatch');
    }
  }

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
