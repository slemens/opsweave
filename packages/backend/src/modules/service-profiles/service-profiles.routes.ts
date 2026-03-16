import { Router } from 'express';

import { requireRole } from '../../middleware/auth.js';
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
serviceProfileRouter.post('/', requireRole('admin', 'manager'), validate(createServiceProfileSchema), createServiceProfile);
serviceProfileRouter.get('/entitlements', listServiceEntitlements);
serviceProfileRouter.post('/entitlements', requireRole('admin', 'manager'), validate(createServiceEntitlementSchema), createServiceEntitlement);
serviceProfileRouter.delete('/entitlements/:id', requireRole('admin', 'manager'), validateParams(idParamSchema), deleteServiceEntitlement);
serviceProfileRouter.get('/:id', validateParams(idParamSchema), getServiceProfile);
serviceProfileRouter.put('/:id', requireRole('admin', 'manager'), validateParams(idParamSchema), validate(updateServiceProfileSchema), updateServiceProfile);
serviceProfileRouter.delete('/:id', requireRole('admin', 'manager'), validateParams(idParamSchema), deleteServiceProfile);

export { serviceProfileRouter };
