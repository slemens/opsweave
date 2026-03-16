import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
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
  getUtilizationOverview,
  findCompatibleHosts,
  checkMigrationFeasibility,
  getOverprovisionedAssets,
} from './capacity.controller.js';

const capacityRouter = Router();

// ── Capacity Types ──────────────────────────────────────────
capacityRouter.get('/types', listCapacityTypes);
capacityRouter.post('/types', requireRole('admin'), validate(createCapacityTypeSchema), createCapacityType);
capacityRouter.put('/types/:id', requireRole('admin'), validateParams(idParamSchema), updateCapacityType);
capacityRouter.delete('/types/:id', requireRole('admin'), validateParams(idParamSchema), deleteCapacityType);

// ── Capacity Planning (REQ-3.4a / REQ-3.4b) ────────────────
capacityRouter.get('/utilization', getUtilizationOverview);
capacityRouter.get('/compatible', findCompatibleHosts);
capacityRouter.get('/migration-check', checkMigrationFeasibility);
capacityRouter.get('/overprovisioned', getOverprovisionedAssets);

// ── Asset Capacities ────────────────────────────────────────
capacityRouter.get('/assets/:id', validateParams(idParamSchema), getAssetCapacities);
capacityRouter.post('/assets/:id', requireRole('admin'), validateParams(idParamSchema), validate(setAssetCapacitySchema), setAssetCapacity);
capacityRouter.delete('/assets/:id/:cid', requireRole('admin'), deleteAssetCapacity);
capacityRouter.get('/assets/:id/utilization', validateParams(idParamSchema), getCapacityUtilization);

export { capacityRouter };
