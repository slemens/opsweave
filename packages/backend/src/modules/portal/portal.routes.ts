import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import {
  login,
  me,
  listTickets,
  getTicket,
  createTicket,
  addComment,
  listKb,
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

function requirePortalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Portal authentication required',
      },
    });
    return;
  }

  try {
    const JWT_SECRET =
      process.env['JWT_SECRET'] ?? 'opsweave-dev-secret-change-in-production';

    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      displayName: string;
      customerId: string;
      tenantId: string;
      portal: boolean;
    };

    if (!payload.portal) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Portal access required',
        },
      });
      return;
    }

    (req as PortalRequest).portalUser = payload;
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid portal token',
      },
    });
  }
}

// ─── Router ──────────────────────────────────────────────────

const portalRouter = Router();

/**
 * POST /portal/auth/login
 * Public — no auth required.
 */
portalRouter.post('/auth/login', login);

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
 * GET /portal/kb
 * List publicly visible, published KB articles.
 * Accepts optional ?q= search param.
 */
portalRouter.get('/kb', requirePortalAuth, listKb);

export { portalRouter };
