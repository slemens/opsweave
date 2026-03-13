import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId, requireUserId } from '../../lib/context.js';
import * as servicesService from './services.service.js';
import type {
  CreateServiceDescriptionInput,
  UpdateServiceDescriptionInput,
  CreateHorizontalCatalogInput,
  UpdateHorizontalCatalogInput,
  AddCatalogItemInput,
  ServiceDescriptionFilterParams,
  CatalogFilterParams,
} from '@opsweave/shared';

// ─── Service Descriptions ─────────────────────────────────

/**
 * GET /api/v1/services/descriptions
 */
export async function listServiceDescriptions(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const params = (
    (req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query
  ) as unknown as ServiceDescriptionFilterParams;

  const { serviceDescriptions, total } =
    await servicesService.listServiceDescriptions(tenantId, params);
  sendPaginated(res, serviceDescriptions, total, params.page ?? 1, params.limit ?? 25);
}

/**
 * GET /api/v1/services/descriptions/:id
 */
export async function getServiceDescription(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const description = await servicesService.getServiceDescription(tenantId, id);
  sendSuccess(res, description);
}

/**
 * POST /api/v1/services/descriptions
 */
export async function createServiceDescription(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const data = req.body as CreateServiceDescriptionInput;

  const description = await servicesService.createServiceDescription(tenantId, data, userId);
  sendCreated(res, description);
}

/**
 * PUT /api/v1/services/descriptions/:id
 */
export async function updateServiceDescription(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const userId = requireUserId(req);
  const data = req.body as UpdateServiceDescriptionInput;

  const description = await servicesService.updateServiceDescription(tenantId, id, data, userId);
  sendSuccess(res, description);
}

/**
 * DELETE /api/v1/services/descriptions/:id
 */
export async function deleteServiceDescription(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  await servicesService.deleteServiceDescription(tenantId, id);
  sendNoContent(res);
}

// ─── Horizontal Catalogs ──────────────────────────────────

/**
 * GET /api/v1/services/catalogs/horizontal
 */
export async function listHorizontalCatalogs(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const params = (
    (req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query
  ) as unknown as CatalogFilterParams;

  const { catalogs, total } = await servicesService.listHorizontalCatalogs(tenantId, params);
  sendPaginated(res, catalogs, total, params.page ?? 1, params.limit ?? 25);
}

/**
 * GET /api/v1/services/catalogs/horizontal/:id
 */
export async function getHorizontalCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  const catalog = await servicesService.getHorizontalCatalog(tenantId, id);
  sendSuccess(res, catalog);
}

/**
 * POST /api/v1/services/catalogs/horizontal
 */
export async function createHorizontalCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const userId = requireUserId(req);
  const data = req.body as CreateHorizontalCatalogInput;

  const catalog = await servicesService.createHorizontalCatalog(tenantId, data, userId);
  sendCreated(res, catalog);
}

/**
 * PUT /api/v1/services/catalogs/horizontal/:id
 */
export async function updateHorizontalCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateHorizontalCatalogInput;

  const catalog = await servicesService.updateHorizontalCatalog(tenantId, id, data);
  sendSuccess(res, catalog);
}

/**
 * DELETE /api/v1/services/catalogs/horizontal/:id
 */
export async function deleteHorizontalCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };

  await servicesService.deleteHorizontalCatalog(tenantId, id);
  sendNoContent(res);
}

/**
 * POST /api/v1/services/catalogs/horizontal/:id/items
 */
export async function addCatalogItem(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as AddCatalogItemInput;

  const catalog = await servicesService.addCatalogItem(tenantId, id, data.service_desc_id);
  sendSuccess(res, catalog);
}

/**
 * DELETE /api/v1/services/catalogs/horizontal/:id/items/:sid
 */
export async function removeCatalogItem(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, sid } = req.params as { id: string; sid: string };

  await servicesService.removeCatalogItem(tenantId, id, sid);
  sendNoContent(res);
}

// ─── Vertical Catalogs (Enterprise) ──────────────────────

/**
 * GET /api/v1/services/catalogs/vertical
 */
export async function listVerticalCatalogs(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const catalogs = await servicesService.listVerticalCatalogs(tenantId);
  sendSuccess(res, catalogs);
}

/**
 * GET /api/v1/services/catalogs/vertical/:id
 */
export async function getVerticalCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const catalog = await servicesService.getVerticalCatalog(tenantId, id);
  sendSuccess(res, catalog);
}

/**
 * POST /api/v1/services/catalogs/vertical
 */
export async function createVerticalCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const catalog = await servicesService.createVerticalCatalog(tenantId, req.body);
  sendCreated(res, catalog);
}

/**
 * PUT /api/v1/services/catalogs/vertical/:id
 */
export async function updateVerticalCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const catalog = await servicesService.updateVerticalCatalog(tenantId, id, req.body);
  sendSuccess(res, catalog);
}

/**
 * DELETE /api/v1/services/catalogs/vertical/:id
 */
export async function deleteVerticalCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await servicesService.deleteVerticalCatalog(tenantId, id);
  sendNoContent(res);
}

/**
 * POST /api/v1/services/catalogs/vertical/:id/overrides
 */
export async function addVerticalOverride(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const catalog = await servicesService.addVerticalOverride(tenantId, id, req.body);
  sendCreated(res, catalog);
}

/**
 * DELETE /api/v1/services/catalogs/vertical/:id/overrides/:oid
 */
export async function removeVerticalOverride(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id, oid } = req.params as { id: string; oid: string };
  await servicesService.removeVerticalOverride(tenantId, id, oid);
  sendNoContent(res);
}
