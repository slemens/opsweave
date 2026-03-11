// =============================================================================
// OpsWeave — Complete Drizzle ORM Schema (barrel export)
// =============================================================================
// All tables are defined using sqliteTable from drizzle-orm/sqlite-core.
// The schema is DB-agnostic: the actual driver (better-sqlite3 or postgres)
// handles dialect differences at runtime.
// =============================================================================

// Multi-Tenant Foundation
export { tenants } from './tenants.js';
export {
  users,
  tenantUserMemberships,
  assigneeGroups,
  userGroupMemberships,
} from './users.js';

// Customers & Portal
export { customers, customerPortalUsers } from './customers.js';

// Assets & Relations (CMDB DAG)
export {
  assets,
  assetRelations,
  assetTypes,
  relationTypes,
  classificationModels,
  classificationValues,
  assetClassifications,
  capacityTypes,
  assetCapacities,
} from './assets.js';

// Tickets
export { tickets, ticketCategories, ticketComments, ticketHistory } from './tickets.js';

// Workflow Engine
export {
  workflowTemplates,
  workflowSteps,
  workflowInstances,
  workflowStepInstances,
} from './workflows.js';

// Service Catalog (3-Tier)
export {
  serviceDescriptions,
  horizontalCatalog,
  horizontalCatalogItems,
  verticalCatalogs,
  verticalCatalogOverrides,
  assetServiceLinks,
} from './services.js';

// Compliance / Regulatory
export {
  regulatoryFrameworks,
  regulatoryRequirements,
  requirementServiceMappings,
  assetRegulatoryFlags,
  complianceControls,
  requirementControlMappings,
  complianceAudits,
  auditFindings,
  complianceEvidence,
} from './compliance.js';

// Monitoring
export { monitoringSources, monitoringEvents } from './monitoring.js';

// E-Mail Inbound
export { emailInboundConfigs, emailMessages } from './email.js';

// Knowledge Base
export { kbArticles, kbArticleLinks } from './knowledge-base.js';

// Known Error Database (KEDB)
export { knownErrors } from './known-errors.js';

// Notifications
export { notificationPreferences } from './notifications.js';

// Escalation Rules
export { escalationRules } from './escalation.js';

// SLA Definitions & Assignments
export { slaDefinitions, slaAssignments, serviceProfiles, serviceEntitlements } from './sla.js';

// Audit Log
export { auditLogs } from './audit.js';

// System (global, no tenant_id)
export { systemSettings } from './system.js';

// Projects (Evo-2C)
export { projects, projectAssets } from './projects.js';

// Feedback Board (global, no tenant_id, public)
export { feedbackEntries } from './feedback.js';
