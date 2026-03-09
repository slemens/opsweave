import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { systemRouter } from '../modules/system/system.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { tenantRouter } from '../modules/tenants/tenants.routes.js';
import { userRouter } from '../modules/users/users.routes.js';
import { groupRouter } from '../modules/groups/groups.routes.js';
import { ticketRouter } from '../modules/tickets/tickets.routes.js';
import { customerRouter } from '../modules/customers/customers.routes.js';
import { assetRouter } from '../modules/assets/assets.routes.js';
import { workflowRouter } from '../modules/workflows/workflows.routes.js';
import { serviceCatalogRouter } from '../modules/services/services.routes.js';
import { complianceRouter } from '../modules/compliance/compliance.routes.js';
import { kbRouter } from '../modules/knowledge-base/kb.routes.js';
import { emailRouter } from '../modules/email-inbound/email.routes.js';
import { portalRouter } from '../modules/portal/portal.routes.js';

// ─── Central API Router ────────────────────────────────────
const apiRouter = Router();

// ── Public routes (no auth) ────────────────────────────────
apiRouter.use('/system', systemRouter);

// ── Auth routes (login/logout public, /me and /switch-tenant protected) ─
apiRouter.use('/auth', authRouter);

// ── Tenant management (auth + super-admin, handled inside tenantRouter) ─
apiRouter.use('/tenants', tenantRouter);

// ── Protected routes (auth + tenant required) ──────────────
// All routes below require authentication and tenant context.
const protectedRouter = Router();
protectedRouter.use(requireAuth);
protectedRouter.use(tenantMiddleware);

// Core modules
protectedRouter.use('/users', userRouter);
protectedRouter.use('/groups', groupRouter);
protectedRouter.use('/tickets', ticketRouter);
protectedRouter.use('/customers', customerRouter);

protectedRouter.use('/assets', assetRouter);
protectedRouter.use('/workflows', workflowRouter);
protectedRouter.use('/services', serviceCatalogRouter);
protectedRouter.use('/compliance', complianceRouter);
protectedRouter.use('/kb/articles', kbRouter);
protectedRouter.use('/email', emailRouter);

// Portal has its own auth — mounted at API level, not inside protectedRouter
apiRouter.use('/portal', portalRouter);

// TODO: mount remaining module routes as they are implemented
// protectedRouter.use('/monitoring', monitoringRouter);
// protectedRouter.use('/settings', settingsRouter);
// protectedRouter.use('/license', licenseRouter);

apiRouter.use(protectedRouter);

export { apiRouter };
