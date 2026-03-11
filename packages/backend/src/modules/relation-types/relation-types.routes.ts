import { Router } from 'express';

import { validate, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  createRelationTypeSchema,
  updateRelationTypeSchema,
} from '@opsweave/shared';

import {
  listRelationTypes,
  getRelationType,
  createRelationType,
  updateRelationType,
  deleteRelationType,
} from './relation-types.controller.js';

const relationTypeRouter = Router();

relationTypeRouter.get('/', listRelationTypes);
relationTypeRouter.post('/', validate(createRelationTypeSchema), createRelationType);
relationTypeRouter.get('/:id', validateParams(idParamSchema), getRelationType);
relationTypeRouter.put('/:id', validateParams(idParamSchema), validate(updateRelationTypeSchema), updateRelationType);
relationTypeRouter.delete('/:id', validateParams(idParamSchema), deleteRelationType);

export { relationTypeRouter };
