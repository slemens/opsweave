import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { systemRouter } from '../modules/system/system.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { tenantRouter } from '../modules/tenants/tenants.routes.js';
import { userRouter } from '../modules/users/users.routes.js';
import { groupRouter } from '../modules/groups/groups.routes.js';
import { ticketRouter } from '../modules/tickets/tickets.routes.js';

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

// TODO: mount remaining module routes as they are implemented
// protectedRouter.use('/assets', assetRouter);
// protectedRouter.use('/workflows', workflowRouter);
// protectedRouter.use('/services', serviceCatalogRouter);
// protectedRouter.use('/compliance', complianceRouter);
// protectedRouter.use('/monitoring', monitoringRouter);
// protectedRouter.use('/email', emailRouter);
// protectedRouter.use('/kb', knowledgeBaseRouter);
// protectedRouter.use('/portal', portalRouter);
// protectedRouter.use('/settings', settingsRouter);
// protectedRouter.use('/license', licenseRouter);

apiRouter.use(protectedRouter);

export { apiRouter };
