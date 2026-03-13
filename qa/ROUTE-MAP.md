# OpsWeave Backend API Route Inventory

**Last Updated:** March 2026
**Base Path:** `/api/v1`
**Authentication:** JWT (Bearer token) or Portal JWT
**Tenant-Scoped:** Yes (all protected routes require tenant context)

## Summary

| Category | Count |
|----------|-------|
| Total Modules | 28 |
| Total Endpoints | 249+ |
| Public (no auth) | ~8 |
| Portal JWT | 9 |
| Protected (JWT) | ~232 |
| Super-Admin only | 7 |

---

## Module: System (Public)

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/system/health` | `healthCheck` | No | Health check endpoint |
| GET | `/api/v1/system/info` | `systemInfo` | No | System information (version, uptime, etc.) |

---

## Module: Auth

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| POST | `/api/v1/auth/login` | `login` | No | Login with email/password |
| POST | `/api/v1/auth/logout` | `logout` | No | Logout (stateless) |
| GET | `/api/v1/auth/me` | `getMe` | Yes | Get current user + tenant memberships |
| POST | `/api/v1/auth/switch-tenant` | `switchTenant` | Yes | Switch active tenant |
| PATCH | `/api/v1/auth/change-password` | `changePassword` | Yes | Change user password |
| GET | `/api/v1/auth/password-policy` | `getPasswordPolicy` | Yes | Get tenant password policy |

---

## Module: Tenants (Super-Admin Only)

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/tenants` | `listTenants` | Yes* | List all tenants |
| POST | `/api/v1/tenants` | `createTenant` | Yes* | Create new tenant |
| GET | `/api/v1/tenants/:id` | `getTenant` | Yes* | Get single tenant |
| PUT | `/api/v1/tenants/:id` | `updateTenant` | Yes* | Update tenant |
| GET | `/api/v1/tenants/:id/members` | `listTenantMembers` | Yes* | List tenant members |
| POST | `/api/v1/tenants/:id/members` | `addTenantMember` | Yes* | Add user to tenant |
| DELETE | `/api/v1/tenants/:id/members/:uid` | `removeTenantMember` | Yes* | Remove user from tenant |

*Requires super-admin role

---

## Module: Users

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/users` | `listUsers` | Yes | List users (admin/manager) |
| POST | `/api/v1/users` | `createUser` | Yes | Create new user (admin, with license check) |
| POST | `/api/v1/users/import` | `importUsers` | Yes | Bulk import users from CSV (admin) |
| GET | `/api/v1/users/:id` | `getUser` | Yes | Get single user |
| PUT | `/api/v1/users/:id` | `updateUser` | Yes | Update user profile (admin or self) |
| DELETE | `/api/v1/users/:id` | `deleteUser` | Yes | Delete user from tenant (admin) |
| PATCH | `/api/v1/users/:id/language` | `updateLanguage` | Yes | Update user language preference |

---

## Module: Groups (Assignee Groups)

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/groups` | `listGroups` | Yes | List all groups |
| POST | `/api/v1/groups` | `createGroup` | Yes | Create new group (admin/manager) |
| GET | `/api/v1/groups/:id` | `getGroup` | Yes | Get single group |
| PUT | `/api/v1/groups/:id` | `updateGroup` | Yes | Update group (admin/manager) |
| DELETE | `/api/v1/groups/:id` | `deleteGroup` | Yes | Delete group (admin) |
| GET | `/api/v1/groups/:id/members` | `listGroupMembers` | Yes | List group members |
| POST | `/api/v1/groups/:id/members` | `addGroupMember` | Yes | Add member to group (admin/manager) |
| DELETE | `/api/v1/groups/:id/members/:uid` | `removeGroupMember` | Yes | Remove member from group (admin/manager) |
| GET | `/api/v1/groups/:id/tickets` | `getGroupTickets` | Yes | Get tickets assigned to group |

---

## Module: Tickets

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/tickets` | `listTickets` | Yes | List tickets with filtering/pagination |
| POST | `/api/v1/tickets` | `createTicket` | Yes | Create new ticket |
| GET | `/api/v1/tickets/stats` | `getTicketStats` | Yes | Get ticket statistics (counts by status, priority) |
| GET | `/api/v1/tickets/board` | `getBoardData` | Yes | Get Kanban board data |
| GET | `/api/v1/tickets/stats/timeline` | `getTicketTimeline` | Yes | Get ticket volume timeline (last N days) |
| GET | `/api/v1/tickets/stats/by-customer` | `getTicketsByCustomer` | Yes | Get top N customers by ticket count |
| GET | `/api/v1/tickets/categories` | `listCategoriesCtrl` | Yes | List ticket categories |
| POST | `/api/v1/tickets/categories` | `createCategoryCtrl` | Yes | Create ticket category |
| PUT | `/api/v1/tickets/categories/:id` | `updateCategoryCtrl` | Yes | Update ticket category |
| DELETE | `/api/v1/tickets/categories/:id` | `deleteCategoryCtrl` | Yes | Delete ticket category |
| PATCH | `/api/v1/tickets/batch` | `batchUpdateTickets` | Yes | Batch update multiple tickets |
| GET | `/api/v1/tickets/:id` | `getTicket` | Yes | Get single ticket |
| PUT | `/api/v1/tickets/:id` | `updateTicket` | Yes | Update ticket |
| PATCH | `/api/v1/tickets/:id/status` | `updateTicketStatus` | Yes | Update ticket status only |
| PATCH | `/api/v1/tickets/:id/assign` | `assignTicket` | Yes | Assign ticket to user/group |
| PATCH | `/api/v1/tickets/:id/priority` | `updateTicketPriority` | Yes | Update ticket priority only |
| PATCH | `/api/v1/tickets/:id/archive` | `archiveTicketCtrl` | Yes | Archive ticket |
| GET | `/api/v1/tickets/:id/comments` | `getTicketComments` | Yes | Get ticket comments |
| POST | `/api/v1/tickets/:id/comments` | `addTicketComment` | Yes | Add comment to ticket |
| GET | `/api/v1/tickets/:id/history` | `getTicketHistory` | Yes | Get ticket change history |
| GET | `/api/v1/tickets/:id/children` | `getChildTickets` | Yes | Get child tickets |
| GET | `/api/v1/tickets/:id/workflow` | `_getTicketWorkflow` | Yes | Get ticket workflow instance |
| GET | `/api/v1/tickets/cab/pending` | `listCabPending` | Yes | List pending CAB decisions |
| GET | `/api/v1/tickets/cab/all` | `listCabAll` | Yes | List all CAB tickets |
| POST | `/api/v1/tickets/:id/cab/decision` | `setCabDecision` | Yes | Set CAB decision (approve/reject/defer) |

---

## Module: Customers

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/customers` | `listCustomers` | Yes | List customers |
| POST | `/api/v1/customers` | `createCustomer` | Yes | Create new customer (admin/manager) |
| GET | `/api/v1/customers/:id` | `getCustomer` | Yes | Get single customer |
| PUT | `/api/v1/customers/:id` | `updateCustomer` | Yes | Update customer (admin/manager) |
| DELETE | `/api/v1/customers/:id` | `deleteCustomer` | Yes | Deactivate customer (soft-delete) |
| GET | `/api/v1/customers/:id/overview` | `getCustomerOverview` | Yes | Get customer overview (assets, tickets, SLAs, services) |

---

## Module: Assets (CMDB)

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/assets` | `listAssets` | Yes | List assets with filtering/pagination |
| POST | `/api/v1/assets` | `createAsset` | Yes | Create new asset |
| GET | `/api/v1/assets/stats` | `getAssetStats` | Yes | Get asset statistics |
| GET | `/api/v1/assets/graph` | `getFullAssetGraph` | Yes | Get full topology graph |
| GET | `/api/v1/assets/:id/graph` | `getAssetGraph` | Yes | Get BFS graph centered on asset |
| GET | `/api/v1/assets/:id` | `getAsset` | Yes | Get single asset |
| PUT | `/api/v1/assets/:id` | `updateAsset` | Yes | Update asset |
| DELETE | `/api/v1/assets/:id` | `deleteAsset` | Yes | Delete asset |
| GET | `/api/v1/assets/:id/relations` | `getAssetRelations` | Yes | Get all relations for asset |
| POST | `/api/v1/assets/:id/relations` | `createAssetRelation` | Yes | Create relation for asset |
| DELETE | `/api/v1/assets/:id/relations/:rid` | `deleteAssetRelation` | Yes | Delete relation |
| PUT | `/api/v1/assets/:id/relations/:rid` | `updateAssetRelation` | Yes | Update relation |
| GET | `/api/v1/assets/:id/tickets` | `getAssetTickets` | Yes | Get tickets linked to asset |
| GET | `/api/v1/assets/:id/sla-chain` | `getAssetSlaChain` | Yes | Get SLA inheritance chain |
| GET | `/api/v1/assets/:id/services` | `getAssetServices` | Yes | Get services linked to asset |
| GET | `/api/v1/assets/:id/compliance` | `getAssetCompliance` | Yes | Get regulatory flags for asset |
| GET | `/api/v1/assets/:id/relation-history` | `getAssetRelationHistory` | Yes | Get relation change history |
| GET | `/api/v1/assets/:id/capacity-history` | `getAssetCapacityHistory` | Yes | Get capacity change history |
| GET | `/api/v1/assets/:id/classifications` | `getAssetClassifications` | Yes | Get classifications for asset |
| POST | `/api/v1/assets/:id/classifications` | `classifyAsset` | Yes | Classify asset |
| DELETE | `/api/v1/assets/:id/classifications/:vid` | `removeAssetClassification` | Yes | Remove classification |
| GET | `/api/v1/assets/:id/tenant-assignments` | `listAssetTenantAssignments` | Yes | List tenant assignments |
| POST | `/api/v1/assets/:id/tenant-assignments` | `createAssetTenantAssignment` | Yes | Assign asset to tenant |
| PUT | `/api/v1/assets/:id/tenant-assignments/:aid` | `updateAssetTenantAssignment` | Yes | Update tenant assignment |
| DELETE | `/api/v1/assets/:id/tenant-assignments/:aid` | `removeAssetTenantAssignment` | Yes | Remove tenant assignment |

---

## Module: Asset Types

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/asset-types` | `listAssetTypes` | Yes | List asset types |
| POST | `/api/v1/asset-types` | `createAssetType` | Yes | Create new asset type |
| GET | `/api/v1/asset-types/:id` | `getAssetType` | Yes | Get single asset type |
| PUT | `/api/v1/asset-types/:id` | `updateAssetType` | Yes | Update asset type |
| DELETE | `/api/v1/asset-types/:id` | `deleteAssetType` | Yes | Delete asset type |

---

## Module: Relation Types

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/relation-types` | `listRelationTypes` | Yes | List relation types |
| POST | `/api/v1/relation-types` | `createRelationType` | Yes | Create new relation type |
| GET | `/api/v1/relation-types/:id` | `getRelationType` | Yes | Get single relation type |
| PUT | `/api/v1/relation-types/:id` | `updateRelationType` | Yes | Update relation type |
| DELETE | `/api/v1/relation-types/:id` | `deleteRelationType` | Yes | Delete relation type |

---

## Module: Classifications (Asset Metadata)

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/classifications` | `listClassificationModels` | Yes | List classification models |
| POST | `/api/v1/classifications` | `createClassificationModel` | Yes | Create classification model |
| GET | `/api/v1/classifications/:id` | `getClassificationModel` | Yes | Get single model |
| PUT | `/api/v1/classifications/:id` | `updateClassificationModel` | Yes | Update classification model |
| DELETE | `/api/v1/classifications/:id` | `deleteClassificationModel` | Yes | Delete classification model |
| POST | `/api/v1/classifications/:id/values` | `createClassificationValue` | Yes | Create classification value |
| PUT | `/api/v1/classifications/:id/values/:vid` | `updateClassificationValue` | Yes | Update classification value |
| DELETE | `/api/v1/classifications/:id/values/:vid` | `deleteClassificationValue` | Yes | Delete classification value |

---

## Module: Capacity Planning

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/capacity/types` | `listCapacityTypes` | Yes | List capacity types |
| POST | `/api/v1/capacity/types` | `createCapacityType` | Yes | Create capacity type |
| PUT | `/api/v1/capacity/types/:id` | `updateCapacityType` | Yes | Update capacity type |
| DELETE | `/api/v1/capacity/types/:id` | `deleteCapacityType` | Yes | Delete capacity type |
| GET | `/api/v1/capacity/utilization` | `getUtilizationOverview` | Yes | Get capacity utilization overview |
| GET | `/api/v1/capacity/compatible` | `findCompatibleHosts` | Yes | Find compatible hosts for migration |
| GET | `/api/v1/capacity/migration-check` | `checkMigrationFeasibility` | Yes | Check migration feasibility |
| GET | `/api/v1/capacity/overprovisioned` | `getOverprovisionedAssets` | Yes | Get overprovisioned assets |
| GET | `/api/v1/capacity/assets/:id` | `getAssetCapacities` | Yes | Get capacities for asset |
| POST | `/api/v1/capacity/assets/:id` | `setAssetCapacity` | Yes | Set asset capacity |
| DELETE | `/api/v1/capacity/assets/:id/:cid` | `deleteAssetCapacity` | Yes | Delete asset capacity |
| GET | `/api/v1/capacity/assets/:id/utilization` | `getCapacityUtilization` | Yes | Get asset capacity utilization |

---

## Module: Projects

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/projects` | `listProjects` | Yes | List projects with filtering |
| POST | `/api/v1/projects` | `createProject` | Yes | Create new project |
| GET | `/api/v1/projects/:id` | `getProject` | Yes | Get single project |
| PUT | `/api/v1/projects/:id` | `updateProject` | Yes | Update project |
| DELETE | `/api/v1/projects/:id` | `deleteProject` | Yes | Delete project |
| GET | `/api/v1/projects/:id/assets` | `listProjectAssets` | Yes | List assets in project |
| POST | `/api/v1/projects/:id/assets` | `addProjectAsset` | Yes | Add asset to project |
| DELETE | `/api/v1/projects/:id/assets/:assetId` | `removeProjectAsset` | Yes | Remove asset from project |
| GET | `/api/v1/projects/:id/tickets` | `listProjectTickets` | Yes | Get tickets for project assets |

---

## Module: Workflows

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/workflows/templates` | `listTemplates` | Yes | List workflow templates |
| POST | `/api/v1/workflows/templates` | `createTemplate` | Yes | Create workflow template |
| POST | `/api/v1/workflows/instantiate` | `instantiate` | Yes | Instantiate workflow on ticket |
| GET | `/api/v1/workflows/templates/:id` | `getTemplate` | Yes | Get single template |
| PUT | `/api/v1/workflows/templates/:id` | `updateTemplate` | Yes | Update template |
| DELETE | `/api/v1/workflows/templates/:id` | `deleteTemplate` | Yes | Delete template |
| POST | `/api/v1/workflows/templates/:id/steps` | `addStep` | Yes | Add step to template |
| DELETE | `/api/v1/workflows/templates/:id/steps/:sid` | `removeStep` | Yes | Remove step from template |
| PUT | `/api/v1/workflows/templates/:id/steps/reorder` | `reorderSteps` | Yes | Reorder workflow steps |
| GET | `/api/v1/workflows/templates/:id/instances` | `getTemplateInstances` | Yes | Get instances of template |
| GET | `/api/v1/workflows/instances/:id` | `getInstance` | Yes | Get workflow instance |
| POST | `/api/v1/workflows/instances/:id/steps/:sid/complete` | `completeStep` | Yes | Complete workflow step |
| POST | `/api/v1/workflows/instances/:id/cancel` | `cancelInstance` | Yes | Cancel workflow instance |
| GET | `/api/v1/workflows/ticket/:ticketId` | `getTicketWorkflow` | Yes | Get workflow for ticket |

---

## Module: Services (Service Catalog)

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/services/descriptions` | `listServiceDescriptions` | Yes | List service descriptions |
| POST | `/api/v1/services/descriptions` | `createServiceDescription` | Yes | Create service description |
| GET | `/api/v1/services/descriptions/:id` | `getServiceDescription` | Yes | Get single service description |
| PUT | `/api/v1/services/descriptions/:id` | `updateServiceDescription` | Yes | Update service description |
| DELETE | `/api/v1/services/descriptions/:id` | `deleteServiceDescription` | Yes | Delete service description |
| GET | `/api/v1/services/descriptions/:id/scope-items` | `listScopeItems` | Yes | List scope items for service |
| POST | `/api/v1/services/descriptions/:id/scope-items` | `createScopeItem` | Yes | Create scope item |
| POST | `/api/v1/services/descriptions/:id/scope-items/reorder` | `reorderScopeItems` | Yes | Reorder scope items |
| PUT | `/api/v1/services/descriptions/:id/scope-items/:sid` | `updateScopeItem` | Yes | Update scope item |
| DELETE | `/api/v1/services/descriptions/:id/scope-items/:sid` | `deleteScopeItem` | Yes | Delete scope item |
| GET | `/api/v1/services/catalogs/horizontal` | `listHorizontalCatalogs` | Yes | List horizontal catalogs |
| POST | `/api/v1/services/catalogs/horizontal` | `createHorizontalCatalog` | Yes | Create horizontal catalog |
| GET | `/api/v1/services/catalogs/horizontal/:id` | `getHorizontalCatalog` | Yes | Get catalog with items |
| PUT | `/api/v1/services/catalogs/horizontal/:id` | `updateHorizontalCatalog` | Yes | Update horizontal catalog |
| DELETE | `/api/v1/services/catalogs/horizontal/:id` | `deleteHorizontalCatalog` | Yes | Delete horizontal catalog |
| POST | `/api/v1/services/catalogs/horizontal/:id/items` | `addCatalogItem` | Yes | Add service to catalog |
| DELETE | `/api/v1/services/catalogs/horizontal/:id/items/:sid` | `removeCatalogItem` | Yes | Remove service from catalog |
| GET | `/api/v1/services/catalogs/vertical` | `listVerticalCatalogs` | Yes | List vertical catalogs (Enterprise) |
| POST | `/api/v1/services/catalogs/vertical` | `createVerticalCatalog` | Yes | Create vertical catalog (Enterprise) |
| GET | `/api/v1/services/catalogs/vertical/:id` | `getVerticalCatalog` | Yes | Get vertical catalog |
| PUT | `/api/v1/services/catalogs/vertical/:id` | `updateVerticalCatalog` | Yes | Update vertical catalog |
| DELETE | `/api/v1/services/catalogs/vertical/:id` | `deleteVerticalCatalog` | Yes | Delete vertical catalog |
| POST | `/api/v1/services/catalogs/vertical/:id/overrides` | `addVerticalOverride` | Yes | Add override (Enterprise) |
| DELETE | `/api/v1/services/catalogs/vertical/:id/overrides/:oid` | `removeVerticalOverride` | Yes | Remove override |

---

## Module: Service Profiles

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/service-profiles` | `listServiceProfiles` | Yes | List service profiles |
| POST | `/api/v1/service-profiles` | `createServiceProfile` | Yes | Create service profile |
| GET | `/api/v1/service-profiles/:id` | `getServiceProfile` | Yes | Get single service profile |
| PUT | `/api/v1/service-profiles/:id` | `updateServiceProfile` | Yes | Update service profile |
| DELETE | `/api/v1/service-profiles/:id` | `deleteServiceProfile` | Yes | Delete service profile |
| GET | `/api/v1/service-profiles/entitlements` | `listServiceEntitlements` | Yes | List service entitlements |
| POST | `/api/v1/service-profiles/entitlements` | `createServiceEntitlement` | Yes | Create service entitlement |
| DELETE | `/api/v1/service-profiles/entitlements/:id` | `deleteServiceEntitlement` | Yes | Delete service entitlement |

---

## Module: SLA Management

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/sla/definitions` | `listDefinitions` | Yes | List SLA definitions |
| GET | `/api/v1/sla/definitions/:id` | `getDefinition` | Yes | Get single SLA definition |
| POST | `/api/v1/sla/definitions` | `createDefinition` | Yes | Create SLA definition (admin) |
| PUT | `/api/v1/sla/definitions/:id` | `updateDefinition` | Yes | Update SLA definition |
| DELETE | `/api/v1/sla/definitions/:id` | `deleteDefinition` | Yes | Delete SLA definition |
| GET | `/api/v1/sla/assignments` | `listAssignments` | Yes | List SLA assignments |
| POST | `/api/v1/sla/assignments` | `createAssignment` | Yes | Create SLA assignment |
| DELETE | `/api/v1/sla/assignments/:id` | `deleteAssignment` | Yes | Delete SLA assignment |
| GET | `/api/v1/sla/reports/performance` | `performanceReport` | Yes | Get SLA performance report |
| GET | `/api/v1/sla/resolve` | `resolveEffective` | Yes | Resolve effective SLA for ticket |

---

## Module: Compliance

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/compliance/frameworks` | `listFrameworks` | Yes | List regulatory frameworks |
| POST | `/api/v1/compliance/frameworks` | `createFramework` | Yes | Create framework |
| GET | `/api/v1/compliance/frameworks/:id` | `getFramework` | Yes | Get framework with requirements |
| PUT | `/api/v1/compliance/frameworks/:id` | `updateFramework` | Yes | Update framework |
| DELETE | `/api/v1/compliance/frameworks/:id` | `deleteFramework` | Yes | Delete framework |
| GET | `/api/v1/compliance/frameworks/:id/requirements` | `listRequirements` | Yes | List requirements |
| POST | `/api/v1/compliance/frameworks/:id/requirements` | `createRequirement` | Yes | Create requirement |
| PUT | `/api/v1/compliance/requirements/:rid` | `updateRequirement` | Yes | Update requirement |
| DELETE | `/api/v1/compliance/requirements/:rid` | `deleteRequirement` | Yes | Delete requirement |
| POST | `/api/v1/compliance/requirements/:rid/mappings/:sid` | `upsertMapping` | Yes | Upsert requirement-service mapping |
| DELETE | `/api/v1/compliance/requirements/:rid/mappings/:sid` | `deleteMapping` | Yes | Delete mapping |
| GET | `/api/v1/compliance/frameworks/:id/matrix` | `getMatrix` | Yes | Get compliance matrix |
| GET | `/api/v1/compliance/frameworks/:id/assets` | `getFrameworkAssets` | Yes | Get assets flagged for framework |
| POST | `/api/v1/compliance/frameworks/:id/assets` | `flagAsset` | Yes | Flag asset for framework |
| DELETE | `/api/v1/compliance/frameworks/:id/assets/:aid` | `unflagAsset` | Yes | Remove regulatory flag |
| GET | `/api/v1/compliance/audits` | `listAudits` | Yes | List compliance audits |
| POST | `/api/v1/compliance/audits` | `createAudit` | Yes | Create audit |
| GET | `/api/v1/compliance/audits/:id` | `getAudit` | Yes | Get single audit |
| PUT | `/api/v1/compliance/audits/:id` | `updateAudit` | Yes | Update audit |
| DELETE | `/api/v1/compliance/audits/:id` | `deleteAudit` | Yes | Delete audit |
| GET | `/api/v1/compliance/audits/:id/export/csv` | `exportAuditCsv` | Yes | Export audit as CSV |
| GET | `/api/v1/compliance/audits/:id/export/json` | `exportAuditJson` | Yes | Export audit as JSON |
| GET | `/api/v1/compliance/audits/:id/findings` | `listFindings` | Yes | List findings for audit |
| POST | `/api/v1/compliance/audits/:id/findings` | `createFinding` | Yes | Create finding |
| PUT | `/api/v1/compliance/findings/:id` | `updateFinding` | Yes | Update finding |
| DELETE | `/api/v1/compliance/findings/:id` | `deleteFinding` | Yes | Delete finding |
| GET | `/api/v1/compliance/controls` | `listControls` | Yes | List compliance controls |
| POST | `/api/v1/compliance/controls` | `createControl` | Yes | Create control |
| GET | `/api/v1/compliance/controls/:id` | `getControl` | Yes | Get single control |
| PUT | `/api/v1/compliance/controls/:id` | `updateControl` | Yes | Update control |
| DELETE | `/api/v1/compliance/controls/:id` | `deleteControl` | Yes | Delete control |
| POST | `/api/v1/compliance/controls/mappings` | `mapRequirementToControl` | Yes | Map requirement to control |
| DELETE | `/api/v1/compliance/controls/mappings/:requirementId/:controlId` | `removeRequirementControlMapping` | Yes | Remove mapping |
| GET | `/api/v1/compliance/controls/:id/mappings` | `getCrossFrameworkMappings` | Yes | Get cross-framework mappings |
| GET | `/api/v1/compliance/evidence` | `listAllEvidence` | Yes | List all evidence |
| GET | `/api/v1/compliance/controls/:id/evidence` | `listEvidence` | Yes | List evidence for control |
| POST | `/api/v1/compliance/controls/:id/evidence` | `createEvidence` | Yes | Create evidence |
| DELETE | `/api/v1/compliance/evidence/:id` | `deleteEvidence` | Yes | Delete evidence |
| GET | `/api/v1/compliance/cross-mappings/export` | `exportCrossMappingsCsv` | Yes | Export cross-mappings as CSV |
| POST | `/api/v1/compliance/cross-mappings/import` | `importCrossMappingsCsv` | Yes | Import cross-mappings from CSV |
| GET | `/api/v1/compliance/cross-mappings` | `listCrossMappings` | Yes | List cross-framework mappings |
| POST | `/api/v1/compliance/cross-mappings` | `createCrossMapping` | Yes | Create cross-mapping |
| DELETE | `/api/v1/compliance/cross-mappings/:id` | `deleteCrossMapping` | Yes | Delete cross-mapping |
| GET | `/api/v1/compliance/frameworks/:id/cross-mappings` | `getFrameworkCrossMappings` | Yes | Get cross-mappings for framework |
| GET | `/api/v1/compliance/dashboard` | `getDashboard` | Yes | Get compliance dashboard stats |

---

## Module: Knowledge Base

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/kb/articles` | `listArticles` | Yes | List KB articles |
| GET | `/api/v1/kb/articles/search` | `searchArticles` | Yes | Full-text search KB articles |
| POST | `/api/v1/kb/articles` | `createArticle` | Yes | Create KB article |
| GET | `/api/v1/kb/articles/:id` | `getArticle` | Yes | Get single article |
| PUT | `/api/v1/kb/articles/:id` | `updateArticle` | Yes | Update article |
| DELETE | `/api/v1/kb/articles/:id` | `deleteArticle` | Yes | Delete article |
| POST | `/api/v1/kb/articles/:id/link/:ticketId` | `linkToTicket` | Yes | Link article to ticket |
| DELETE | `/api/v1/kb/articles/:id/link/:ticketId` | `unlinkFromTicket` | Yes | Unlink article from ticket |

---

## Module: Email Inbound

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| POST | `/api/v1/email/webhook` | `processWebhook` | No | Inbound webhook (Mailgun/SendGrid) |
| GET | `/api/v1/email/configs` | `listConfigs` | Yes | List email configs |
| POST | `/api/v1/email/configs` | `createConfig` | Yes | Create email config |
| GET | `/api/v1/email/configs/:id` | `getConfig` | Yes | Get single config |
| PUT | `/api/v1/email/configs/:id` | `updateConfig` | Yes | Update config |
| DELETE | `/api/v1/email/configs/:id` | `deleteConfig` | Yes | Delete config |
| POST | `/api/v1/email/configs/:id/test` | `testConnection` | Yes | Test email config connection |
| GET | `/api/v1/email/messages` | `listMessages` | Yes | List email messages |
| GET | `/api/v1/email/messages/:id` | `getMessage` | Yes | Get single email message |

---

## Module: Monitoring

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/monitoring/sources` | `listSources` | Yes | List monitoring sources |
| GET | `/api/v1/monitoring/sources/:id` | `getSource` | Yes | Get single source |
| POST | `/api/v1/monitoring/sources` | `createSource` | Yes | Create monitoring source |
| PUT | `/api/v1/monitoring/sources/:id` | `updateSource` | Yes | Update source |
| DELETE | `/api/v1/monitoring/sources/:id` | `deleteSource` | Yes | Delete source |
| GET | `/api/v1/monitoring/events` | `listEvents` | Yes | List monitoring events |
| GET | `/api/v1/monitoring/events/stats` | `getStats` | Yes | Get monitoring event stats |
| GET | `/api/v1/monitoring/events/:id` | `getEvent` | Yes | Get single event |
| PUT | `/api/v1/monitoring/events/:id/acknowledge` | `acknowledgeEvent` | Yes | Acknowledge event |
| POST | `/api/v1/monitoring/events/webhook/:sourceId` | `webhookIngest` | No | Public webhook for event ingestion |

---

## Module: Known Errors

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/known-errors` | `listKnownErrors` | Yes | List known errors |
| GET | `/api/v1/known-errors/search` | `searchKnownErrors` | Yes | Search known errors |
| GET | `/api/v1/known-errors/:id` | `getKnownError` | Yes | Get single known error |
| POST | `/api/v1/known-errors` | `createKnownError` | Yes | Create known error |
| PUT | `/api/v1/known-errors/:id` | `updateKnownError` | Yes | Update known error |
| DELETE | `/api/v1/known-errors/:id` | `deleteKnownError` | Yes | Delete known error |

---

## Module: Escalation

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/escalation/rules` | `listRules` | Yes | List escalation rules |
| POST | `/api/v1/escalation/rules` | `createRule` | Yes | Create escalation rule |
| PUT | `/api/v1/escalation/rules/:id` | `updateRule` | Yes | Update escalation rule |
| DELETE | `/api/v1/escalation/rules/:id` | `deleteRule` | Yes | Delete escalation rule |
| POST | `/api/v1/escalation/tickets/:id/escalate` | `manualEscalate` | Yes | Manually escalate ticket |
| POST | `/api/v1/escalation/tickets/:id/major-incident` | `declareMajorIncident` | Yes | Declare major incident |
| POST | `/api/v1/escalation/tickets/:id/resolve-major` | `resolveMajorIncident` | Yes | Resolve major incident |

---

## Module: Notifications

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/notifications/preferences` | `getPreferences` | Yes | Get user notification preferences |
| PUT | `/api/v1/notifications/preferences` | `bulkUpsertPreferences` | Yes | Update notification preferences |

---

## Module: Audit Log

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/audit` | `listAuditLogs` | Yes | List audit logs (admin) |
| GET | `/api/v1/audit/event-types` | `getEventTypes` | Yes | Get distinct event types |
| GET | `/api/v1/audit/resource-types` | `getResourceTypes` | Yes | Get distinct resource types |
| GET | `/api/v1/audit/verify-integrity` | `verifyIntegrity` | Yes | Verify audit log hash chain |
| GET | `/api/v1/audit/export` | `listAuditLogs` + export | Yes | Export audit logs (JSON/CSV) |

---

## Module: Settings

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/settings` | `listSettings` | Yes | List all system settings |
| GET | `/api/v1/settings/runtime` | `getRuntime` | Yes | Get runtime configuration (admin) |
| GET | `/api/v1/settings/password-policy` | `getPasswordPolicy` | Yes | Get tenant password policy |
| PUT | `/api/v1/settings/password-policy` | `updatePasswordPolicy` | Yes | Update password policy (admin) |
| GET | `/api/v1/settings/:key` | `getSettingByKey` | Yes | Get single setting |
| PUT | `/api/v1/settings/:key` | `updateSettingByKey` | Yes | Update setting (admin) |
| DELETE | `/api/v1/settings/:key` | `deleteSettingByKey` | Yes | Delete setting (admin) |

---

## Module: License Management

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/license` | `getLicense` | Yes | Get license info for tenant |
| GET | `/api/v1/license/usage` | `getLicenseUsageHandler` | Yes | Get resource usage vs. limits |
| POST | `/api/v1/license/activate` | `activateLicenseHandler` | Yes | Activate license key (admin) |
| DELETE | `/api/v1/license` | `deactivateLicenseHandler` | Yes | Deactivate license (admin) |

---

## Module: Portal (Customer Self-Service)

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| POST | `/api/v1/portal/auth/login` | `login` | No | Portal customer login |
| POST | `/api/v1/portal/auth/logout` | (anonymous) | No | Portal logout |
| GET | `/api/v1/portal/auth/me` | `me` | Portal JWT | Get portal user info |
| GET | `/api/v1/portal/tickets` | `listTickets` | Portal JWT | List customer tickets |
| GET | `/api/v1/portal/tickets/:id` | `getTicket` | Portal JWT | Get single ticket |
| POST | `/api/v1/portal/tickets` | `createTicket` | Portal JWT | Create ticket |
| POST | `/api/v1/portal/tickets/:id/comments` | `addComment` | Portal JWT | Add external comment |
| GET | `/api/v1/portal/services` | `listServices` | Portal JWT | List published services |
| GET | `/api/v1/portal/kb` | `listKb` | Portal JWT | List public KB articles |

---

## Module: Feedback

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/api/v1/feedback` | `list` | No | List feedback entries (public) |
| POST | `/api/v1/feedback` | `create` | No | Submit feedback (public) |
| POST | `/api/v1/feedback/:id/vote` | `vote` | No | Vote on feedback (public) |

---

## Standalone Routes

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/feedback` | (HTML page) | No | Standalone feedback page |

---

## Authentication & Authorization

### Auth Types
- **JWT Bearer (Protected):** `Authorization: Bearer <jwt>`
- **Portal JWT (Portal):** `Authorization: Bearer <portal_jwt>`
- **Public:** No authentication required
- **Webhook:** Uses `webhook_secret` header validation

### Roles (tenant-scoped)
- **super_admin:** Cross-tenant, manages tenants
- **admin:** Full access within tenant
- **manager:** Create/update groups, users, customers, configs
- **agent:** Standard ticket/asset operations
- **viewer:** Read-only access

### License Enforcement
- Community: max 50 assets, 5 users, 3 workflows, 1 framework
- Enterprise: unlimited (validated via offline JWT)

---

## Middleware Chain

```
request → rate limiting → auth → tenant → audit → role → validation → handler
```

---

## Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 25, max: 100) |
| `q` | string | Search query |
| `sort` | string | Sort field |
| `order` | asc/desc | Sort direction (default: desc) |
| `status` | enum | Filter by status |
| `format` | json/csv | Export format |
