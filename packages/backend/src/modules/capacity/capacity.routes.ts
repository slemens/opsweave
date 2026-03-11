import { Router } from 'express';

import { validate, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  createCapacityTypeSchema,
  setAssetCapacitySchema,
} from '@opsweave/shared';

import {
  listCapacityTypes,
  createCapacityType,
  updateCapacityType,
  deleteCapacityType,
  getAssetCapacities,
  setAssetCapacity,
  deleteAssetCapacity,
  getCapacityUtilization,
} from './capacity.controller.js';

const capacityRouter = Router();

// ── Capacity Types ──────────────────────────────────────────
capacityRouter.get('/types', listCapacityTypes);
capacityRouter.post('/types', validate(createCapacityTypeSchema), createCapacityType);
capacityRouter.put('/types/:id', validateParams(idParamSchema), updateCapacityType);
capacityRouter.delete('/types/:id', validateParams(idParamSchema), deleteCapacityType);

// ── Asset Capacities ────────────────────────────────────────
capacityRouter.get('/assets/:id', validateParams(idParamSchema), getAssetCapacities);
capacityRouter.post('/assets/:id', validateParams(idParamSchema), validate(setAssetCapacitySchema), setAssetCapacity);
capacityRouter.delete('/assets/:id/:cid', deleteAssetCapacity);
capacityRouter.get('/assets/:id/utilization', validateParams(idParamSchema), getCapacityUtilization);

export { capacityRouter };
