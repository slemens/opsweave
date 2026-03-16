import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
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
relationTypeRouter.post('/', requireRole('admin'), validate(createRelationTypeSchema), createRelationType);
relationTypeRouter.get('/:id', validateParams(idParamSchema), getRelationType);
relationTypeRouter.put('/:id', requireRole('admin'), validateParams(idParamSchema), validate(updateRelationTypeSchema), updateRelationType);
relationTypeRouter.delete('/:id', requireRole('admin'), validateParams(idParamSchema), deleteRelationType);

export { relationTypeRouter };
