import type { Request, Response } from 'express';

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as serviceProfilesService from './service-profiles.service.js';
import type { CreateServiceProfileInput, UpdateServiceProfileInput, CreateServiceEntitlementInput } from '@opsweave/shared';

// =============================================================================
// Service Profiles
// =============================================================================

/**
 * GET /api/v1/service-profiles
 */
export async function listServiceProfiles(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const profiles = await serviceProfilesService.listServiceProfiles(tenantId);
  sendSuccess(res, profiles);
}

/**
 * GET /api/v1/service-profiles/:id
 */
export async function getServiceProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const profile = await serviceProfilesService.getServiceProfile(tenantId, id);
  sendSuccess(res, profile);
}

/**
 * POST /api/v1/service-profiles
 */
export async function createServiceProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateServiceProfileInput;
  const profile = await serviceProfilesService.createServiceProfile(tenantId, data);
  sendCreated(res, profile);
}

/**
 * PUT /api/v1/service-profiles/:id
 */
export async function updateServiceProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateServiceProfileInput;
  const profile = await serviceProfilesService.updateServiceProfile(tenantId, id, data);
  sendSuccess(res, profile);
}

/**
 * DELETE /api/v1/service-profiles/:id
 */
export async function deleteServiceProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await serviceProfilesService.deleteServiceProfile(tenantId, id);
  sendNoContent(res);
}

// =============================================================================
// Service Entitlements
// =============================================================================

/**
 * GET /api/v1/service-profiles/entitlements
 */
export async function listServiceEntitlements(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const filters = {
    customer_id: req.query.customer_id as string | undefined,
    service_id: req.query.service_id as string | undefined,
  };
  const entitlements = await serviceProfilesService.listServiceEntitlements(tenantId, filters);
  sendSuccess(res, entitlements);
}

/**
 * POST /api/v1/service-profiles/entitlements
 */
export async function createServiceEntitlement(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateServiceEntitlementInput;
  const entitlement = await serviceProfilesService.createServiceEntitlement(tenantId, data);
  sendCreated(res, entitlement);
}

/**
 * DELETE /api/v1/service-profiles/entitlements/:id
 */
export async function deleteServiceEntitlement(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await serviceProfilesService.deleteServiceEntitlement(tenantId, id);
  sendNoContent(res);
}
