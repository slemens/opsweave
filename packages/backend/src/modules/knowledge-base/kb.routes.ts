import { Router } from 'express';

import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  idAndTicketIdParamSchema,
  kbFilterSchema,
  createKbArticleSchema,
  updateKbArticleSchema,
} from '@opsweave/shared';

import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  linkToTicket,
  unlinkFromTicket,
} from './kb.controller.js';

const kbRouter = Router();

// =============================================================================
// KB Articles — CRUD
// =============================================================================

/**
 * GET /api/v1/kb/articles
 * List KB articles with pagination, search and filters.
 * Query params: page, limit, q, status, visibility, category, sort, order
 */
kbRouter.get(
  '/',
  validateQuery(kbFilterSchema),
  listArticles,
);

/**
 * POST /api/v1/kb/articles
 * Create a new KB article.
 */
kbRouter.post(
  '/',
  validate(createKbArticleSchema),
  createArticle,
);

/**
 * GET /api/v1/kb/articles/:id
 * Get a single KB article with linked ticket IDs.
 */
kbRouter.get(
  '/:id',
  validateParams(idParamSchema),
  getArticle,
);

/**
 * PUT /api/v1/kb/articles/:id
 * Update an existing KB article.
 */
kbRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateKbArticleSchema),
  updateArticle,
);

/**
 * DELETE /api/v1/kb/articles/:id
 * Delete a KB article and all its ticket links.
 */
kbRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  deleteArticle,
);

// =============================================================================
// Ticket Links
// =============================================================================

/**
 * POST /api/v1/kb/articles/:id/link/:ticketId
 * Link a KB article to a ticket. Idempotent.
 */
kbRouter.post(
  '/:id/link/:ticketId',
  validateParams(idAndTicketIdParamSchema),
  linkToTicket,
);

/**
 * DELETE /api/v1/kb/articles/:id/link/:ticketId
 * Remove a link between a KB article and a ticket.
 */
kbRouter.delete(
  '/:id/link/:ticketId',
  validateParams(idAndTicketIdParamSchema),
  unlinkFromTicket,
);

export { kbRouter };
