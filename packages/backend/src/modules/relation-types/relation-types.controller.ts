import type { Request, Response } from 'express';

import { sendSuccess, sendCreated, sendNoContent } from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as relationTypesService from './relation-types.service.js';
import type { CreateRelationTypeInput, UpdateRelationTypeInput } from '@opsweave/shared';

export async function listRelationTypes(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const activeOnly = req.query.active === 'true';
  const types = await relationTypesService.listRelationTypes(tenantId, activeOnly);
  sendSuccess(res, types);
}

export async function getRelationType(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const type = await relationTypesService.getRelationType(tenantId, id);
  sendSuccess(res, type);
}

export async function createRelationType(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const data = req.body as CreateRelationTypeInput;
  const type = await relationTypesService.createRelationType(tenantId, data);
  sendCreated(res, type);
}

export async function updateRelationType(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  const data = req.body as UpdateRelationTypeInput;
  const type = await relationTypesService.updateRelationType(tenantId, id, data);
  sendSuccess(res, type);
}

export async function deleteRelationType(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantId(req);
  const { id } = req.params as { id: string };
  await relationTypesService.deleteRelationType(tenantId, id);
  sendNoContent(res);
}
