import { Router } from 'express';

import { validate, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  createAssetTypeSchema,
  updateAssetTypeSchema,
} from '@opsweave/shared';

import {
  listAssetTypes,
  getAssetType,
  createAssetType,
  updateAssetType,
  deleteAssetType,
} from './asset-types.controller.js';

const assetTypeRouter = Router();

assetTypeRouter.get('/', listAssetTypes);
assetTypeRouter.post('/', validate(createAssetTypeSchema), createAssetType);
assetTypeRouter.get('/:id', validateParams(idParamSchema), getAssetType);
assetTypeRouter.put('/:id', validateParams(idParamSchema), validate(updateAssetTypeSchema), updateAssetType);
assetTypeRouter.delete('/:id', validateParams(idParamSchema), deleteAssetType);

export { assetTypeRouter };
