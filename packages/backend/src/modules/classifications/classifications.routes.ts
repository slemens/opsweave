import { Router } from 'express';
import { z } from 'zod';

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
classificationRouter.post('/', validate(createClassificationModelSchema), createClassificationModel);
classificationRouter.get('/:id', validateParams(idParamSchema), getClassificationModel);
classificationRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateClassificationModelSchema),
  updateClassificationModel,
);
classificationRouter.delete('/:id', validateParams(idParamSchema), deleteClassificationModel);

// ─── Value Routes ───────────────────────────────────────

classificationRouter.post(
  '/:id/values',
  validateParams(idParamSchema),
  validate(createClassificationValueSchema),
  createClassificationValue,
);
classificationRouter.put(
  '/:id/values/:vid',
  validateParams(modelValueParamsSchema),
  validate(createClassificationValueSchema.partial()),
  updateClassificationValue,
);
classificationRouter.delete(
  '/:id/values/:vid',
  validateParams(modelValueParamsSchema),
  deleteClassificationValue,
);

export { classificationRouter };
