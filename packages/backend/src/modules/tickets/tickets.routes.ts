import { Router } from 'express';
import { z } from 'zod';

import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  ticketFilterSchema,
  createTicketSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
  assignTicketSchema,
  createCommentSchema,
  TICKET_PRIORITIES,
} from '@opsweave/shared';

import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  updateTicketStatus,
  assignTicket,
  updateTicketPriority,
  getTicketComments,
  addTicketComment,
  getTicketHistory,
  getTicketStats,
  getBoardData,
} from './tickets.controller.js';

const ticketRouter = Router();

// ─── Custom Schemas ─────────────────────────────────────

const updatePrioritySchema = z.object({
  priority: z.enum(TICKET_PRIORITIES),
});

// ─── Routes ─────────────────────────────────────────────

/**
 * GET /api/v1/tickets
 * List tickets with filtering and pagination.
 */
ticketRouter.get(
  '/',
  validateQuery(ticketFilterSchema),
  listTickets,
);

/**
 * POST /api/v1/tickets
 * Create a new ticket.
 */
ticketRouter.post(
  '/',
  validate(createTicketSchema),
  createTicket,
);

/**
 * GET /api/v1/tickets/stats
 * Get ticket statistics.
 * IMPORTANT: must be before /:id to avoid matching 'stats' as an ID.
 */
ticketRouter.get(
  '/stats',
  getTicketStats,
);

/**
 * GET /api/v1/tickets/board
 * Get board/Kanban data.
 * IMPORTANT: must be before /:id to avoid matching 'board' as an ID.
 */
ticketRouter.get(
  '/board',
  validateQuery(ticketFilterSchema),
  getBoardData,
);

/**
 * GET /api/v1/tickets/:id
 * Get a single ticket.
 */
ticketRouter.get(
  '/:id',
  validateParams(idParamSchema),
  getTicket,
);

/**
 * PUT /api/v1/tickets/:id
 * Update a ticket.
 */
ticketRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateTicketSchema),
  updateTicket,
);

/**
 * PATCH /api/v1/tickets/:id/status
 * Update ticket status only.
 */
ticketRouter.patch(
  '/:id/status',
  validateParams(idParamSchema),
  validate(updateTicketStatusSchema),
  updateTicketStatus,
);

/**
 * PATCH /api/v1/tickets/:id/assign
 * Assign ticket to user/group.
 */
ticketRouter.patch(
  '/:id/assign',
  validateParams(idParamSchema),
  validate(assignTicketSchema),
  assignTicket,
);

/**
 * PATCH /api/v1/tickets/:id/priority
 * Update ticket priority only.
 */
ticketRouter.patch(
  '/:id/priority',
  validateParams(idParamSchema),
  validate(updatePrioritySchema),
  updateTicketPriority,
);

/**
 * GET /api/v1/tickets/:id/comments
 * Get ticket comments.
 */
ticketRouter.get(
  '/:id/comments',
  validateParams(idParamSchema),
  getTicketComments,
);

/**
 * POST /api/v1/tickets/:id/comments
 * Add a comment to a ticket.
 */
ticketRouter.post(
  '/:id/comments',
  validateParams(idParamSchema),
  validate(createCommentSchema),
  addTicketComment,
);

/**
 * GET /api/v1/tickets/:id/history
 * Get ticket change history.
 */
ticketRouter.get(
  '/:id/history',
  validateParams(idParamSchema),
  getTicketHistory,
);

export { ticketRouter };
