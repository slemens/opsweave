import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
import * as assetsService from './assets.service.js';
import type {
  AssetFilterParams,
  CreateAssetInput,
  UpdateAssetInput,
  CreateAssetRelationInput,
} from '@opsweave/shared';

// ─── List Assets ───────────────────────────────────────

/**
 * GET /api/v1/assets
 */
export async function listAssets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const params = ((req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query) as unknown as AssetFilterParams;

  const { assets, total } = await assetsService.listAssets(tenantId, params);
  sendPaginated(res, assets, total, params.page ?? 1, params.limit ?? 25);
}

// ─── Get Asset ─────────────────────────────────────────

/**
 * GET /api/v1/assets/:id
 */
export async function getAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const asset = await assetsService.getAsset(tenantId, id);
  sendSuccess(res, asset);
}

// ─── Create Asset ──────────────────────────────────────

/**
 * POST /api/v1/assets
 */
export async function createAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const userId = req.user!.id;
  const data = req.body as CreateAssetInput;

  const asset = await assetsService.createAsset(tenantId, data, userId);
  sendCreated(res, asset);
}

// ─── Update Asset ──────────────────────────────────────

/**
 * PUT /api/v1/assets/:id
 */
export async function updateAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const userId = req.user!.id;
  const data = req.body as UpdateAssetInput;

  const asset = await assetsService.updateAsset(tenantId, id, data, userId);
  sendSuccess(res, asset);
}

// ─── Delete Asset ──────────────────────────────────────

/**
 * DELETE /api/v1/assets/:id
 */
export async function deleteAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  await assetsService.deleteAsset(tenantId, id);
  sendNoContent(res);
}

// ─── Asset Relations ───────────────────────────────────

/**
 * GET /api/v1/assets/:id/relations
 */
export async function getAssetRelations(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const relations = await assetsService.getAssetRelations(tenantId, id);
  sendSuccess(res, relations);
}

/**
 * POST /api/v1/assets/:id/relations
 */
export async function createAssetRelation(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const userId = req.user!.id;
  const data = req.body as CreateAssetRelationInput;

  const relation = await assetsService.createAssetRelation(tenantId, data, userId);
  sendCreated(res, relation);
}

/**
 * DELETE /api/v1/assets/:id/relations/:rid
 */
export async function deleteAssetRelation(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { rid } = req.params as { id: string; rid: string };

  await assetsService.deleteAssetRelation(tenantId, rid);
  sendNoContent(res);
}

// ─── Stats ─────────────────────────────────────────────

/**
 * GET /api/v1/assets/stats
 */
export async function getAssetStats(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;

  const stats = await assetsService.getAssetStats(tenantId);
  sendSuccess(res, stats);
}

// ─── Asset Graph ───────────────────────────────────────

/**
 * GET /api/v1/assets/graph
 */
export async function getFullAssetGraph(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;

  const graph = await assetsService.getFullAssetGraph(tenantId);
  sendSuccess(res, graph);
}

/**
 * GET /api/v1/assets/:id/graph
 */
export async function getAssetGraph(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const graph = await assetsService.getAssetGraph(tenantId, id);
  sendSuccess(res, graph);
}

// ─── Asset Tickets ─────────────────────────────────────

/**
 * GET /api/v1/assets/:id/tickets
 */
export async function getAssetTickets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const tickets = await assetsService.getAssetTickets(tenantId, id);
  sendSuccess(res, tickets);
}
