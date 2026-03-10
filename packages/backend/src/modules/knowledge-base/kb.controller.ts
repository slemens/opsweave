import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
// AUDIT-FIX: M-04 — Safe context accessors instead of non-null assertions
import { requireTenantId, requireUserId } from '../../lib/context.js';
import * as kbService from './kb.service.js';
import type { CreateKbArticleInput, UpdateKbArticleInput, KbFilterParams } from '@opsweave/shared';

// =============================================================================
// KB Articles
// =============================================================================

/**
 * GET /api/v1/kb/articles
 * List KB articles with pagination and optional filters.
 */
export async function listArticles(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const params = (
    (req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query
  ) as unknown as KbFilterParams;

  const { articles, total } = await kbService.listKbArticles(tenantId, params);
  sendPaginated(res, articles, total, params.page ?? 1, params.limit ?? 25);
}

/**
 * GET /api/v1/kb/articles/:id
 * Get a single KB article with linked ticket IDs.
 */
export async function getArticle(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const article = await kbService.getKbArticle(tenantId, id);
  sendSuccess(res, article);
}

/**
 * POST /api/v1/kb/articles
 * Create a new KB article.
 */
export async function createArticle(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const data = req.body as CreateKbArticleInput;

  const article = await kbService.createKbArticle(tenantId, data, userId);
  sendCreated(res, article);
}

/**
 * PUT /api/v1/kb/articles/:id
 * Update an existing KB article.
 */
export async function updateArticle(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateKbArticleInput;

  const article = await kbService.updateKbArticle(tenantId, id, data);
  sendSuccess(res, article);
}

/**
 * DELETE /api/v1/kb/articles/:id
 * Delete a KB article and its ticket links.
 */
export async function deleteArticle(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  await kbService.deleteKbArticle(tenantId, id);
  sendNoContent(res);
}

/**
 * POST /api/v1/kb/articles/:id/link/:ticketId
 * Link a KB article to a ticket.
 */
export async function linkToTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, ticketId } = req.params as { id: string; ticketId: string };

  await kbService.linkArticleToTicket(tenantId, id, ticketId);
  sendNoContent(res);
}

/**
 * GET /api/v1/kb/articles/search
 * Full-text search across published KB articles with relevance scoring.
 */
export function searchArticles(
  req: Request,
  res: Response,
): void {
  const tenantId = requireTenantId(req);
  const q = typeof req.query['q'] === 'string' ? req.query['q'] : '';
  const visibility = typeof req.query['visibility'] === 'string' ? req.query['visibility'] : undefined;
  const limit = parseInt(req.query['limit'] as string, 10) || 20;

  const results = kbService.searchKbArticles(tenantId, q, { visibility, limit });
  sendSuccess(res, results);
}

/**
 * DELETE /api/v1/kb/articles/:id/link/:ticketId
 * Remove a link between a KB article and a ticket.
 */
export async function unlinkFromTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, ticketId } = req.params as { id: string; ticketId: string };

  await kbService.unlinkArticleFromTicket(tenantId, id, ticketId);
  sendNoContent(res);
}
