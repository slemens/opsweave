import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../../lib/errors.js';
import { sendSuccess } from '../../lib/response.js';
import {
  login,
  me,
  listTickets,
  getTicket,
  createTicket,
  addComment,
  listKb,
  listServices,
} from './portal.controller.js';

// ─── Portal Request Extension ────────────────────────────────

export interface PortalUser {
  sub: string;
  email: string;
  displayName: string;
  customerId: string;
  tenantId: string;
  portal: boolean;
}

export interface PortalRequest extends Request {
  portalUser: PortalUser;
}

// ─── Portal Auth Middleware ──────────────────────────────────

// so the global error handler formats responses consistently.
function requirePortalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new UnauthorizedError('Portal authentication required');
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      email: string;
      displayName: string;
      customerId: string;
      tenantId: string;
      portal: boolean;
    };

    if (!payload.portal) {
      throw new ForbiddenError('Portal access required');
    }

    (req as PortalRequest).portalUser = payload;
    next();
  } catch (err) {
    // Re-throw our own errors (UnauthorizedError, ForbiddenError) as-is
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }
    // jwt.verify failures (expired, malformed, etc.)
    throw new UnauthorizedError('Invalid portal token');
  }
}

// ─── Router ──────────────────────────────────────────────────

const portalRouter = Router();

/**
 * POST /portal/auth/login
 * Public — no auth required.
 */
portalRouter.post('/auth/login', login);

// With stateless JWT auth there is no server-side session to invalidate.
// The client discards the token. This endpoint exists for API completeness
// and to allow future token-blacklist integration.
/**
 * POST /portal/auth/logout
 * Stateless logout — client should discard the token.
 */
portalRouter.post('/auth/logout', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Logged out' });
});

/**
 * GET /portal/auth/me
 * Returns the authenticated portal user + customer info.
 */
portalRouter.get('/auth/me', requirePortalAuth, me);

/**
 * GET /portal/tickets
 * List tickets for the portal user's customer.
 */
portalRouter.get('/tickets', requirePortalAuth, listTickets);

/**
 * GET /portal/tickets/:id
 * Get a single ticket with external comments.
 */
portalRouter.get('/tickets/:id', requirePortalAuth, getTicket);

/**
 * POST /portal/tickets
 * Create a new ticket.
 */
portalRouter.post('/tickets', requirePortalAuth, createTicket);

/**
 * POST /portal/tickets/:id/comments
 * Add an external comment to a ticket.
 */
portalRouter.post('/tickets/:id/comments', requirePortalAuth, addComment);

/**
 * GET /portal/services
 * List published service descriptions available for ordering.
 */
portalRouter.get('/services', requirePortalAuth, listServices);

/**
 * GET /portal/kb
 * List publicly visible, published KB articles.
 * Accepts optional ?q= search param.
 */
portalRouter.get('/kb', requirePortalAuth, listKb);

export { portalRouter };
