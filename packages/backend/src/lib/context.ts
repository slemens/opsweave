/**
 * Module augmentation for Express Request.
 *
 * Adds OpsWeave-specific properties that middleware attaches
 * to every authenticated request.
 */

/** Minimal user payload stored in the JWT / session. */
export interface RequestUser {
  /** User UUID */
  id: string;
  /** E-mail address */
  email: string;
  /** Display name */
  displayName: string;
  /** Active tenant UUID */
  activeTenantId: string;
  /** Role within the active tenant */
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  /** Whether the user is a cross-tenant super-admin */
  isSuperAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Authenticated user payload (set by auth middleware). */
      user?: RequestUser;
      /** Active tenant UUID (set by tenant middleware). */
      tenantId?: string;
      /** Unique request identifier for tracing. */
      requestId?: string;
      /** Resolved language for i18n (e.g. 'de', 'en'). */
      language?: string;
    }
  }
}

// ─── AUDIT-FIX: M-04 — Safe context accessors ────────────────────
// Replace non-null assertions (req.tenantId!, req.user!) with guarded helpers
// that throw UnauthorizedError if the middleware hasn't set the expected values.

import type { Request } from 'express';
import { UnauthorizedError } from './errors.js';

/**
 * Safely extract the tenant ID from the request.
 * Throws UnauthorizedError if missing (middleware not applied or auth failed).
 */
export function requireTenantId(req: Request): string {
  const tenantId = req.tenantId;
  if (!tenantId) throw new UnauthorizedError('Missing tenant context');
  return tenantId;
}

/**
 * Safely extract the authenticated user from the request.
 * Throws UnauthorizedError if missing.
 */
export function requireUser(req: Request): RequestUser {
  const user = req.user;
  if (!user) throw new UnauthorizedError('Missing user context');
  return user;
}

/**
 * Safely extract the authenticated user's ID from the request.
 * Throws UnauthorizedError if missing.
 */
export function requireUserId(req: Request): string {
  return requireUser(req).id;
}
