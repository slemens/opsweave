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

// This file must be a module so the augmentation works.
export {};
