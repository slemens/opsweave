import { Router } from 'express';

import { validate, validateParams, validateQuery } from '../../middleware/validate.js';
import {
  idParamSchema,
  createProjectSchema,
  updateProjectSchema,
  addProjectAssetSchema,
  projectFilterSchema,
} from '@opsweave/shared';

import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  listProjectAssets,
  addProjectAsset,
  removeProjectAsset,
  listProjectTickets,
} from './projects.controller.js';

const projectRouter = Router();

projectRouter.get('/', validateQuery(projectFilterSchema), listProjects);
projectRouter.post('/', validate(createProjectSchema), createProject);
projectRouter.get('/:id', validateParams(idParamSchema), getProject);
projectRouter.put('/:id', validateParams(idParamSchema), validate(updateProjectSchema), updateProject);
projectRouter.delete('/:id', validateParams(idParamSchema), deleteProject);

// Project-Asset links
projectRouter.get('/:id/assets', validateParams(idParamSchema), listProjectAssets);
projectRouter.post('/:id/assets', validateParams(idParamSchema), validate(addProjectAssetSchema), addProjectAsset);
projectRouter.delete('/:id/assets/:assetId', removeProjectAsset);

// Project tickets (via linked assets)
projectRouter.get('/:id/tickets', validateParams(idParamSchema), listProjectTickets);

export { projectRouter };
