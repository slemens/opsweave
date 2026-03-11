import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as projectsService from './projects.service.js';
import type { CreateProjectInput, UpdateProjectInput, AddProjectAssetInput, ProjectFilterParams } from '@opsweave/shared';

/**
 * GET /api/v1/projects
 */
export async function listProjects(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const params = req.query as unknown as ProjectFilterParams;
  const result = await projectsService.listProjects(tenantId, params);
  sendPaginated(res, result.data, result.total, params.page, params.limit);
}

/**
 * GET /api/v1/projects/:id
 */
export async function getProject(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const project = await projectsService.getProject(tenantId, id);
  sendSuccess(res, project);
}

/**
 * POST /api/v1/projects
 */
export async function createProject(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateProjectInput;
  const project = await projectsService.createProject(tenantId, data);
  sendCreated(res, project);
}

/**
 * PUT /api/v1/projects/:id
 */
export async function updateProject(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateProjectInput;
  const project = await projectsService.updateProject(tenantId, id, data);
  sendSuccess(res, project);
}

/**
 * DELETE /api/v1/projects/:id
 */
export async function deleteProject(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await projectsService.deleteProject(tenantId, id);
  sendNoContent(res);
}

/**
 * GET /api/v1/projects/:id/assets
 */
export async function listProjectAssets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const assets = await projectsService.listProjectAssets(tenantId, id);
  sendSuccess(res, assets);
}

/**
 * POST /api/v1/projects/:id/assets
 */
export async function addProjectAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as AddProjectAssetInput;
  const link = await projectsService.addProjectAsset(tenantId, id, data);
  sendCreated(res, link);
}

/**
 * DELETE /api/v1/projects/:id/assets/:assetId
 */
export async function removeProjectAsset(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, assetId } = req.params as { id: string; assetId: string };
  await projectsService.removeProjectAsset(tenantId, id, assetId);
  sendNoContent(res);
}

/**
 * GET /api/v1/projects/:id/tickets
 */
export async function listProjectTickets(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const projectTickets = await projectsService.listProjectTickets(tenantId, id);
  sendSuccess(res, projectTickets);
}
