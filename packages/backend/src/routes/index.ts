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
import { settingsRouter, licenseRouter } from '../modules/settings/settings.routes.js';
import { slaRouter } from '../modules/sla/sla.routes.js';
import { knownErrorRouter } from '../modules/known-errors/known-errors.routes.js';
import notificationRouter from '../modules/notifications/notification.routes.js';
import { escalationRouter } from '../modules/escalation/escalation.routes.js';
import { auditRouter } from '../modules/audit/audit.routes.js';
import { monitoringRouter, monitoringWebhookRouter } from '../modules/monitoring/monitoring.routes.js';
import { feedbackRouter } from '../modules/feedback/feedback.routes.js';
import { assetTypeRouter } from '../modules/asset-types/asset-types.routes.js';
import { relationTypeRouter } from '../modules/relation-types/relation-types.routes.js';
import { classificationRouter } from '../modules/classifications/classifications.routes.js';
import { capacityRouter } from '../modules/capacity/capacity.routes.js';
import { projectRouter } from '../modules/projects/projects.routes.js';
import { serviceProfileRouter } from '../modules/service-profiles/service-profiles.routes.js';

// ─── Central API Router ────────────────────────────────────
const apiRouter = Router();

// ── Public routes (no auth) ────────────────────────────────
apiRouter.use('/system', systemRouter);

// ── Auth routes (login/logout public, /me and /switch-tenant protected) ─
apiRouter.use('/auth', authRouter);

// ── Public feedback board (no auth) ─────────────────────────
apiRouter.use('/feedback', feedbackRouter);

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
protectedRouter.use('/asset-types', assetTypeRouter);
protectedRouter.use('/relation-types', relationTypeRouter);
protectedRouter.use('/classifications', classificationRouter);
protectedRouter.use('/capacity', capacityRouter);
protectedRouter.use('/projects', projectRouter);
protectedRouter.use('/service-profiles', serviceProfileRouter);
protectedRouter.use('/workflows', workflowRouter);
protectedRouter.use('/services', serviceCatalogRouter);
protectedRouter.use('/compliance', complianceRouter);
protectedRouter.use('/kb/articles', kbRouter);
protectedRouter.use('/email', emailRouter);

// Portal has its own auth — mounted at API level, not inside protectedRouter
apiRouter.use('/portal', portalRouter);

protectedRouter.use('/settings', settingsRouter);
protectedRouter.use('/license', licenseRouter);
protectedRouter.use('/sla', slaRouter);
protectedRouter.use('/known-errors', knownErrorRouter);
protectedRouter.use('/notifications', notificationRouter);
protectedRouter.use('/escalation', escalationRouter);
protectedRouter.use('/audit', auditRouter);

protectedRouter.use('/monitoring', monitoringRouter);

// Monitoring webhook is public (uses webhook_secret instead of JWT auth)
apiRouter.use(monitoringWebhookRouter);

apiRouter.use(protectedRouter);

export { apiRouter };
