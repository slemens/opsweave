import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { systemRouter } from '../modules/system/system.routes.js';

// ─── Central API Router ────────────────────────────────────
const apiRouter = Router();

// ── Public routes (no auth) ────────────────────────────────
apiRouter.use('/system', systemRouter);

// ── Auth routes (login/logout — mounted without requireAuth) ─
// TODO: mount auth module routes here
// apiRouter.use('/auth', authRouter);

// ── Protected routes (auth + tenant required) ──────────────
// All routes below require authentication and tenant context.
const protectedRouter = Router();
protectedRouter.use(requireAuth);
protectedRouter.use(tenantMiddleware);

// TODO: mount module routes as they are implemented
// protectedRouter.use('/tenants', requireSuperAdmin, tenantRouter);
// protectedRouter.use('/users', userRouter);
// protectedRouter.use('/groups', groupRouter);
// protectedRouter.use('/tickets', ticketRouter);
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
