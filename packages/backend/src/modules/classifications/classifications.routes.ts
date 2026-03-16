import { Router } from 'express';
import { z } from 'zod';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  createClassificationModelSchema,
  updateClassificationModelSchema,
  createClassificationValueSchema,
} from '@opsweave/shared';

import {
  listClassificationModels,
  getClassificationModel,
  createClassificationModel,
  updateClassificationModel,
  deleteClassificationModel,
  createClassificationValue,
  updateClassificationValue,
  deleteClassificationValue,
} from './classifications.controller.js';

// Param schema for routes with :id and :vid
const modelValueParamsSchema = z.object({
  id: z.string().uuid(),
  vid: z.string().uuid(),
});

const classificationRouter = Router();

// ─── Model Routes ───────────────────────────────────────

classificationRouter.get('/', listClassificationModels);
classificationRouter.post('/', requireRole('admin'), validate(createClassificationModelSchema), createClassificationModel);
classificationRouter.get('/:id', validateParams(idParamSchema), getClassificationModel);
classificationRouter.put(
  '/:id',
  requireRole('admin'),
  validateParams(idParamSchema),
  validate(updateClassificationModelSchema),
  updateClassificationModel,
);
classificationRouter.delete('/:id', requireRole('admin'), validateParams(idParamSchema), deleteClassificationModel);

// ─── Value Routes ───────────────────────────────────────

classificationRouter.post(
  '/:id/values',
  requireRole('admin'),
  validateParams(idParamSchema),
  validate(createClassificationValueSchema),
  createClassificationValue,
);
classificationRouter.put(
  '/:id/values/:vid',
  requireRole('admin'),
  validateParams(modelValueParamsSchema),
  validate(createClassificationValueSchema.partial()),
  updateClassificationValue,
);
classificationRouter.delete(
  '/:id/values/:vid',
  requireRole('admin'),
  validateParams(modelValueParamsSchema),
  deleteClassificationValue,
);

export { classificationRouter };
