import { Router } from 'express';

import { validate, validateParams } from '../../middleware/validate.js';
import {
  idParamSchema,
  createServiceProfileSchema,
  updateServiceProfileSchema,
  createServiceEntitlementSchema,
} from '@opsweave/shared';

import {
  listServiceProfiles,
  getServiceProfile,
  createServiceProfile,
  updateServiceProfile,
  deleteServiceProfile,
  listServiceEntitlements,
  createServiceEntitlement,
  deleteServiceEntitlement,
} from './service-profiles.controller.js';

const serviceProfileRouter = Router();

// Service Profiles CRUD
serviceProfileRouter.get('/', listServiceProfiles);
serviceProfileRouter.post('/', validate(createServiceProfileSchema), createServiceProfile);
serviceProfileRouter.get('/entitlements', listServiceEntitlements);
serviceProfileRouter.post('/entitlements', validate(createServiceEntitlementSchema), createServiceEntitlement);
serviceProfileRouter.delete('/entitlements/:id', validateParams(idParamSchema), deleteServiceEntitlement);
serviceProfileRouter.get('/:id', validateParams(idParamSchema), getServiceProfile);
serviceProfileRouter.put('/:id', validateParams(idParamSchema), validate(updateServiceProfileSchema), updateServiceProfile);
serviceProfileRouter.delete('/:id', validateParams(idParamSchema), deleteServiceProfile);

export { serviceProfileRouter };
