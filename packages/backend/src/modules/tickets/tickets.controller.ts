import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '../../lib/response.js';
import * as ticketsService from './tickets.service.js';
import type {
  TicketFilterParams,
  CreateTicketInput,
  UpdateTicketInput,
  UpdateTicketStatusInput,
  AssignTicketInput,
  CreateCommentInput,
} from '@opsweave/shared';

// ─── List Tickets ───────────────────────────────────────

/**
 * GET /api/v1/tickets
 */
export async function listTickets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const params = ((req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query) as unknown as TicketFilterParams;

  const { tickets, total } = await ticketsService.listTickets(tenantId, params);
  sendPaginated(res, tickets, total, params.page ?? 1, params.limit ?? 25);
}

// ─── Get Ticket ─────────────────────────────────────────

/**
 * GET /api/v1/tickets/:id
 */
export async function getTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const ticket = await ticketsService.getTicket(tenantId, id);
  sendSuccess(res, ticket);
}

// ─── Create Ticket ──────────────────────────────────────

/**
 * POST /api/v1/tickets
 */
export async function createTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const creatorId = req.user!.id;
  const data = req.body as CreateTicketInput;

  const ticket = await ticketsService.createTicket(tenantId, data, creatorId);
  sendCreated(res, ticket);
}

// ─── Update Ticket ──────────────────────────────────────

/**
 * PUT /api/v1/tickets/:id
 */
export async function updateTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const userId = req.user!.id;
  const data = req.body as UpdateTicketInput;

  const ticket = await ticketsService.updateTicket(tenantId, id, data, userId);
  sendSuccess(res, ticket);
}

// ─── Update Ticket Status ───────────────────────────────

/**
 * PATCH /api/v1/tickets/:id/status
 */
export async function updateTicketStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const userId = req.user!.id;
  const data = req.body as UpdateTicketStatusInput;

  const ticket = await ticketsService.updateTicketStatus(
    tenantId,
    id,
    data.status,
    userId,
  );
  sendSuccess(res, ticket);
}

// ─── Assign Ticket ──────────────────────────────────────

/**
 * PATCH /api/v1/tickets/:id/assign
 */
export async function assignTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const userId = req.user!.id;
  const data = req.body as AssignTicketInput;

  const ticket = await ticketsService.assignTicket(
    tenantId,
    id,
    data.assignee_id,
    data.assignee_group_id,
    userId,
  );
  sendSuccess(res, ticket);
}

// ─── Update Ticket Priority ─────────────────────────────

/**
 * PATCH /api/v1/tickets/:id/priority
 */
export async function updateTicketPriority(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const userId = req.user!.id;
  const { priority } = req.body as { priority: string };

  const ticket = await ticketsService.updateTicketPriority(
    tenantId,
    id,
    priority,
    userId,
  );
  sendSuccess(res, ticket);
}

// ─── Get Ticket Comments ────────────────────────────────

/**
 * GET /api/v1/tickets/:id/comments
 */
export async function getTicketComments(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const comments = await ticketsService.getTicketComments(tenantId, id);
  sendSuccess(res, comments);
}

// ─── Add Ticket Comment ─────────────────────────────────

/**
 * POST /api/v1/tickets/:id/comments
 */
export async function addTicketComment(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const authorId = req.user!.id;
  const data = req.body as CreateCommentInput;

  const comment = await ticketsService.addTicketComment(
    tenantId,
    id,
    data,
    authorId,
  );
  sendCreated(res, comment);
}

// ─── Get Ticket History ─────────────────────────────────

/**
 * GET /api/v1/tickets/:id/history
 */
export async function getTicketHistory(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const history = await ticketsService.getTicketHistory(tenantId, id);
  sendSuccess(res, history);
}

// ─── Ticket Stats ───────────────────────────────────────

/**
 * GET /api/v1/tickets/stats
 */
export async function getTicketStats(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;

  const stats = await ticketsService.getTicketStats(tenantId);
  sendSuccess(res, stats);
}

// ─── Board Data ─────────────────────────────────────────

/**
 * GET /api/v1/tickets/board
 */
export async function getBoardData(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const params = req.query as unknown as TicketFilterParams;

  const board = await ticketsService.getBoardData(tenantId, params);
  sendSuccess(res, board);
}

// ─── Child Tickets ──────────────────────────────────────

/**
 * GET /api/v1/tickets/:id/children
 */
export async function getChildTickets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const children = await ticketsService.getChildTickets(tenantId, id);
  sendSuccess(res, children);
}

// ─── Categories ────────────────────────────────────────

/**
 * GET /api/v1/tickets/categories
 */
export async function listCategoriesCtrl(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const categories = await ticketsService.listCategories(tenantId);
  sendSuccess(res, categories);
}

/**
 * POST /api/v1/tickets/categories
 */
export async function createCategoryCtrl(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { name, applies_to } = req.body as { name: string; applies_to?: string };
  const category = await ticketsService.createCategory(tenantId, { name, applies_to });
  sendCreated(res, category);
}

/**
 * PUT /api/v1/tickets/categories/:id
 */
export async function updateCategoryCtrl(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const data = req.body as { name?: string; applies_to?: string; is_active?: number };
  const category = await ticketsService.updateCategory(tenantId, id, data);
  sendSuccess(res, category);
}
