import { Router } from 'express';
import { z } from 'zod';

import { requireRole } from '../../middleware/auth.js';
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
  TICKET_STATUSES,
  CAB_DECISIONS,
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
  getChildTickets,
  listCategoriesCtrl,
  createCategoryCtrl,
  updateCategoryCtrl,
  deleteCategoryCtrl,
  getTicketTimeline,
  getTicketsByCustomer,
  archiveTicketCtrl,
  batchUpdateTickets,
  listCabPending,
  listCabAll,
  setCabDecision,
} from './tickets.controller.js';
import { getTicketWorkflow as _getTicketWorkflow } from '../workflows/workflows.controller.js';

const ticketRouter = Router();

// ─── Custom Schemas ─────────────────────────────────────

const updatePrioritySchema = z.object({
  priority: z.enum(TICKET_PRIORITIES),
});

const cabDecisionSchema = z.object({
  decision: z.enum(CAB_DECISIONS),
  notes: z.string().max(5000).optional(),
});

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
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
 * GET /api/v1/tickets/stats/timeline
 * Get ticket volume timeline (last N days).
 * IMPORTANT: must be before /:id to avoid matching 'stats' as an ID.
 */
ticketRouter.get('/stats/timeline', getTicketTimeline);

/**
 * GET /api/v1/tickets/stats/by-customer
 * Get top N customers by ticket count.
 * IMPORTANT: must be before /:id to avoid matching 'stats' as an ID.
 */
ticketRouter.get('/stats/by-customer', getTicketsByCustomer);

/**
 * GET /api/v1/tickets/categories
 * List ticket categories.
 */
ticketRouter.get('/categories', listCategoriesCtrl);

/**
 * POST /api/v1/tickets/categories
 * Create a ticket category.
 */
ticketRouter.post('/categories', requireRole('admin', 'manager'), validate(categorySchema), createCategoryCtrl);

/**
 * PUT /api/v1/tickets/categories/:id
 * Update a ticket category.
 */
ticketRouter.put('/categories/:id', requireRole('admin', 'manager'), validateParams(idParamSchema), validate(categorySchema), updateCategoryCtrl);

/**
 * DELETE /api/v1/tickets/categories/:id
 * Delete a ticket category.
 */
ticketRouter.delete('/categories/:id', requireRole('admin', 'manager'), validateParams(idParamSchema), deleteCategoryCtrl);

// ─── Batch Update Schema ────────────────────────────────

const batchUpdateSchema = z.object({
  ticket_ids: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assigned_to: z.string().uuid().nullable().optional(),
    assigned_group: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
  }).refine(obj => Object.values(obj).some(v => v !== undefined), {
    message: 'At least one update field is required',
  }),
});

/**
 * PATCH /api/v1/tickets/batch
 * Batch update multiple tickets.
 * IMPORTANT: must be before /:id to avoid matching 'batch' as an ID.
 */
ticketRouter.patch(
  '/batch',
  validate(batchUpdateSchema),
  batchUpdateTickets,
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
 * PATCH /api/v1/tickets/:id/archive
 * Archive a ticket.
 */
ticketRouter.patch(
  '/:id/archive',
  validateParams(idParamSchema),
  archiveTicketCtrl,
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

/**
 * GET /api/v1/tickets/:id/children
 * Get child tickets.
 */
ticketRouter.get(
  '/:id/children',
  validateParams(idParamSchema),
  getChildTickets,
);

// The workflow controller expects req.params.ticketId, so we remap :id → ticketId.
ticketRouter.get(
  '/:id/workflow',
  validateParams(idParamSchema),
  (req, res, next) => {
    req.params['ticketId'] = req.params['id']!;
    _getTicketWorkflow(req, res).catch(next);
  },
);

// ─── CAB (Change Advisory Board) ────────────────────────

ticketRouter.get('/cab/pending', listCabPending);
ticketRouter.get('/cab/all', listCabAll);
ticketRouter.post('/:id/cab/decision', requireRole('admin', 'manager'), validateParams(idParamSchema), validate(cabDecisionSchema), setCabDecision);

export { ticketRouter };
