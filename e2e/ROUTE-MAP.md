Perfect! I now have a complete picture of all the routes. Let me compile this into a comprehensive structured markdown document suitable for e2e testing.

# Backend API Routes Inventory

## Overview

This document provides a complete inventory of all Express backend API routes in OpsWeave, organized by module. Each route includes:
- HTTP method and full path
- Authentication requirements
- Request body/query parameter schemas
- Response shape information
- Associated controller function

---

## 1. System Routes (Public)

### GET /api/v1/system/health
- **Auth**: Public (no auth required)
- **Controller**: `healthCheck`
- **Response**: Health status
- **Notes**: Used for deployment health checks

### GET /api/v1/system/info
- **Auth**: Public (no auth required)
- **Controller**: `systemInfo`
- **Response**: System information (version, etc.)

---

## 2. Auth Routes

### POST /api/v1/auth/login
- **Auth**: Public (no auth required)
- **Schema**: `loginSchema` (from @opsweave/shared)
- **Body Fields**: email, password
- **Controller**: `login`
- **Response**: JWT token, user, available tenants

### POST /api/v1/auth/logout
- **Auth**: Public (stateless)
- **Controller**: `logout`
- **Response**: Success message

### GET /api/v1/auth/me
- **Auth**: `requireAuth` (JWT required)
- **Controller**: `getMe`
- **Response**: Current user + list of tenant memberships

### POST /api/v1/auth/switch-tenant
- **Auth**: `requireAuth`
- **Schema**: `switchTenantSchema`
- **Body Fields**: tenant_id
- **Controller**: `switchTenant`
- **Response**: Updated user with active tenant

### PATCH /api/v1/auth/change-password
- **Auth**: `requireAuth`
- **Schema**: `changePasswordSchema`
- **Body Fields**: current_password, new_password
- **Controller**: `changePassword`
- **Response**: Success message

### GET /api/v1/auth/password-policy
- **Auth**: `requireAuth`
- **Controller**: `getPasswordPolicy`
- **Response**: Tenant password policy configuration

---

## 3. Tenant Management Routes (Super-Admin Only)

All routes require `requireAuth` + `requireSuperAdmin`.

### GET /api/v1/tenants
- **Controller**: `listTenants`
- **Response**: List of all tenants

### POST /api/v1/tenants
- **Schema**: `createTenantSchema`
- **Body Fields**: name, slug, settings (optional)
- **Controller**: `createTenant`
- **Response**: Created tenant

### GET /api/v1/tenants/:id
- **Params**: id (UUID)
- **Controller**: `getTenant`
- **Response**: Single tenant with details

### PUT /api/v1/tenants/:id
- **Params**: id (UUID)
- **Schema**: `updateTenantSchema`
- **Controller**: `updateTenant`
- **Response**: Updated tenant

### GET /api/v1/tenants/:id/members
- **Params**: id (UUID)
- **Controller**: `listTenantMembers`
- **Response**: List of users in tenant with roles

### POST /api/v1/tenants/:id/members
- **Params**: id (UUID)
- **Schema**: `addTenantMemberSchema`
- **Body Fields**: user_id, role
- **Controller**: `addTenantMember`
- **Response**: Created tenant-user membership

### DELETE /api/v1/tenants/:id/members/:uid
- **Params**: id (tenant UUID), uid (user UUID)
- **Controller**: `removeTenantMember`
- **Response**: 204 No Content

---

## 4. User Management Routes

All routes require `requireAuth` + `tenantMiddleware` (tenant-scoped).

### GET /api/v1/users
- **Auth**: `requireRole('admin', 'manager')`
- **Query**: `paginationSchema` (page, limit)
- **Controller**: `listUsers`
- **Response**: Paginated list of users in active tenant

### POST /api/v1/users
- **Auth**: `requireRole('admin')` + `checkUserLimit` (license enforcement)
- **Schema**: `createUserSchema`
- **Body Fields**: email, display_name, password, is_active (optional)
- **Controller**: `createUser`
- **Response**: Created user

### POST /api/v1/users/import
- **Auth**: `requireRole('admin')`
- **Body**: { csv: string } — CSV format for bulk import
- **Controller**: `importUsers`
- **Response**: Import results with success/error counts

### GET /api/v1/users/:id
- **Params**: id (UUID)
- **Controller**: `getUser`
- **Response**: Single user details

### PUT /api/v1/users/:id
- **Auth**: Self or admin
- **Params**: id (UUID)
- **Schema**: `updateUserSchema`
- **Body Fields**: email, display_name, is_active, etc.
- **Controller**: `updateUser`
- **Response**: Updated user

### DELETE /api/v1/users/:id
- **Auth**: `requireRole('admin')`
- **Params**: id (UUID)
- **Controller**: `deleteUser`
- **Response**: 204 No Content (removes user from tenant)

### PATCH /api/v1/users/:id/language
- **Params**: id (UUID)
- **Schema**: `updateLanguageSchema`
- **Body Fields**: language ('de' or 'en')
- **Controller**: `updateLanguage`
- **Response**: Updated user with new language preference

---

## 5. Group Management Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/groups
- **Query**: `paginationSchema`
- **Controller**: `listGroups`
- **Response**: Paginated list of assignee groups

### POST /api/v1/groups
- **Auth**: `requireRole('admin', 'manager')`
- **Schema**: `createGroupSchema`
- **Body Fields**: name, description, group_type, parent_group_id (optional)
- **Controller**: `createGroup`
- **Response**: Created group

### GET /api/v1/groups/:id
- **Params**: id (UUID)
- **Controller**: `getGroup`
- **Response**: Single group with metadata

### PUT /api/v1/groups/:id
- **Auth**: `requireRole('admin', 'manager')`
- **Params**: id (UUID)
- **Schema**: `updateGroupSchema`
- **Controller**: `updateGroup`
- **Response**: Updated group

### DELETE /api/v1/groups/:id
- **Auth**: `requireRole('admin')`
- **Params**: id (UUID)
- **Controller**: `deleteGroup`
- **Response**: 204 No Content

### GET /api/v1/groups/:id/members
- **Params**: id (UUID)
- **Controller**: `listGroupMembers`
- **Response**: List of users in the group

### POST /api/v1/groups/:id/members
- **Auth**: `requireRole('admin', 'manager')`
- **Params**: id (UUID)
- **Schema**: `addGroupMemberSchema`
- **Body Fields**: user_id, role_in_group (optional)
- **Controller**: `addGroupMember`
- **Response**: Created group-user membership

### DELETE /api/v1/groups/:id/members/:uid
- **Auth**: `requireRole('admin', 'manager')`
- **Params**: id (group UUID), uid (user UUID)
- **Controller**: `removeGroupMember`
- **Response**: 204 No Content

### GET /api/v1/groups/:id/tickets
- **Params**: id (UUID)
- **Query**: `paginationSchema`
- **Controller**: `getGroupTickets`
- **Response**: Paginated list of tickets assigned to group

---

## 6. Ticket Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/tickets
- **Query**: `ticketFilterSchema` (page, limit, status, priority, assignee_id, q, sort, order)
- **Controller**: `listTickets`
- **Response**: Paginated list of tickets with filtering

### POST /api/v1/tickets
- **Schema**: `createTicketSchema`
- **Body Fields**: ticket_type, title, description, priority, impact, urgency, asset_id (optional), assignee_id/assignee_group_id (optional), customer_id (optional), source (optional)
- **Controller**: `createTicket`
- **Response**: Created ticket with ticket_number

### GET /api/v1/tickets/stats
- **Controller**: `getTicketStats`
- **Response**: Statistics (open count, by status, by priority, by SLA, etc.)
- **Note**: Must be before /:id route

### GET /api/v1/tickets/board
- **Query**: `ticketFilterSchema`
- **Controller**: `getBoardData`
- **Response**: Board/Kanban data (tickets grouped by status/column)
- **Note**: Must be before /:id route

### GET /api/v1/tickets/stats/timeline
- **Controller**: `getTicketTimeline`
- **Response**: Ticket volume time-series (last N days)
- **Note**: Must be before /:id route

### GET /api/v1/tickets/stats/by-customer
- **Controller**: `getTicketsByCustomer`
- **Response**: Top N customers by ticket count

### GET /api/v1/tickets/categories
- **Controller**: `listCategoriesCtrl`
- **Response**: List of ticket categories

### POST /api/v1/tickets/categories
- **Schema**: `categorySchema` (name, description optional)
- **Controller**: `createCategoryCtrl`
- **Response**: Created category

### PUT /api/v1/tickets/categories/:id
- **Params**: id (UUID)
- **Schema**: `categorySchema`
- **Controller**: `updateCategoryCtrl`
- **Response**: Updated category

### DELETE /api/v1/tickets/categories/:id
- **Params**: id (UUID)
- **Controller**: `deleteCategoryCtrl`
- **Response**: 204 No Content (409 if tickets assigned)

### PATCH /api/v1/tickets/batch
- **Schema**: `batchUpdateSchema` (ticket_ids array, updates object)
- **Body Fields**: ticket_ids, updates { status, priority, assigned_to, assigned_group, category_id }
- **Controller**: `batchUpdateTickets`
- **Response**: Array of updated tickets
- **Note**: Must be before /:id route

### GET /api/v1/tickets/:id
- **Params**: id (UUID)
- **Controller**: `getTicket`
- **Response**: Full ticket details with comments count, history

### PUT /api/v1/tickets/:id
- **Params**: id (UUID)
- **Schema**: `updateTicketSchema`
- **Body Fields**: title, description, priority, impact, urgency, status, assignee_id, assignee_group_id, asset_id, etc.
- **Controller**: `updateTicket`
- **Response**: Updated ticket

### PATCH /api/v1/tickets/:id/status
- **Params**: id (UUID)
- **Schema**: `updateTicketStatusSchema` (status field)
- **Controller**: `updateTicketStatus`
- **Response**: Updated ticket with status change

### PATCH /api/v1/tickets/:id/assign
- **Params**: id (UUID)
- **Schema**: `assignTicketSchema` (assigned_to or assigned_group)
- **Controller**: `assignTicket`
- **Response**: Updated ticket

### PATCH /api/v1/tickets/:id/priority
- **Params**: id (UUID)
- **Schema**: `updatePrioritySchema` (priority field)
- **Controller**: `updateTicketPriority`
- **Response**: Updated ticket

### PATCH /api/v1/tickets/:id/archive
- **Params**: id (UUID)
- **Controller**: `archiveTicketCtrl`
- **Response**: Archived ticket
- **Notes**: Only closed/resolved → archived

### GET /api/v1/tickets/:id/comments
- **Params**: id (UUID)
- **Controller**: `getTicketComments`
- **Response**: List of ticket comments

### POST /api/v1/tickets/:id/comments
- **Params**: id (UUID)
- **Schema**: `createCommentSchema`
- **Body Fields**: content, is_internal (boolean optional)
- **Controller**: `addTicketComment`
- **Response**: Created comment

### GET /api/v1/tickets/:id/history
- **Params**: id (UUID)
- **Controller**: `getTicketHistory`
- **Response**: List of ticket change history entries

### GET /api/v1/tickets/:id/children
- **Params**: id (UUID)
- **Controller**: `getChildTickets`
- **Response**: List of child/dependent tickets

### GET /api/v1/tickets/:id/workflow
- **Params**: id (UUID)
- **Controller**: `getTicketWorkflow` (from workflows module)
- **Response**: Current workflow instance + status

### GET /api/v1/tickets/cab/pending
- **Controller**: `listCabPending`
- **Response**: List of pending CAB (Change Advisory Board) items

### GET /api/v1/tickets/cab/all
- **Controller**: `listCabAll`
- **Response**: List of all CAB items (pending + decided)

### POST /api/v1/tickets/:id/cab/decision
- **Params**: id (UUID)
- **Schema**: `cabDecisionSchema` (decision field: 'approved', 'rejected', 'deferred', notes optional)
- **Controller**: `setCabDecision`
- **Response**: Updated CAB decision

---

## 7. Asset (CMDB) Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/assets
- **Query**: `assetFilterSchema` (page, limit, status, asset_type, location, q, sort, order)
- **Controller**: `listAssets`
- **Response**: Paginated list of assets

### POST /api/v1/assets
- **Schema**: `createAssetSchema`
- **Body Fields**: asset_type, name, display_name, status, ip_address (optional), location (optional), sla_tier (optional), environment (optional), owner_group_id (optional), customer_id (optional), attributes (JSON optional)
- **Controller**: `createAsset`
- **Response**: Created asset

### GET /api/v1/assets/stats
- **Controller**: `getAssetStats`
- **Response**: Asset statistics (by type, by status, by SLA tier, etc.)
- **Note**: Must be before /:id route

### GET /api/v1/assets/graph
- **Controller**: `getFullAssetGraph`
- **Response**: Full topology graph (all assets + relations) for tenant
- **Note**: Must be before /:id route

### GET /api/v1/assets/:id
- **Params**: id (UUID)
- **Controller**: `getAsset`
- **Response**: Full asset details with relation count

### PUT /api/v1/assets/:id
- **Params**: id (UUID)
- **Schema**: `updateAssetSchema`
- **Body Fields**: name, display_name, status, ip_address, location, sla_tier, environment, owner_group_id, customer_id, attributes, etc.
- **Controller**: `updateAsset`
- **Response**: Updated asset

### DELETE /api/v1/assets/:id
- **Params**: id (UUID)
- **Controller**: `deleteAsset`
- **Response**: 204 No Content

### GET /api/v1/assets/:id/graph
- **Params**: id (UUID)
- **Controller**: `getAssetGraph`
- **Response**: Connected component graph centered on asset (BFS)

### GET /api/v1/assets/:id/relations
- **Params**: id (UUID)
- **Controller**: `getAssetRelations`
- **Response**: List of all relations (inbound + outbound) for asset

### POST /api/v1/assets/:id/relations
- **Params**: id (UUID)
- **Schema**: `createAssetRelationSchema`
- **Body Fields**: target_asset_id, relation_type, properties (JSON optional)
- **Controller**: `createAssetRelation`
- **Response**: Created relation

### DELETE /api/v1/assets/:id/relations/:rid
- **Params**: id (asset UUID), rid (relation UUID)
- **Controller**: `deleteAssetRelation`
- **Response**: 204 No Content

### GET /api/v1/assets/:id/tickets
- **Params**: id (UUID)
- **Controller**: `getAssetTickets`
- **Response**: List of tickets linked to asset

### GET /api/v1/assets/:id/sla-chain
- **Params**: id (UUID)
- **Controller**: `getAssetSlaChain`
- **Response**: SLA inheritance chain upward through hierarchy

### GET /api/v1/assets/:id/services
- **Params**: id (UUID)
- **Controller**: `getAssetServices`
- **Response**: List of services linked via vertical catalogs

### GET /api/v1/assets/:id/compliance
- **Params**: id (UUID)
- **Controller**: `getAssetCompliance`
- **Response**: Regulatory flags + compliance matrix for asset

### GET /api/v1/assets/:id/classifications
- **Params**: id (UUID)
- **Controller**: `getAssetClassifications`
- **Response**: List of asset classifications

### POST /api/v1/assets/:id/classifications
- **Params**: id (UUID)
- **Schema**: `classifyAssetSchema`
- **Body Fields**: classification_value_id
- **Controller**: `classifyAsset`
- **Response**: Created asset-classification link

### DELETE /api/v1/assets/:id/classifications/:vid
- **Params**: id (asset UUID), vid (value UUID)
- **Controller**: `removeAssetClassification`
- **Response**: 204 No Content

---

## 8. Customer Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/customers
- **Query**: `paginationSchema`
- **Controller**: `listCustomers`
- **Response**: Paginated list of customers

### GET /api/v1/customers/:id
- **Params**: id (UUID)
- **Controller**: `getCustomer`
- **Response**: Single customer details

### POST /api/v1/customers
- **Auth**: `requireRole('admin', 'manager')`
- **Schema**: Inferred from controller
- **Body Fields**: name, industry (optional), contact_email (optional), is_active (optional)
- **Controller**: `createCustomer`
- **Response**: Created customer

### PUT /api/v1/customers/:id
- **Auth**: `requireRole('admin', 'manager')`
- **Params**: id (UUID)
- **Schema**: Inferred from controller
- **Controller**: `updateCustomer`
- **Response**: Updated customer

### DELETE /api/v1/customers/:id
- **Auth**: `requireRole('admin', 'manager')`
- **Params**: id (UUID)
- **Controller**: `deleteCustomer`
- **Response**: 204 No Content (409 if open tickets exist) — soft-delete (deactivate)

### GET /api/v1/customers/:id/overview
- **Params**: id (UUID)
- **Controller**: `getCustomerOverview`
- **Response**: Comprehensive customer overview (assets, tickets, SLAs, services)

---

## 9. Workflow Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/workflows/templates
- **Query**: `workflowFilterSchema`
- **Controller**: `listTemplates`
- **Response**: Paginated list of workflow templates

### POST /api/v1/workflows/templates
- **Schema**: `createWorkflowTemplateSchema`
- **Body Fields**: name, description, trigger_type, trigger_subtype, is_active (optional)
- **Controller**: `createTemplate`
- **Response**: Created template

### GET /api/v1/workflows/templates/:id
- **Params**: id (UUID)
- **Controller**: `getTemplate`
- **Response**: Template with all steps

### PUT /api/v1/workflows/templates/:id
- **Params**: id (UUID)
- **Schema**: `updateWorkflowTemplateSchema`
- **Controller**: `updateTemplate`
- **Response**: Updated template

### DELETE /api/v1/workflows/templates/:id
- **Params**: id (UUID)
- **Controller**: `deleteTemplate`
- **Response**: 204 No Content

### POST /api/v1/workflows/templates/:id/steps
- **Params**: id (template UUID)
- **Schema**: `createWorkflowStepSchema`
- **Body Fields**: name, step_type, config (JSON), timeout_hours (optional), next_step_id (optional)
- **Controller**: `addStep`
- **Response**: Created step

### DELETE /api/v1/workflows/templates/:id/steps/:sid
- **Params**: id (template UUID), sid (step UUID)
- **Controller**: `removeStep`
- **Response**: 204 No Content

### PUT /api/v1/workflows/templates/:id/steps/reorder
- **Params**: id (template UUID)
- **Schema**: `reorderWorkflowStepsSchema`
- **Body Fields**: step_ids (array of step IDs in new order)
- **Controller**: `reorderSteps`
- **Response**: Updated step ordering

### GET /api/v1/workflows/templates/:id/instances
- **Params**: id (template UUID)
- **Controller**: `getTemplateInstances`
- **Response**: List of workflow instances for template

### POST /api/v1/workflows/instantiate
- **Schema**: `instantiateWorkflowSchema`
- **Body Fields**: template_id, ticket_id, initial_form_data (optional JSON)
- **Controller**: `instantiate`
- **Response**: Created workflow instance

### GET /api/v1/workflows/instances/:id
- **Params**: id (instance UUID)
- **Controller**: `getInstance`
- **Response**: Full workflow instance state

### POST /api/v1/workflows/instances/:id/steps/:sid/complete
- **Params**: id (instance UUID), sid (step UUID)
- **Schema**: `completeWorkflowStepSchema`
- **Body Fields**: form_data (JSON optional), next_branch (optional)
- **Controller**: `completeStep`
- **Response**: Updated instance with progress to next step

### POST /api/v1/workflows/instances/:id/cancel
- **Params**: id (instance UUID)
- **Controller**: `cancelInstance`
- **Response**: Cancelled instance

### GET /api/v1/workflows/ticket/:ticketId
- **Params**: ticketId (UUID)
- **Controller**: `getTicketWorkflow`
- **Response**: Current workflow instance for ticket (if any)

---

## 10. Service Catalog Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/services/descriptions
- **Query**: `serviceDescriptionFilterSchema`
- **Controller**: `listServiceDescriptions`
- **Response**: Paginated list of service descriptions

### POST /api/v1/services/descriptions
- **Schema**: `createServiceDescriptionSchema`
- **Body Fields**: code, title, description, scope_included, scope_excluded, compliance_tags (JSON optional), status (optional)
- **Controller**: `createServiceDescription`
- **Response**: Created service description

### GET /api/v1/services/descriptions/:id
- **Params**: id (UUID)
- **Controller**: `getServiceDescription`
- **Response**: Single service description

### PUT /api/v1/services/descriptions/:id
- **Params**: id (UUID)
- **Schema**: `updateServiceDescriptionSchema`
- **Controller**: `updateServiceDescription`
- **Response**: Updated service description

### DELETE /api/v1/services/descriptions/:id
- **Params**: id (UUID)
- **Controller**: `deleteServiceDescription`
- **Response**: 204 No Content

### GET /api/v1/services/catalogs/horizontal
- **Query**: `catalogFilterSchema`
- **Controller**: `listHorizontalCatalogs`
- **Response**: Paginated list of horizontal catalogs

### POST /api/v1/services/catalogs/horizontal
- **Schema**: `createHorizontalCatalogSchema`
- **Body Fields**: name, description, status (optional)
- **Controller**: `createHorizontalCatalog`
- **Response**: Created horizontal catalog

### GET /api/v1/services/catalogs/horizontal/:id
- **Params**: id (UUID)
- **Controller**: `getHorizontalCatalog`
- **Response**: Horizontal catalog with items

### PUT /api/v1/services/catalogs/horizontal/:id
- **Params**: id (UUID)
- **Schema**: `updateHorizontalCatalogSchema`
- **Controller**: `updateHorizontalCatalog`
- **Response**: Updated catalog

### DELETE /api/v1/services/catalogs/horizontal/:id
- **Params**: id (UUID)
- **Controller**: `deleteHorizontalCatalog`
- **Response**: 204 No Content

### POST /api/v1/services/catalogs/horizontal/:id/items
- **Params**: id (catalog UUID)
- **Schema**: `addCatalogItemSchema`
- **Body Fields**: service_description_id
- **Controller**: `addCatalogItem`
- **Response**: Created catalog-item link

### DELETE /api/v1/services/catalogs/horizontal/:id/items/:sid
- **Params**: id (catalog UUID), sid (service UUID)
- **Controller**: `removeCatalogItem`
- **Response**: 204 No Content

### GET /api/v1/services/catalogs/vertical
- **Controller**: `listVerticalCatalogs`
- **Response**: List of vertical catalogs (enterprise)

### POST /api/v1/services/catalogs/vertical
- **Controller**: `createVerticalCatalog`
- **Response**: Created vertical catalog

### GET /api/v1/services/catalogs/vertical/:id
- **Params**: id (UUID)
- **Controller**: `getVerticalCatalog`
- **Response**: Vertical catalog with overrides

### PUT /api/v1/services/catalogs/vertical/:id
- **Params**: id (UUID)
- **Controller**: `updateVerticalCatalog`
- **Response**: Updated vertical catalog

### DELETE /api/v1/services/catalogs/vertical/:id
- **Params**: id (UUID)
- **Controller**: `deleteVerticalCatalog`
- **Response**: 204 No Content

### POST /api/v1/services/catalogs/vertical/:id/overrides
- **Params**: id (vertical catalog UUID)
- **Controller**: `addVerticalOverride`
- **Response**: Created override

### DELETE /api/v1/services/catalogs/vertical/:id/overrides/:oid
- **Params**: id (vertical UUID), oid (override UUID)
- **Controller**: `removeVerticalOverride`
- **Response**: 204 No Content

---

## 11. Compliance Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/compliance/frameworks
- **Query**: `complianceFilterSchema`
- **Controller**: `listFrameworks`
- **Response**: Paginated list of regulatory frameworks

### POST /api/v1/compliance/frameworks
- **Schema**: `createRegulatoryFrameworkSchema`
- **Body Fields**: name, version, description, effective_date (optional)
- **Controller**: `createFramework`
- **Response**: Created framework

### GET /api/v1/compliance/frameworks/:id
- **Params**: id (UUID)
- **Controller**: `getFramework`
- **Response**: Framework with requirements

### PUT /api/v1/compliance/frameworks/:id
- **Params**: id (UUID)
- **Schema**: `updateRegulatoryFrameworkSchema`
- **Controller**: `updateFramework`
- **Response**: Updated framework

### DELETE /api/v1/compliance/frameworks/:id
- **Params**: id (UUID)
- **Controller**: `deleteFramework`
- **Response**: 204 No Content (fails if requirements exist)

### GET /api/v1/compliance/frameworks/:id/requirements
- **Params**: id (framework UUID)
- **Query**: `complianceFilterSchema`
- **Controller**: `listRequirements`
- **Response**: Paginated list of requirements

### POST /api/v1/compliance/frameworks/:id/requirements
- **Params**: id (framework UUID)
- **Schema**: `createRequirementSchema`
- **Body Fields**: code, title, description, category
- **Controller**: `createRequirement`
- **Response**: Created requirement

### PUT /api/v1/compliance/requirements/:rid
- **Params**: rid (requirement UUID)
- **Schema**: `updateRequirementSchema`
- **Controller**: `updateRequirement`
- **Response**: Updated requirement

### DELETE /api/v1/compliance/requirements/:rid
- **Params**: rid (requirement UUID)
- **Controller**: `deleteRequirement`
- **Response**: 204 No Content (fails if mappings exist)

### POST /api/v1/compliance/requirements/:rid/mappings/:sid
- **Params**: rid (requirement UUID), sid (service UUID)
- **Schema**: `upsertMappingSchema`
- **Body Fields**: coverage_level, evidence_notes (optional)
- **Controller**: `upsertMapping`
- **Response**: Created/updated mapping

### DELETE /api/v1/compliance/requirements/:rid/mappings/:sid
- **Params**: rid (requirement UUID), sid (service UUID)
- **Controller**: `deleteMapping`
- **Response**: 204 No Content

### GET /api/v1/compliance/frameworks/:id/matrix
- **Params**: id (framework UUID)
- **Controller**: `getMatrix`
- **Response**: Full compliance matrix (requirements + all mappings)

### GET /api/v1/compliance/frameworks/:id/assets
- **Params**: id (framework UUID)
- **Controller**: `getFrameworkAssets`
- **Response**: List of assets flagged for framework

### POST /api/v1/compliance/frameworks/:id/assets
- **Params**: id (framework UUID)
- **Schema**: `flagAssetSchema`
- **Body Fields**: asset_id, reason (optional)
- **Controller**: `flagAsset`
- **Response**: Created flag

### DELETE /api/v1/compliance/frameworks/:id/assets/:aid
- **Params**: id (framework UUID), aid (asset UUID)
- **Controller**: `unflagAsset`
- **Response**: 204 No Content

### GET /api/v1/compliance/controls
- **Query**: `controlFilterSchema`
- **Controller**: `listControls`
- **Response**: Paginated list of compliance controls

### POST /api/v1/compliance/controls
- **Schema**: `createComplianceControlSchema`
- **Body Fields**: control_code, title, description, category, status
- **Controller**: `createControl`
- **Response**: Created control

### GET /api/v1/compliance/controls/:id
- **Params**: id (UUID)
- **Controller**: `getControl`
- **Response**: Control with requirement mappings

### PUT /api/v1/compliance/controls/:id
- **Params**: id (UUID)
- **Schema**: `updateComplianceControlSchema`
- **Controller**: `updateControl`
- **Response**: Updated control

### DELETE /api/v1/compliance/controls/:id
- **Params**: id (UUID)
- **Controller**: `deleteControl`
- **Response**: 204 No Content (fails if mappings exist)

### POST /api/v1/compliance/controls/mappings
- **Schema**: `mapRequirementControlSchema`
- **Body Fields**: requirement_id, control_id, coverage_notes (optional)
- **Controller**: `mapRequirementToControl`
- **Response**: Created mapping

### DELETE /api/v1/compliance/controls/mappings/:requirementId/:controlId
- **Params**: requirementId (UUID), controlId (UUID)
- **Controller**: `removeRequirementControlMapping`
- **Response**: 204 No Content

### GET /api/v1/compliance/controls/:id/mappings
- **Params**: id (control UUID)
- **Controller**: `getCrossFrameworkMappings`
- **Response**: Cross-framework mappings for control

### GET /api/v1/compliance/audits
- **Query**: `auditFilterSchema`
- **Controller**: `listAudits`
- **Response**: Paginated list of compliance audits

### POST /api/v1/compliance/audits
- **Schema**: `createComplianceAuditSchema`
- **Body Fields**: audit_name, framework_id, audit_date, auditor_id (optional), notes (optional)
- **Controller**: `createAudit`
- **Response**: Created audit

### GET /api/v1/compliance/audits/:id
- **Params**: id (UUID)
- **Controller**: `getAudit`
- **Response**: Audit with finding count

### PUT /api/v1/compliance/audits/:id
- **Params**: id (UUID)
- **Schema**: `updateComplianceAuditSchema`
- **Controller**: `updateAudit`
- **Response**: Updated audit

### DELETE /api/v1/compliance/audits/:id
- **Params**: id (UUID)
- **Controller**: `deleteAudit`
- **Response**: 204 No Content (fails if findings exist)

### GET /api/v1/compliance/audits/:id/findings
- **Params**: id (audit UUID)
- **Controller**: `listFindings`
- **Response**: List of audit findings

### POST /api/v1/compliance/audits/:id/findings
- **Params**: id (audit UUID)
- **Schema**: `createAuditFindingSchema`
- **Body Fields**: control_id, finding_type, severity, description, remediation (optional)
- **Controller**: `createFinding`
- **Response**: Created finding

### PUT /api/v1/compliance/findings/:id
- **Params**: id (finding UUID)
- **Schema**: `updateAuditFindingSchema`
- **Controller**: `updateFinding`
- **Response**: Updated finding

### DELETE /api/v1/compliance/findings/:id
- **Params**: id (finding UUID)
- **Controller**: `deleteFinding`
- **Response**: 204 No Content

### GET /api/v1/compliance/evidence
- **Controller**: `listAllEvidence`
- **Response**: List of all evidence across all controls

### GET /api/v1/compliance/controls/:id/evidence
- **Params**: id (control UUID)
- **Controller**: `listEvidence`
- **Response**: List of evidence for a specific control

### POST /api/v1/compliance/controls/:id/evidence
- **Params**: id (control UUID)
- **Schema**: `createComplianceEvidenceSchema`
- **Body Fields**: evidence_type, description, evidence_url (optional), document_path (optional), uploaded_at (optional)
- **Controller**: `createEvidence`
- **Response**: Created evidence

### DELETE /api/v1/compliance/evidence/:id
- **Params**: id (evidence UUID)
- **Controller**: `deleteEvidence`
- **Response**: 204 No Content

---

## 12. Knowledge Base Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/kb/articles
- **Query**: `kbFilterSchema` (page, limit, q, status, visibility, category, sort, order)
- **Controller**: `listArticles`
- **Response**: Paginated list of KB articles

### GET /api/v1/kb/articles/search
- **Query**: q (required), visibility (optional), limit (optional)
- **Controller**: `searchArticles`
- **Response**: Full-text search results with relevance scoring and snippets

### POST /api/v1/kb/articles
- **Schema**: `createKbArticleSchema`
- **Body Fields**: title, slug, content (Markdown), category, tags (JSON optional), visibility ('internal' or 'public'), status ('draft', 'published', 'archived')
- **Controller**: `createArticle`
- **Response**: Created article

### GET /api/v1/kb/articles/:id
- **Params**: id (UUID)
- **Controller**: `getArticle`
- **Response**: Article with linked ticket IDs

### PUT /api/v1/kb/articles/:id
- **Params**: id (UUID)
- **Schema**: `updateKbArticleSchema`
- **Controller**: `updateArticle`
- **Response**: Updated article

### DELETE /api/v1/kb/articles/:id
- **Params**: id (UUID)
- **Controller**: `deleteArticle`
- **Response**: 204 No Content (deletes all ticket links)

### POST /api/v1/kb/articles/:id/link/:ticketId
- **Params**: id (article UUID), ticketId (ticket UUID)
- **Controller**: `linkToTicket`
- **Response**: Created link (idempotent)

### DELETE /api/v1/kb/articles/:id/link/:ticketId
- **Params**: id (article UUID), ticketId (ticket UUID)
- **Controller**: `unlinkFromTicket`
- **Response**: 204 No Content

---

## 13. Email Inbound Routes

All routes require `requireAuth` + `tenantMiddleware` except webhook.

### POST /api/v1/email/webhook (Public)
- **Auth**: No auth required (webhook signature validation instead)
- **Schema**: `webhookPayloadSchema`
- **Body Fields**: hostname, service_name, state, output (optional), external_id (optional)
- **Controller**: `processWebhook`
- **Response**: 200 OK (processes in background)
- **Note**: Must be before other email routes

### GET /api/v1/email/configs
- **Query**: `paginationSchema`
- **Auth**: `requireAuth`
- **Controller**: `listConfigs`
- **Response**: Paginated list of email configs

### POST /api/v1/email/configs
- **Auth**: `requireRole('admin', 'manager')`
- **Schema**: `createEmailConfigSchema`
- **Body Fields**: name, provider ('imap', 'webhook_mailgun', 'webhook_sendgrid'), config (JSON), target_group_id (optional), default_ticket_type (optional), is_active (optional)
- **Controller**: `createConfig`
- **Response**: Created config

### GET /api/v1/email/configs/:id
- **Params**: id (UUID)
- **Auth**: `requireAuth`
- **Controller**: `getConfig`
- **Response**: Single email config

### PUT /api/v1/email/configs/:id
- **Auth**: `requireRole('admin', 'manager')`
- **Params**: id (UUID)
- **Schema**: `updateEmailConfigSchema`
- **Controller**: `updateConfig`
- **Response**: Updated config

### DELETE /api/v1/email/configs/:id
- **Auth**: `requireRole('admin')`
- **Params**: id (UUID)
- **Controller**: `deleteConfig`
- **Response**: 204 No Content

### POST /api/v1/email/configs/:id/test
- **Auth**: `requireRole('admin', 'manager')`
- **Params**: id (UUID)
- **Controller**: `testConnection`
- **Response**: Test result (mailboxes for IMAP, or success message for webhook)

### GET /api/v1/email/messages
- **Auth**: `requireAuth`
- **Query**: `emailFilterSchema` (page, limit, config_id, processed)
- **Controller**: `listMessages`
- **Response**: Paginated list of processed email messages

### GET /api/v1/email/messages/:id
- **Auth**: `requireAuth`
- **Params**: id (UUID)
- **Controller**: `getMessage`
- **Response**: Single email message with headers, body

---

## 14. Portal Routes (Customer-Facing)

Portal uses separate auth (JWT with portal: true).

### POST /api/v1/portal/auth/login
- **Auth**: Public
- **Schema**: Inferred (email, password)
- **Controller**: `login`
- **Response**: Portal JWT token

### POST /api/v1/portal/auth/logout
- **Auth**: Portal auth required
- **Controller**: (inline handler)
- **Response**: Success message

### GET /api/v1/portal/auth/me
- **Auth**: `requirePortalAuth`
- **Controller**: `me`
- **Response**: Current portal user + customer info

### GET /api/v1/portal/tickets
- **Auth**: `requirePortalAuth`
- **Controller**: `listTickets`
- **Response**: Tickets for portal user's customer only

### GET /api/v1/portal/tickets/:id
- **Auth**: `requirePortalAuth`
- **Params**: id (UUID)
- **Controller**: `getTicket`
- **Response**: Single ticket with external comments only

### POST /api/v1/portal/tickets
- **Auth**: `requirePortalAuth`
- **Schema**: Inferred from controller
- **Controller**: `createTicket`
- **Response**: Created ticket

### POST /api/v1/portal/tickets/:id/comments
- **Auth**: `requirePortalAuth`
- **Params**: id (UUID)
- **Schema**: Inferred (content)
- **Controller**: `addComment`
- **Response**: Created external comment

### GET /api/v1/portal/services
- **Auth**: `requirePortalAuth`
- **Controller**: `listServices`
- **Response**: Published service descriptions

### GET /api/v1/portal/kb
- **Auth**: `requirePortalAuth`
- **Query**: q (optional search)
- **Controller**: `listKb`
- **Response**: Public, published KB articles only

---

## 15. Settings Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/settings
- **Controller**: `listSettings`
- **Response**: All visible settings for tenant

### GET /api/v1/settings/runtime
- **Auth**: `requireRole('admin')`
- **Controller**: `getRuntime`
- **Response**: Non-secret runtime configuration

### GET /api/v1/settings/password-policy
- **Controller**: `getPasswordPolicy`
- **Response**: Tenant's password policy

### PUT /api/v1/settings/password-policy
- **Auth**: `requireRole('admin')`
- **Schema**: `passwordPolicySchema`
- **Body Fields**: min_length, require_uppercase, require_lowercase, require_digit, require_special, expiry_days, history_count
- **Controller**: `updatePasswordPolicy`
- **Response**: Updated policy

### GET /api/v1/settings/:key
- **Params**: key (validated with regex /^[a-zA-Z0-9._-]+$/)
- **Controller**: `getSettingByKey`
- **Response**: Single setting value

### PUT /api/v1/settings/:key
- **Auth**: `requireRole('admin')`
- **Params**: key (validated)
- **Schema**: `updateSettingSchema` (value field)
- **Controller**: `updateSettingByKey`
- **Response**: Updated setting

### DELETE /api/v1/settings/:key
- **Auth**: `requireRole('admin')`
- **Params**: key (validated)
- **Controller**: `deleteSettingByKey`
- **Response**: 204 No Content

---

## 16. License Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/license
- **Controller**: `getLicense`
- **Response**: License info (edition, expiry, features, limits)

### GET /api/v1/license/usage
- **Controller**: `getLicenseUsageHandler`
- **Response**: Current resource usage vs. license limits

### POST /api/v1/license/activate
- **Auth**: `requireRole('admin')`
- **Schema**: `activateLicenseSchema`
- **Body Fields**: license_key (JWT string)
- **Controller**: `activateLicenseHandler`
- **Response**: Activated license details

### DELETE /api/v1/license
- **Auth**: `requireRole('admin')`
- **Controller**: `deactivateLicenseHandler`
- **Response**: 204 No Content (reverts to community edition)

---

## 17. Monitoring Routes

### GET /api/v1/monitoring/sources
- **Auth**: `requireAuth` + tenantMiddleware
- **Controller**: `listSources`
- **Response**: List of monitoring sources

### GET /api/v1/monitoring/sources/:id
- **Auth**: `requireAuth` + tenantMiddleware
- **Params**: id (UUID)
- **Controller**: `getSource`
- **Response**: Single monitoring source

### POST /api/v1/monitoring/sources
- **Auth**: `requireRole('admin', 'manager')` + tenantMiddleware
- **Schema**: `createSourceSchema`
- **Body Fields**: name, type (enum), config (JSON optional), webhook_secret (optional), is_active (optional)
- **Controller**: `createSource`
- **Response**: Created source

### PUT /api/v1/monitoring/sources/:id
- **Auth**: `requireRole('admin', 'manager')` + tenantMiddleware
- **Params**: id (UUID)
- **Schema**: `updateSourceSchema`
- **Controller**: `updateSource`
- **Response**: Updated source

### DELETE /api/v1/monitoring/sources/:id
- **Auth**: `requireRole('admin', 'manager')` + tenantMiddleware
- **Params**: id (UUID)
- **Controller**: `deleteSource`
- **Response**: 204 No Content

### GET /api/v1/monitoring/events
- **Auth**: `requireAuth` + tenantMiddleware
- **Controller**: `listEvents`
- **Response**: List of monitoring events

### GET /api/v1/monitoring/events/stats
- **Auth**: `requireAuth` + tenantMiddleware
- **Controller**: `getStats`
- **Response**: Event statistics

### GET /api/v1/monitoring/events/:id
- **Auth**: `requireAuth` + tenantMiddleware
- **Params**: id (UUID)
- **Controller**: `getEvent`
- **Response**: Single monitoring event

### PUT /api/v1/monitoring/events/:id/acknowledge
- **Auth**: `requireAuth` + tenantMiddleware
- **Params**: id (UUID)
- **Controller**: `acknowledgeEvent`
- **Response**: Updated event (acknowledged)

### POST /api/v1/monitoring/events/webhook/:sourceId (Public)
- **Auth**: Webhook signature validation (no JWT)
- **Params**: sourceId (UUID)
- **Schema**: `webhookPayloadSchema`
- **Body**: Single event or array of events
- **Controller**: `webhookIngest`
- **Response**: 200 OK (processes in background)
- **Note**: Mounted outside protected routes

---

## 18. SLA Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/sla/definitions
- **Controller**: `listDefinitions`
- **Response**: List of SLA definitions

### GET /api/v1/sla/definitions/:id
- **Params**: id (UUID)
- **Controller**: `getDefinition`
- **Response**: Single SLA definition

### POST /api/v1/sla/definitions
- **Auth**: `requireRole('admin')`
- **Schema**: `createDefinitionSchema`
- **Body Fields**: name, response_time_minutes, resolution_time_minutes, business_hours, business_hours_start/end, priority_overrides (JSON), rpo_minutes (optional), rto_minutes (optional), service_window (JSON optional), escalation_matrix (optional), is_default (optional)
- **Controller**: `createDefinition`
- **Response**: Created definition

### PUT /api/v1/sla/definitions/:id
- **Auth**: `requireRole('admin')`
- **Params**: id (UUID)
- **Schema**: `updateDefinitionSchema`
- **Controller**: `updateDefinition`
- **Response**: Updated definition

### DELETE /api/v1/sla/definitions/:id
- **Auth**: `requireRole('admin')`
- **Params**: id (UUID)
- **Controller**: `deleteDefinition`
- **Response**: 204 No Content

### GET /api/v1/sla/assignments
- **Controller**: `listAssignments`
- **Response**: List of SLA assignments (service/customer/asset to SLA definition)

### POST /api/v1/sla/assignments
- **Auth**: `requireRole('admin')`
- **Schema**: `createAssignmentSchema`
- **Body Fields**: sla_definition_id, service_id (optional), customer_id (optional), asset_id (optional)
- **Controller**: `createAssignment`
- **Response**: Created assignment

### DELETE /api/v1/sla/assignments/:id
- **Auth**: `requireRole('admin')`
- **Params**: id (UUID)
- **Controller**: `deleteAssignment`
- **Response**: 204 No Content

### GET /api/v1/sla/reports/performance
- **Controller**: `performanceReport`
- **Response**: SLA performance metrics and breach statistics

### GET /api/v1/sla/resolve
- **Controller**: `resolveEffective`
- **Response**: Resolve effective SLA for given context (query params specify context)

---

## 19. Audit Log Routes

All routes require `requireAuth` + `tenantMiddleware` + `requireRole('admin')`.

### GET /api/v1/audit
- **Query**: `auditQuerySchema` (page, limit, event_type, resource_type, actor_id, q, from, to)
- **Controller**: Inline handler → `auditService.listAuditLogs`
- **Response**: Paginated audit log entries

### GET /api/v1/audit/event-types
- **Controller**: Inline handler → `auditService.getEventTypes`
- **Response**: List of distinct event types for filtering

### GET /api/v1/audit/resource-types
- **Controller**: Inline handler → `auditService.getResourceTypes`
- **Response**: List of distinct resource types for filtering

### GET /api/v1/audit/verify-integrity
- **Controller**: Inline handler → `auditService.verifyIntegrity`
- **Response**: Hash chain integrity verification result

### GET /api/v1/audit/export
- **Query**: `auditQuerySchema` + format ('json' or 'csv')
- **Controller**: Inline handler → `auditService.listAuditLogs` + export formatting
- **Response**: File download (JSON or CSV)

---

## 20. Notification Preferences Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/notifications/preferences
- **Controller**: Inline handler → `getPreferences`
- **Response**: User's notification preferences with defaults

### PUT /api/v1/notifications/preferences
- **Schema**: `updatePreferencesSchema`
- **Body Fields**: preferences (array of { event_type, channel, enabled })
- **Controller**: Inline handler → `bulkUpsertPreferences`
- **Response**: Updated preferences

---

## 21. Feedback Routes (Public)

### GET /api/v1/feedback
- **Auth**: Public
- **Controller**: `list`
- **Response**: List of feedback items

### POST /api/v1/feedback
- **Auth**: Public
- **Schema**: Inferred from controller
- **Controller**: `create`
- **Response**: Created feedback item

### POST /api/v1/feedback/:id/vote
- **Auth**: Public
- **Params**: id (UUID)
- **Schema**: Inferred (vote value)
- **Controller**: `vote`
- **Response**: Updated feedback with vote count

---

## 22. Known Errors Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/known-errors
- **Query**: `filterSchema` (page, limit, status)
- **Controller**: Inline handler → `keService.listKnownErrors`
- **Response**: Paginated list of known errors

### GET /api/v1/known-errors/search
- **Query**: q (search term)
- **Controller**: Inline handler → `keService.searchKnownErrors`
- **Response**: Search results (for incident linking)

### GET /api/v1/known-errors/:id
- **Params**: id (UUID)
- **Controller**: Inline handler → `keService.getKnownError`
- **Response**: Single known error

### POST /api/v1/known-errors
- **Schema**: `createKnownErrorSchema`
- **Body Fields**: title, symptom, workaround (optional), root_cause (optional), status (optional), problem_id (optional)
- **Controller**: Inline handler → `keService.createKnownError`
- **Response**: Created known error

### PUT /api/v1/known-errors/:id
- **Params**: id (UUID)
- **Schema**: `updateKnownErrorSchema`
- **Controller**: Inline handler → `keService.updateKnownError`
- **Response**: Updated known error

### DELETE /api/v1/known-errors/:id
- **Params**: id (UUID)
- **Controller**: Inline handler → `keService.deleteKnownError`
- **Response**: 204 No Content

---

## 23. Escalation Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/escalation/rules
- **Controller**: Inline handler → `escalationService.listRules`
- **Response**: List of escalation rules

### POST /api/v1/escalation/rules
- **Schema**: `createRuleSchema`
- **Body Fields**: name, ticket_type (optional), priority (optional), sla_threshold_pct, target_group_id, escalation_level
- **Controller**: Inline handler → `escalationService.createRule`
- **Response**: Created rule

### PUT /api/v1/escalation/rules/:id
- **Params**: id (UUID)
- **Schema**: `updateRuleSchema`
- **Controller**: Inline handler → `escalationService.updateRule`
- **Response**: Updated rule

### DELETE /api/v1/escalation/rules/:id
- **Params**: id (UUID)
- **Controller**: Inline handler → `escalationService.deleteRule`
- **Response**: 204 No Content

### POST /api/v1/escalation/tickets/:id/escalate
- **Params**: id (ticket UUID)
- **Schema**: `escalateSchema`
- **Body Fields**: target_group_id, reason (optional)
- **Controller**: Inline handler → `escalationService.manualEscalate`
- **Response**: Success message

### POST /api/v1/escalation/tickets/:id/major-incident
- **Params**: id (ticket UUID)
- **Schema**: `declareMajorSchema`
- **Body Fields**: incident_commander_id (optional), bridge_call_url (optional)
- **Controller**: Inline handler → `escalationService.declareMajorIncident`
- **Response**: Success message

### POST /api/v1/escalation/tickets/:id/resolve-major
- **Params**: id (ticket UUID)
- **Controller**: Inline handler → `escalationService.resolveMajorIncident`
- **Response**: Success message

---

## 24. Asset Type Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/asset-types
- **Controller**: `listAssetTypes`
- **Response**: List of asset types

### POST /api/v1/asset-types
- **Schema**: `createAssetTypeSchema`
- **Controller**: `createAssetType`
- **Response**: Created asset type

### GET /api/v1/asset-types/:id
- **Params**: id (UUID)
- **Controller**: `getAssetType`
- **Response**: Single asset type

### PUT /api/v1/asset-types/:id
- **Params**: id (UUID)
- **Schema**: `updateAssetTypeSchema`
- **Controller**: `updateAssetType`
- **Response**: Updated asset type

### DELETE /api/v1/asset-types/:id
- **Params**: id (UUID)
- **Controller**: `deleteAssetType`
- **Response**: 204 No Content

---

## 25. Relation Type Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/relation-types
- **Controller**: `listRelationTypes`
- **Response**: List of relation types

### POST /api/v1/relation-types
- **Schema**: `createRelationTypeSchema`
- **Controller**: `createRelationType`
- **Response**: Created relation type

### GET /api/v1/relation-types/:id
- **Params**: id (UUID)
- **Controller**: `getRelationType`
- **Response**: Single relation type

### PUT /api/v1/relation-types/:id
- **Params**: id (UUID)
- **Schema**: `updateRelationTypeSchema`
- **Controller**: `updateRelationType`
- **Response**: Updated relation type

### DELETE /api/v1/relation-types/:id
- **Params**: id (UUID)
- **Controller**: `deleteRelationType`
- **Response**: 204 No Content

---

## 26. Classification Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/classifications
- **Controller**: `listClassificationModels`
- **Response**: List of classification models

### POST /api/v1/classifications
- **Schema**: `createClassificationModelSchema`
- **Controller**: `createClassificationModel`
- **Response**: Created classification model

### GET /api/v1/classifications/:id
- **Params**: id (UUID)
- **Controller**: `getClassificationModel`
- **Response**: Single classification model with values

### PUT /api/v1/classifications/:id
- **Params**: id (UUID)
- **Schema**: `updateClassificationModelSchema`
- **Controller**: `updateClassificationModel`
- **Response**: Updated classification model

### DELETE /api/v1/classifications/:id
- **Params**: id (UUID)
- **Controller**: `deleteClassificationModel`
- **Response**: 204 No Content

### POST /api/v1/classifications/:id/values
- **Params**: id (model UUID)
- **Schema**: `createClassificationValueSchema`
- **Body Fields**: name, description (optional), color (optional)
- **Controller**: `createClassificationValue`
- **Response**: Created classification value

### PUT /api/v1/classifications/:id/values/:vid
- **Params**: id (model UUID), vid (value UUID)
- **Schema**: `createClassificationValueSchema.partial()`
- **Controller**: `updateClassificationValue`
- **Response**: Updated classification value

### DELETE /api/v1/classifications/:id/values/:vid
- **Params**: id (model UUID), vid (value UUID)
- **Controller**: `deleteClassificationValue`
- **Response**: 204 No Content

---

## 27. Capacity Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/capacity/types
- **Controller**: `listCapacityTypes`
- **Response**: List of capacity types

### POST /api/v1/capacity/types
- **Schema**: `createCapacityTypeSchema`
- **Controller**: `createCapacityType`
- **Response**: Created capacity type

### PUT /api/v1/capacity/types/:id
- **Params**: id (UUID)
- **Controller**: `updateCapacityType`
- **Response**: Updated capacity type

### DELETE /api/v1/capacity/types/:id
- **Params**: id (UUID)
- **Controller**: `deleteCapacityType`
- **Response**: 204 No Content

### GET /api/v1/capacity/assets/:id
- **Params**: id (asset UUID)
- **Controller**: `getAssetCapacities`
- **Response**: List of capacity allocations for asset

### POST /api/v1/capacity/assets/:id
- **Params**: id (asset UUID)
- **Schema**: `setAssetCapacitySchema`
- **Body Fields**: capacity_type_id, allocated, used (optional)
- **Controller**: `setAssetCapacity`
- **Response**: Created/updated capacity allocation

### DELETE /api/v1/capacity/assets/:id/:cid
- **Params**: id (asset UUID), cid (capacity UUID)
- **Controller**: `deleteAssetCapacity`
- **Response**: 204 No Content

### GET /api/v1/capacity/assets/:id/utilization
- **Params**: id (asset UUID)
- **Controller**: `getCapacityUtilization`
- **Response**: Capacity utilization summary (percentage used, etc.)

---

## 28. Project Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/projects
- **Query**: `projectFilterSchema`
- **Controller**: `listProjects`
- **Response**: Paginated list of projects

### POST /api/v1/projects
- **Schema**: `createProjectSchema`
- **Body Fields**: name, description, status, owner_id (optional)
- **Controller**: `createProject`
- **Response**: Created project

### GET /api/v1/projects/:id
- **Params**: id (UUID)
- **Controller**: `getProject`
- **Response**: Single project with details

### PUT /api/v1/projects/:id
- **Params**: id (UUID)
- **Schema**: `updateProjectSchema`
- **Controller**: `updateProject`
- **Response**: Updated project

### DELETE /api/v1/projects/:id
- **Params**: id (UUID)
- **Controller**: `deleteProject`
- **Response**: 204 No Content

### GET /api/v1/projects/:id/assets
- **Params**: id (project UUID)
- **Controller**: `listProjectAssets`
- **Response**: List of assets linked to project

### POST /api/v1/projects/:id/assets
- **Params**: id (project UUID)
- **Schema**: `addProjectAssetSchema`
- **Body Fields**: asset_id
- **Controller**: `addProjectAsset`
- **Response**: Created project-asset link

### DELETE /api/v1/projects/:id/assets/:assetId
- **Params**: id (project UUID), assetId (asset UUID)
- **Controller**: `removeProjectAsset`
- **Response**: 204 No Content

### GET /api/v1/projects/:id/tickets
- **Params**: id (project UUID)
- **Controller**: `listProjectTickets`
- **Response**: List of tickets for assets in project

---

## 29. Service Profile Routes

All routes require `requireAuth` + `tenantMiddleware`.

### GET /api/v1/service-profiles
- **Controller**: `listServiceProfiles`
- **Response**: List of service profiles

### POST /api/v1/service-profiles
- **Schema**: `createServiceProfileSchema`
- **Body Fields**: name, description, service_tier, sla_definition_id (optional)
- **Controller**: `createServiceProfile`
- **Response**: Created service profile

### GET /api/v1/service-profiles/:id
- **Params**: id (UUID)
- **Controller**: `getServiceProfile`
- **Response**: Single service profile

### PUT /api/v1/service-profiles/:id
- **Params**: id (UUID)
- **Schema**: `updateServiceProfileSchema`
- **Controller**: `updateServiceProfile`
- **Response**: Updated service profile

### DELETE /api/v1/service-profiles/:id
- **Params**: id (UUID)
- **Controller**: `deleteServiceProfile`
- **Response**: 204 No Content

### GET /api/v1/service-profiles/entitlements
- **Controller**: `listServiceEntitlements`
- **Response**: List of service entitlements

### POST /api/v1/service-profiles/entitlements
- **Schema**: `createServiceEntitlementSchema`
- **Body Fields**: service_profile_id, customer_id, entitlement_level, effective_from, effective_until (optional)
- **Controller**: `createServiceEntitlement`
- **Response**: Created entitlement

### DELETE /api/v1/service-profiles/entitlements/:id
- **Params**: id (entitlement UUID)
- **Controller**: `deleteServiceEntitlement`
- **Response**: 204 No Content

---

## Route Registration Order

The main router (in `packages/backend/src/routes/index.ts`) mounts routes in this order:

1. **Public routes** (no auth):
   - System (/api/v1/system)
   - Auth login/logout (/api/v1/auth/login, /api/v1/auth/logout)
   - Feedback (/api/v1/feedback)

2. **Protected routes** (requireAuth + tenantMiddleware):
   - Tenants (/api/v1/tenants) — super-admin
   - Users (/api/v1/users)
   - Groups (/api/v1/groups)
   - Tickets (/api/v1/tickets)
   - Customers (/api/v1/customers)
   - Assets (/api/v1/assets, /api/v1/asset-types, /api/v1/relation-types, /api/v1/classifications, /api/v1/capacity, /api/v1/projects, /api/v1/service-profiles)
   - Workflows (/api/v1/workflows)
   - Services (/api/v1/services)
   - Compliance (/api/v1/compliance)
   - Knowledge Base (/api/v1/kb/articles)
   - Email (/api/v1/email)
   - Settings (/api/v1/settings)
   - License (/api/v1/license)
   - SLA (/api/v1/sla)
   - Known Errors (/api/v1/known-errors)
   - Notifications (/api/v1/notifications)
   - Escalation (/api/v1/escalation)
   - Audit (/api/v1/audit)
   - Monitoring sources & events (/api/v1/monitoring)

3. **Portal routes** (separate auth):
   - Portal (/api/v1/portal) — portal user JWT

4. **Public webhooks** (webhook signature validation):
   - Monitoring webhook (/api/v1/monitoring/events/webhook/:sourceId)

---

## Testing Notes

- All protected routes enforce `requireAuth` middleware to validate JWT
- All tenant-scoped routes enforce `tenantMiddleware` to bind tenant_id from JWT
- Some routes enforce additional role-based checks via `requireRole('admin', 'manager', 'agent', 'viewer')`
- License enforcement via `checkUserLimit` middleware on user creation
- Query parameters use Zod validation via `validateQuery()`
- Path parameters use Zod validation via `validateParams()`
- Request bodies use Zod validation via `validate()`
- Error responses are standardized via centralized error handler
- Successful responses use `sendSuccess()` and `sendPaginated()` helpers
- Paginated responses include `meta` object with `total`, `page`, `limit`

This inventory is suitable for building comprehensive E2E tests covering all API endpoints, parameter variations, auth requirements, and response schemas.
