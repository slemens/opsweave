import type { Request, Response } from 'express';

import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response.js';
import * as portalService from './portal.service.js';
import type { PortalRequest } from './portal.routes.js';
import type {
  PortalLoginInput,
  CreatePortalTicketInput,
  CreatePortalCommentInput,
  PaginationParams,
} from '@opsweave/shared';

// ─── Auth ────────────────────────────────────────────────────

/**
 * POST /api/v1/portal/auth/login
 * Public — no authentication required.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as PortalLoginInput;
  const result = await portalService.portalLogin(input);
  sendSuccess(res, result);
}

/**
 * GET /api/v1/portal/auth/me
 * Requires portal authentication.
 */
export async function me(req: Request, res: Response): Promise<void> {
  const { sub: portalUserId, tenantId } = (req as PortalRequest).portalUser;
  const result = await portalService.getPortalMe(tenantId, portalUserId);
  sendSuccess(res, result);
}

// ─── Tickets ─────────────────────────────────────────────────

/**
 * GET /api/v1/portal/tickets
 * Returns only tickets belonging to the portal user's customer.
 */
export async function listTickets(req: Request, res: Response): Promise<void> {
  const { tenantId, customerId } = (req as PortalRequest).portalUser;
  const params = req.query as unknown as PaginationParams;

  const { tickets, total } = await portalService.listPortalTickets(
    tenantId,
    customerId,
    params,
  );

  sendPaginated(res, tickets, total, params.page, params.limit);
}

/**
 * GET /api/v1/portal/tickets/:id
 * Returns a single ticket (verified against customer ownership) with
 * external comments.
 */
export async function getTicket(req: Request, res: Response): Promise<void> {
  const { tenantId, customerId } = (req as PortalRequest).portalUser;
  const { id } = req.params as { id: string };

  const result = await portalService.getPortalTicket(tenantId, customerId, id);
  sendSuccess(res, result);
}

/**
 * POST /api/v1/portal/tickets
 * Create a new ticket on behalf of the portal user's customer.
 */
export async function createTicket(req: Request, res: Response): Promise<void> {
  const { sub: portalUserId, tenantId, customerId } = (
    req as PortalRequest
  ).portalUser;
  const data = req.body as CreatePortalTicketInput;

  const ticket = await portalService.createPortalTicket(
    tenantId,
    customerId,
    portalUserId,
    data,
  );

  sendCreated(res, ticket);
}

/**
 * POST /api/v1/portal/tickets/:id/comments
 * Add an external comment to a ticket.
 */
export async function addComment(req: Request, res: Response): Promise<void> {
  const { sub: portalUserId, tenantId, customerId } = (
    req as PortalRequest
  ).portalUser;
  const { id } = req.params as { id: string };
  const data = req.body as CreatePortalCommentInput;

  const comment = await portalService.addPortalComment(
    tenantId,
    customerId,
    id,
    portalUserId,
    data,
  );

  sendCreated(res, comment);
}

// ─── Knowledge Base ──────────────────────────────────────────

/**
 * GET /api/v1/portal/kb
 * List publicly visible, published KB articles.
 */
export async function listKb(req: Request, res: Response): Promise<void> {
  const { tenantId } = (req as PortalRequest).portalUser;
  const q = typeof req.query['q'] === 'string' ? req.query['q'] : undefined;

  const articles = await portalService.listPublicKb(tenantId, q);
  sendSuccess(res, articles);
}

// ─── Service Catalog ──────────────────────────────────────────

/**
 * GET /api/v1/portal/services
 * List published service descriptions available for ordering.
 */
export async function listServices(req: Request, res: Response): Promise<void> {
  const { tenantId } = (req as PortalRequest).portalUser;
  const services = await portalService.listPortalServices(tenantId);
  sendSuccess(res, services);
}
