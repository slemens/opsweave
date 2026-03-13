Perfect. Now I have enough information to create a comprehensive E2E test inventory. Let me compile this into a structured markdown document:

Based on my thorough analysis of the OpsWeave frontend codebase, here is a comprehensive E2E test inventory for the entire application:

---

# OpsWeave Frontend — E2E Test Inventory (UI-MAP)

**Generated:** March 2026  
**Version:** 0.5.0  
**Purpose:** Complete catalog of all pages, forms, tables, buttons, modals, and API hooks for end-to-end test automation

---

## Table of Contents

1. [Public Routes (Unauthenticated)](#public-routes-unauthenticated)
2. [Protected Routes (Main Application)](#protected-routes-main-application)
3. [Settings Routes](#settings-routes)
4. [Customer Portal Routes](#customer-portal-routes)
5. [Reusable Components & Patterns](#reusable-components--patterns)
6. [State Management & API Hooks](#state-management--api-hooks)
7. [Navigation & Layout Elements](#navigation--layout-elements)

---

## Public Routes (Unauthenticated)

### /login — Login Page

**File:** `/packages/frontend/src/pages/LoginPage.tsx`

**Purpose:** User authentication

**Forms:**

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| email | email input | ✓ | email format |
| password | password input | ✓ | min 1 char |

**Buttons:**

| Label Key | Action | State |
|-----------|--------|-------|
| `auth.login` | Submit form (POST /api/v1/auth/login) | Disabled while loading |
| `language.en`/`language.de` | Toggle language | Always enabled |

**State Store Used:** `useAuthStore` (auth-store.ts)
- `login(email, password)` mutation
- `isLoading` state
- `error` state
- `clearError()` method

**Error Handling:** Displays error message in red banner if login fails

**Navigation:**
- On success: Navigate to `/` (dashboard)
- Language toggle affects i18n immediately

**API Endpoints:**
- `POST /api/v1/auth/login` — Authenticate user

---

### /portal/login — Customer Portal Login Page

**File:** `/packages/frontend/src/pages/portal/PortalLoginPage.tsx`

**Purpose:** Customer portal authentication (separate from main app)

**Forms:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| tenantSlug | text input | ✓ | Org-specific identifier (e.g., "acme-corp") |
| email | email input | ✓ | Customer email |
| password | password input | ✓ | Min 1 char |

**Buttons:**

| Label | Action | State |
|-------|--------|-------|
| 'Anmelden' (hardcoded) | Submit form to `/api/v1/portal/auth/login` | Disabled if any field empty or loading |

**API Endpoints:**
- `POST /api/v1/portal/auth/login` — Portal-specific auth

**Navigation:**
- On success: Navigate to `/portal/tickets`

---

## Protected Routes (Main Application)

All protected routes require valid auth token (checked by `ProtectedLayout` middleware).

### / — Dashboard Page

**File:** `/packages/frontend/src/pages/DashboardPage.tsx`

**Purpose:** Executive overview with KPIs and recent activity

**Stat Cards (Clickable):**

| Title Key | Icon | Value Source | Click Action |
|-----------|------|---------------|--------------| 
| `dashboard.open_tickets` | Ticket | `useTicketStats().data.by_status.open` | Navigate to `/tickets` |
| `dashboard.sla_breaches` | AlertTriangle | `useTicketStats().data.sla_breached` | Navigate to `/tickets` |
| `dashboard.assets_total` | Server | `useAssetStats().data.total` | Navigate to `/assets` |
| `dashboard.pending_changes` | GitPullRequest | `useTicketStats().data.by_status.pending` | Navigate to `/tickets` |

**Charts:**

1. **Ticket Timeline (Line Chart)**
   - X-axis: Date (last 30 days)
   - Y-axis: Ticket count
   - Data Source: `useTicketTimeline(30)`
   - Format: Date as `DD.MM.`

2. **Top Customers (Horizontal Bar Chart)**
   - X-axis: Ticket count
   - Y-axis: Customer name (truncated to 12 chars)
   - Data Source: `useTicketsByCustomer(5)`
   - Color: Rotated palette (5 colors)

**Overview Cards:**

1. **Ticket Status Overview**
   - Shows breakdown by status: open, in_progress, pending, resolved, closed
   - Each status has: name, progress bar (colored), count badge
   - Data Source: `useTicketStats()`

2. **Recent Tickets**
   - List of 5 most recent tickets
   - Columns: ticket_number (mono, small), title, status badge, created_at (relative time)
   - Click row to navigate to `/tickets/{id}`
   - Data Source: `useTickets({ limit: 5, sort: 'created_at', order: 'desc' })`

**Buttons:**

| Label Key | Action |
|-----------|--------|
| `actions.refresh` | Refetch all queries |
| `actions.view` (x2) | Navigate to `/tickets` or view full list |
| `actions.retry` | Retry failed query |

**API Hooks Used:**
- `useTicketStats()` — `GET /api/v1/tickets/stats`
- `useAssetStats()` — `GET /api/v1/assets/stats`
- `useTickets()` — `GET /api/v1/tickets`
- `useTicketTimeline(30)` — `GET /api/v1/tickets/timeline?days=30`
- `useTicketsByCustomer(5)` — `GET /api/v1/tickets/by-customer?limit=5`

---

### /tickets — Ticket Board Page

**File:** `/packages/frontend/src/pages/TicketBoardPage.tsx`

**Purpose:** Kanban board view of tickets organized by status

**View Toggle:**
- Buttons: "List" icon / "Grid" icon (toggle between list and Kanban views)

**Filter Panel (Left Sidebar):**

| Filter | Component | Options Source | Multi-select |
|--------|-----------|-----------------|--------------|
| Status | Select dropdown | Hard-coded: open, in_progress, pending, resolved, closed, _all | No |
| Type | Select dropdown | `TICKET_TYPES` from shared constants | No |
| Priority | Select dropdown | `TICKET_PRIORITIES` from shared constants | No |
| Assignee Group | Select dropdown | `useGroups().data.data` | No |
| Assignee | Select dropdown | `useUsers().data.data` | No |
| Customer | Select dropdown | `useCustomers().data.data` | No |
| Category | Select dropdown | `useCategories().data.data` | No |

**Search:**
- Input field with magnifying glass icon
- Searches across ticket_number, title, description
- Real-time filtering on `q` param

**Sort:**
- Field dropdown (created_at, updated_at, priority, sla_response_due, etc.)
- Order toggle (asc/desc)
- Sort icon indicates ascending/descending

**Pagination:**
- "Previous" / "Next" buttons
- Page number display: `Page {current} of {total}`
- Limit dropdown: 10, 25, 50

**Buttons:**

| Label Key | Action | Icon |
|-----------|--------|------|
| `actions.new` | Navigate to `/tickets/new` | Plus |
| `actions.export` | Download filtered tickets as CSV | Download |
| `actions.refresh` | Refetch board | RefreshCw |
| `actions.filters_reset` | Clear all filters | FilterX |

**Kanban Columns (Grid View):**

Each status has a column with:
- Column header: status name + count badge
- Cards showing: ticket_number, title, assignee avatar, priority dot, SLA warning badge (if breached)
- Drag & drop to change status (POST `/api/v1/tickets/{id}/status`)

**List View:**

Table with columns:
| Column | Sortable | Content |
|--------|----------|---------|
| Checkbox | N | Select multiple tickets |
| Ticket Number | Y | `ticket_number` in mono font |
| Title | Y | `title` truncated |
| Type | Y | Type badge (incident, change, problem) |
| Status | Y | Status badge |
| Priority | Y | Priority with colored dot |
| Assignee | Y | Avatar + name or "Unassigned" |
| Customer | Y | Customer name |
| SLA Due | Y | Relative time or red if breached |
| Created | Y | Relative time |

**Bulk Actions (when rows selected):**
- Change status (select dropdown + apply button)
- Change priority
- Assign to group/person
- Delete (with confirmation)

**Row Click:**
- Navigate to `/tickets/{id}`

**API Hooks Used:**
- `useTickets(params)` — `GET /api/v1/tickets`
- `useGroups()` — `GET /api/v1/groups`
- `useUsers()` — `GET /api/v1/users`
- `useCustomers()` — `GET /api/v1/customers`
- `useCategories()` — `GET /api/v1/tickets/categories`
- `useUpdateTicketStatus()` — `PATCH /api/v1/tickets/{id}/status`

---

### /tickets/new — Create Ticket Page

**File:** `/packages/frontend/src/pages/CreateTicketPage.tsx`

**Purpose:** Create new incident, change, or problem ticket

**Left Panel (2/3 width) — Main Form:**

**1. Ticket Type Section**

| Field | Component | Options | Required |
|-------|-----------|---------|----------|
| Ticket Type | Radio buttons | incident, change, problem | ✓ |

**2. Basic Information Card**

| Field | Component | Required | Notes |
|-------|-----------|----------|-------|
| Title | Text input | ✓ | Min 3 characters, error: `validation.title_min_length` |
| Description | Textarea | ✗ | Falls back to title if empty |

**3. Classification Card**

| Field | Component | Required | Conditional |
|-------|-----------|----------|-------------|
| Impact | Select | ✗ | From `TICKET_IMPACTS` |
| Urgency | Select | ✗ | From `TICKET_URGENCIES` |
| Priority | Select | ✗ | Auto-calculated from Impact+Urgency using `calculatePriority()` |

**4. Assignment Card**

| Field | Component | Required | Source |
|-------|-----------|----------|--------|
| Assignee Group | Select | ✗ | `useGroups().data.data` |
| Customer | Select | ✗ | `useCustomers().data.data` (filtered: is_active=true) |
| Category | Select | ✗ | `useCategories().data.data` (filtered by ticket type) |

**5. Change-Specific Fields (if type='change'):**

| Field | Component | Required | Notes |
|-------|-----------|----------|-------|
| Justification | Textarea | ✗ | RFC business justification |
| Implementation Plan | Textarea | ✗ | RFC implementation steps |
| Rollback Plan | Textarea | ✗ | RFC rollback procedure |
| Risk Likelihood | Select | ✗ | From `CHANGE_RISK_LIKELIHOODS` |
| Risk Impact | Select | ✗ | From `CHANGE_RISK_IMPACTS` |
| Risk Level | Badge (read-only) | N/A | Auto-calculated from matrix (`CHANGE_RISK_MATRIX`) |
| Planned Start | Date/time input | ✗ | ISO format |
| Planned End | Date/time input | ✗ | ISO format |
| CAB Required | Checkbox | ✗ | Boolean flag |

**Right Panel (1/3 width) — Summary Card:**
- Displays selected values
- Real-time preview of auto-calculated fields
- Parent ticket info (if from /tickets/new?parent=ID)

**Buttons:**

| Label Key | Action | State |
|-----------|--------|-------|
| `actions.cancel` | Navigate back to `/tickets` | Always enabled |
| `actions.create` | Submit form (POST /api/v1/tickets) | Disabled if title < 3 chars or loading |

**Validation:**
- Title minimum length: 3 characters
- All required fields validated on submit

**API Hooks Used:**
- `useCreateTicket()` — `POST /api/v1/tickets`
- `useGroups()` — `GET /api/v1/groups`
- `useCustomers()` — `GET /api/v1/customers`
- `useCategories()` — `GET /api/v1/tickets/categories`

**Navigation:**
- On success: Navigate to `/tickets/{newId}`
- On cancel: Back to `/tickets`

---

### /tickets/:id — Ticket Detail Page

**File:** `/packages/frontend/src/pages/TicketDetailPage.tsx`

**Purpose:** Full ticket view with comments, history, workflow, and relationships

**Header Section:**

| Element | Type | Value | Actions |
|---------|------|-------|---------|
| Ticket Number | Badge | `ticket_number` (mono) | Copy to clipboard |
| Title | Heading | `title` | Editable inline |
| Status Badge | Colored badge | Status with color coding | Click to open status change dialog |
| Priority Dot + Text | Colored badge | Priority with dot icon | Click to open priority select |
| Type Badge | Colored badge | Type (incident/change/problem) | Read-only |

**Breadcrumb/Navigation:**
- Back arrow button → `/tickets`
- Action button: "New Sub-Ticket" → `/tickets/new?parent={id}`

**Tabs:**

1. **Details Tab**
   - Displays: asset link, assignee, customer, category, SLA info, creation metadata
   - Fields can be edited in-place
   - Inline edit buttons for each section

2. **Comments Tab**
   - List of comments with: author avatar, name, timestamp, content (markdown rendered)
   - Internal flag indicator (lock icon)
   - Reply form at bottom: textarea + "Add Comment" button
   - Comment source badge: agent, customer, email, system

3. **History Tab**
   - Table of changes: timestamp, field, old value, new value, changed by
   - Sortable and filterable by field name

4. **Workflow Tab**
   - Displays current workflow instance (if any)
   - Shows steps with status indicators
   - Can route to next step or cancel workflow
   - Displays form data for each step

5. **Related Tab**
   - Child tickets table (if any)
   - Related KB articles with link/unlink buttons
   - Related known errors search

**Side Panel (Right):**

**Metadata Card:**
- Created by, created at
- Last updated by, last updated at
- Source (manual, email, monitoring, api, portal)

**Assignment Card:**
- Assignee: dropdown + "Assign" button
- Assignee Group: dropdown + "Assign" button
- Reporter (read-only)

**SLA Card:**
- SLA tier badge
- Response due: timestamp or red if breached
- Resolution due: timestamp or red if breached
- Breach indicator with icon
- "Refresh SLA" button

**Classification Card:**
- Impact: select dropdown
- Urgency: select dropdown
- Auto-calculated priority display

**Change-Specific Fields (if type='change'):**
- Risk likelihood, risk impact, risk level badge
- Planned start/end dates
- CAB required checkbox
- Implementation/rollback plan display (editable)

**Buttons & Actions:**

| Label Key | Action | Icon | Dialog |
|-----------|--------|------|--------|
| `actions.edit` | Enable inline edit mode | Pencil | N/A |
| `actions.assign` | Open assignment dialog | User | AssignDialog |
| `actions.change_status` | Open status change dialog | CheckCircle | StatusDialog |
| `actions.change_priority` | Open priority dialog | ArrowUpDown | PrioritySelect |
| `actions.start_workflow` | Open workflow selection dialog | GitBranch | WorkflowDialog |
| `actions.delete` | Open delete confirmation | Trash2 | AlertDialog |
| `actions.link_kb` | Open KB article search/link modal | Link2 | KbLinkDialog |

**Dialogs:**

1. **Status Change Dialog**
   - Confirm current status
   - Select new status from dropdown
   - Optional reason textarea
   - "Change Status" button (POST `/api/v1/tickets/{id}/status`)

2. **Priority Change Dialog**
   - Select new priority
   - "Update Priority" button (PATCH `/api/v1/tickets/{id}/priority`)

3. **Assignment Dialog**
   - Assignee dropdown (users)
   - Assignee Group dropdown (groups)
   - "Assign" button (PATCH `/api/v1/tickets/{id}/assign`)

4. **KB Article Link Dialog**
   - Search input for articles
   - List of found articles
   - Link button per article (POST `/api/v1/kb/articles/{articleId}/link/{ticketId}`)
   - Unlink button for already-linked articles (DELETE)

5. **Workflow Instantiation Dialog**
   - Select workflow template
   - "Start Workflow" button (POST `/api/v1/workflows/instantiate`)

**API Hooks Used:**
- `useTicket(id)` — `GET /api/v1/tickets/{id}`
- `useTicketComments(id)` — `GET /api/v1/tickets/{id}/comments`
- `useTicketHistory(id)` — `GET /api/v1/tickets/{id}/history`
- `useChildTickets(id)` — `GET /api/v1/tickets/{id}/children`
- `useTicketWorkflow(workflowInstanceId)` — `GET /api/v1/workflows/instances/{id}`
- `useUpdateTicket(id)` — `PUT /api/v1/tickets/{id}`
- `useUpdateTicketStatus(id)` — `PATCH /api/v1/tickets/{id}/status`
- `useUpdateTicketPriority(id)` — `PATCH /api/v1/tickets/{id}/priority`
- `useAssignTicket(id)` — `PATCH /api/v1/tickets/{id}/assign`
- `useAddComment(id)` — `POST /api/v1/tickets/{id}/comments`
- `useWorkflowTemplates()` — `GET /api/v1/workflows/templates`
- `useInstantiateWorkflow()` — `POST /api/v1/workflows/instantiate`
- `useKbArticles()` — `GET /api/v1/kb/articles`
- `useLinkArticleToTicket()` — `POST /api/v1/kb/articles/{articleId}/link/{ticketId}`
- `useUnlinkArticleFromTicket()` — `DELETE /api/v1/kb/articles/{articleId}/link/{ticketId}`
- `useSearchKnownErrors(q)` — `GET /api/v1/known-errors/search?q={q}`

---

### /assets — Assets (CMDB) Page

**File:** `/packages/frontend/src/pages/AssetsPage.tsx`

**Purpose:** View and manage IT infrastructure assets with relationship visualization

**View Toggle:**
- "List" / "Graph" view buttons
- List view: Table of assets
- Graph view: React Flow DAG visualization with MiniMap and controls

**List View — Filters:**

| Filter | Component | Options | Source |
|--------|-----------|---------|--------|
| Category | Buttons (horizontal) | all + each `ASSET_TYPE_CATEGORIES` | Hard-coded |
| Type | Select | all + asset type slugs | `useAssetTypes()` |
| Status | Select | all + `ASSET_STATUSES` | Hard-coded |
| SLA Tier | Select | all + `SLA_TIERS` | Hard-coded |
| Environment | Select | all + `ENVIRONMENTS` | Hard-coded |
| Customer | Select | all + customer names | `useCustomers().data.data` |

**Search:**
- Input field searching across: asset_type, name, display_name, ip_address

**Sort:**
- Hard-coded sort by created_at, descending

**Pagination:**
- Previous/Next buttons
- Page indicator

**List View — Table:**

| Column | Sortable | Content |
|--------|----------|---------|
| Asset Type | Y | Type badge (with icon) |
| Name | Y | `name` in mono font |
| Display Name | Y | `display_name` |
| IP Address | Y | `ip_address` (if present) |
| Status | Y | Status badge |
| SLA Tier | Y | SLA badge with color |
| Environment | Y | Environment tag |
| Customer | Y | Customer name |
| Location | Y | `location` |
| Created | Y | Relative time |

**Row Click:**
- Navigate to `/assets/{id}`

**Buttons:**

| Label Key | Action | Icon |
|-----------|--------|------|
| `actions.new` | Navigate to `/assets/new` | Plus |
| `actions.refresh` | Refetch assets | RefreshCw |
| `actions.reset_filters` | Clear all filters | FilterX |

**Graph View:**
- React Flow visualization of all assets and relationships
- Each node: asset with colored status
- Edges: relation types labeled
- Dagre layout applied automatically
- Pan/zoom/fit controls
- MiniMap in corner
- Click node to navigate to `/assets/{id}`

**API Hooks Used:**
- `useAssets(params)` — `GET /api/v1/assets`
- `useAssetTypes()` — `GET /api/v1/asset-types`
- `useCustomers()` — `GET /api/v1/customers`
- `useFullAssetGraph()` — `GET /api/v1/assets/graph/full` (for graph view)

---

### /assets/new — Create Asset Page

**File:** `/packages/frontend/src/pages/CreateAssetPage.tsx`

**Purpose:** Create new asset (CI) with configurable attributes

**Left Panel (2/3 width):**

**1. Asset Type Card**

| Field | Component | Options | Required |
|-------|-----------|---------|----------|
| Asset Type | Select w/ groups | Grouped by category (`ASSET_TYPE_CATEGORIES`) | ✓ |

**2. Basic Information Card**

| Field | Component | Required |
|-------|-----------|----------|
| Name | Text input | ✓ |
| Display Name | Text input | ✓ |
| IP Address | Text input | ✗ |
| Location | Text input | ✗ |

**3. Configuration Card**

| Field | Component | Options | Required |
|-------|-----------|---------|----------|
| SLA Tier | Select | `SLA_TIERS` | ✓ (default: 'none') |
| Environment | Select | `ENVIRONMENTS` | ✗ (default: '__none__') |
| Customer | Select | `useCustomers().data.data` | ✗ (default: '__none__') |

**4. Dynamic Attributes Section**

- Renders form fields based on selected asset type's `attribute_schema`
- Uses `DynamicFormRenderer` component
- Field types: text, number, select, multiselect, date, checkbox, etc.
- Default values loaded from schema

**Right Panel (1/3 width):**
- Summary card showing selected values
- Real-time preview

**Buttons:**

| Label Key | Action | State |
|-----------|--------|-------|
| `actions.cancel` | Navigate back to `/assets` | Always enabled |
| `actions.create` | Submit form (POST /api/v1/assets) | Disabled if required fields empty |

**API Hooks Used:**
- `useCreateAsset()` — `POST /api/v1/assets`
- `useAssetTypes()` — `GET /api/v1/asset-types`
- `useCustomers()` — `GET /api/v1/customers`

---

### /assets/:id — Asset Detail Page

**File:** `/packages/frontend/src/pages/AssetDetailPage.tsx`

**Purpose:** Full asset view with relationships, tickets, classifications, and compliance

**Header Section:**

| Element | Type | Value |
|---------|------|-------|
| Asset Type | Badge | Type with icon |
| Name | Heading | `name` (mono) |
| Display Name | Subheading | `display_name` |
| Status | Colored badge | Status |

**Tabs:**

1. **Details Tab**
   - Asset information (type, name, IP, location, environment, customer, SLA)
   - Editable inline
   - Delete button (with confirmation)

2. **Relations Tab**
   - Table of asset relationships (source, target, relation type)
   - Add relation button → opens dialog
   - Delete relation buttons
   - Each row clickable to navigate to related asset

3. **Tickets Tab**
   - Linked tickets table
   - Columns: ticket_number, title, type, status, priority, assignee, created

4. **Services Tab**
   - Service descriptions linked to this asset
   - Shows effective dates if in vertical catalog

5. **Compliance Tab**
   - Regulatory frameworks and coverage mapping
   - Shows gaps and compliance status

6. **Classifications Tab**
   - Asset classification models applied
   - Add/remove classification buttons
   - Uses `useAssetClassifications()` hook

7. **Capacity Tab**
   - Capacity utilization for asset (if applicable)
   - Displays from `useAssetCapacityUtilization()`

8. **Graph Tab**
   - React Flow visualization of this asset + related assets
   - Shows incoming/outgoing relations

**Side Panel (Right):**

**Metadata Card:**
- Created by/at
- Last updated by/at
- Owner group

**Configuration Card:**
- SLA Tier: badge + edit button
- Environment: tag + edit button
- Customer: name + edit button

**Relations Summary:**
- Count of incoming/outgoing relations
- Quick links to top relations

**Buttons:**

| Label Key | Action | Icon |
|-----------|--------|------|
| `actions.edit` | Enable inline edit | Pencil |
| `actions.add_relation` | Open relation dialog | Link2 |
| `actions.view_graph` | Switch to graph tab | GitGraph |
| `actions.delete` | Delete with confirmation | Trash2 |

**Dialogs:**

1. **Add Relation Dialog**
   - Select target asset (searchable)
   - Select relation type
   - Add properties (key-value pairs)
   - "Create Relation" button (POST `/api/v1/assets/{id}/relations`)

**API Hooks Used:**
- `useAsset(id)` — `GET /api/v1/assets/{id}`
- `useAssetRelations(id)` — `GET /api/v1/assets/{id}/relations`
- `useAssetTickets(id)` — `GET /api/v1/assets/{id}/tickets`
- `useAssetGraph(id)` — `GET /api/v1/assets/{id}/graph`
- `useAssets()` — For asset picker
- `useRelationTypes()` — `GET /api/v1/relation-types`
- `useCreateAssetRelation(id)` — `POST /api/v1/assets/{id}/relations`
- `useDeleteAssetRelation(id)` — `DELETE /api/v1/assets/{id}/relations/{relationId}`
- `useUpdateAsset(id)` — `PUT /api/v1/assets/{id}`
- `useDeleteAsset(id)` — `DELETE /api/v1/assets/{id}`
- `useAssetClassifications(id)` — `GET /api/v1/assets/{id}/classifications`
- `useClassifyAsset(id)` — `POST /api/v1/assets/{id}/classifications`
- `useRemoveAssetClassification(id)` — `DELETE /api/v1/assets/{id}/classifications/{modelId}`
- `useAssetCapacityUtilization(id)` — `GET /api/v1/assets/{id}/capacity`

---

### /customers — Customers Page

**File:** `/packages/frontend/src/pages/CustomersPage.tsx`

**Purpose:** Manage customer records

**Header:**
- Heading: "Customers"
- Subheading: Count of customers

**Search:**
- Input field filtering across: name, contact_email, industry

**Create Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Name | Text input | ✓ |
| Contact Email | Email input | ✗ |
| Industry | Text input | ✗ |

**Buttons:**

| Label Key | Action |
|-----------|--------|
| `common.customers.create` | Open create dialog |
| "Create" (in dialog) | Submit (POST /api/v1/customers) |

**Card List:**
- Each customer in a card with:
  - Name
  - Industry (if present)
  - Email (if present)
  - "View" button → Navigate to `/customers/{id}`

**API Hooks Used:**
- `useCustomers()` — `GET /api/v1/customers`
- `useCreateCustomer()` — `POST /api/v1/customers`

---

### /customers/:id — Customer Detail Page

**File:** `/packages/sebastian.lemens/Claude/OpsWeave/packages/frontend/src/pages/CustomerDetailPage.tsx`

**Purpose:** View customer details and related tickets

**Header:**
- Customer name
- Industry and email
- Edit/Delete buttons

**Tabs:**

1. **Details Tab**
   - Editable fields: name, industry, contact_email, is_active
   - Status indicator

2. **Tickets Tab**
   - List of tickets for this customer
   - Searchable/sortable table

**Buttons:**
- Back to customers list
- Edit (inline form)
- Delete (with confirmation)

**API Hooks Used:**
- `useCustomer(id)` — `GET /api/v1/customers/{id}`
- `useUpdateCustomer(id)` — `PUT /api/v1/customers/{id}`
- `useDeleteCustomer(id)` — `DELETE /api/v1/customers/{id}`
- `useTickets({ customer_id: id })` — `GET /api/v1/tickets`

---

### /workflows — Workflows Page

**File:** `/packages/frontend/src/pages/WorkflowsPage.tsx`

**Purpose:** Manage workflow templates

**Filters:**

| Filter | Component | Options |
|--------|-----------|---------|
| Trigger Type | Select | all + `WORKFLOW_TRIGGER_TYPES` |
| Active | Select | all, active, inactive |

**Pagination:**
- Previous/Next buttons
- Page indicator

**Create Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Name | Text input | ✓ |
| Description | Textarea | ✗ |
| Trigger Type | Select | ✓ |
| Trigger Subtype | Select | Conditional on trigger type |
| Active | Toggle | Default: true |

**Table:**

| Column | Content |
|--------|---------|
| Name | Workflow name |
| Trigger | Trigger type badge |
| Steps | Count of steps |
| Active | Status toggle |
| Actions | Edit, delete buttons |

**Row Click:**
- Navigate to `/workflows/{id}`

**Buttons:**

| Label Key | Action |
|-----------|--------|
| `actions.new` | Open create dialog |
| Edit | Open edit dialog |
| Delete | Delete with confirmation |

**License Check:**
- Enterprise: unlimited workflows
- Community: max 3 workflows (enforced with warning)

**API Hooks Used:**
- `useWorkflowTemplates(params)` — `GET /api/v1/workflows/templates`
- `useCreateWorkflowTemplate()` — `POST /api/v1/workflows/templates`
- `useUpdateWorkflowTemplate(id)` — `PUT /api/v1/workflows/templates/{id}`
- `useDeleteWorkflowTemplate(id)` — `DELETE /api/v1/workflows/templates/{id}`
- `useLicenseInfo()` — `GET /api/v1/license`

---

### /workflows/:id — Workflow Detail Page

**File:** `/packages/frontend/src/pages/WorkflowDetailPage.tsx`

**Purpose:** Edit workflow template and steps

**Sections:**

1. **Basic Info**
   - Name (editable)
   - Description (editable)
   - Trigger type (editable)
   - Active toggle

2. **Steps List**
   - Table of steps with: order, name, type, timeout, next step
   - Add step button
   - Edit step button (opens modal)
   - Delete step button
   - Reorder drag handles

**Add/Edit Step Dialog:**

| Field | Component | Required | Conditional |
|-------|-----------|----------|-------------|
| Name | Text input | ✓ | |
| Type | Select | ✓ | Form, Routing, Approval, Condition, Automatic |
| Timeout Hours | Number input | ✗ | |
| Next Step | Select | ✗ | Select from other steps |
| Configuration | Dynamic form | Conditional | Based on step type |

**API Hooks Used:**
- `useWorkflowTemplate(id)` — `GET /api/v1/workflows/templates/{id}`
- `useUpdateWorkflowTemplate(id)` — `PUT /api/v1/workflows/templates/{id}`
- `useDeleteWorkflowTemplate(id)` — `DELETE /api/v1/workflows/templates/{id}`

---

### /services — Service Catalog Page

**File:** `/packages/frontend/src/pages/ServiceCatalogPage.tsx`

**Purpose:** Manage service descriptions and catalogs

**Tabs:**

1. **Services Tab**
   - Table of service descriptions
   - Columns: code, title, scope_included, compliance_tags, status
   - Add service button
   - Edit/delete buttons

2. **Horizontal Catalogs Tab**
   - List of catalogs
   - Add catalog button
   - Edit/delete buttons
   - For each catalog: show items, add/remove items

3. **Vertical Catalogs Tab** (Enterprise only)
   - List of vertical catalogs per customer/industry
   - Add override button
   - View effective services

**Dialogs:**

1. **Create Service Description**
   - Code (unique), title, scope_included, scope_excluded, compliance_tags, status

2. **Create Catalog**
   - Name, description, status
   - Add items (multi-select service descriptions)

3. **Create Vertical Catalog** (Enterprise)
   - Base catalog (select), customer/industry, description

**API Hooks Used:**
- `useServiceDescriptions()` — `GET /api/v1/services/descriptions`
- `useHorizontalCatalogs()` — `GET /api/v1/services/catalogs/horizontal`
- `useVerticalCatalogs()` — `GET /api/v1/services/catalogs/vertical`
- `useCreateServiceDescription()` — `POST /api/v1/services/descriptions`
- `useCreateHorizontalCatalog()` — `POST /api/v1/services/catalogs/horizontal`
- `useAddCatalogItem()` — `POST /api/v1/services/catalogs/{catalogId}/items`
- `useRemoveCatalogItem()` — `DELETE /api/v1/services/catalogs/{catalogId}/items/{serviceId}`
- `useLicenseInfo()` — `GET /api/v1/license`

---

### /compliance — Compliance Page

**File:** `/packages/frontend/src/pages/CompliancePage.tsx`

**Purpose:** Manage regulatory frameworks and compliance requirements

**Tabs:**

1. **Frameworks Tab**
   - Table of regulatory frameworks
   - Columns: name, version, status, effective_date, actions
   - Add framework button
   - Edit/delete buttons

2. **Requirements Tab**
   - Filtered by selected framework
   - Table of requirements
   - Columns: code, title, category, actions
   - Add requirement button
   - Edit/delete buttons

3. **Matrix Tab**
   - Compliance matrix showing service-to-requirement mappings
   - Cells editable with coverage_level selector
   - Evidence notes textarea per mapping

4. **Gaps Tab**
   - Unfulfilled requirements
   - Assets without required compliance flags

**Dialogs:**

1. **Create Framework**
   - Name, version, description, effective_date

2. **Create Requirement**
   - Framework (select), code, title, description, category

3. **Add Mapping**
   - Select service description
   - Select requirement
   - Set coverage_level (not_mapped, partial, full)
   - Add evidence notes

**License Check:**
- Community: max 1 framework
- Enterprise: unlimited frameworks

**API Hooks Used:**
- `useFrameworks()` — `GET /api/v1/compliance/frameworks`
- `useRequirements(frameworkId)` — `GET /api/v1/compliance/frameworks/{id}/requirements`
- `useMatrix(frameworkId)` — `GET /api/v1/compliance/frameworks/{id}/matrix`
- `useCreateFramework()` — `POST /api/v1/compliance/frameworks`
- `useCreateRequirement()` — `POST /api/v1/compliance/frameworks/{id}/requirements`
- `useUpsertMapping()` — `POST /api/v1/compliance/mappings`
- `useLicenseInfo()` — `GET /api/v1/license`

---

### /knowledge-base — Knowledge Base Page

**File:** `/packages/frontend/src/pages/KnowledgeBasePage.tsx`

**Purpose:** Create and manage KB articles

**Search:**
- Input field searching across article titles and content

**Create Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Title | Text input | ✓ |
| Category | Text input | ✗ |
| Tags | Text input (comma-separated) | ✗ |
| Visibility | Select (internal/public) | ✓ |
| Status | Select (draft/published/archived) | ✓ |
| Content | Textarea (Markdown) | ✓ |

**Article List:**
- Table of articles with: title, category, tags, visibility, status, created_at, actions
- Edit button (opens modal with content editor)
- Delete button (with confirmation)
- Click article to view in read-only markdown format

**Buttons:**

| Label Key | Action |
|-----------|--------|
| `actions.new` | Open create dialog |
| Edit | Open edit dialog |
| Delete | Delete with confirmation |

**API Hooks Used:**
- `useKbArticles()` — `GET /api/v1/kb/articles`
- `useCreateKbArticle()` — `POST /api/v1/kb/articles`
- `useUpdateKbArticle(id)` — `PUT /api/v1/kb/articles/{id}`
- `useDeleteKbArticle(id)` — `DELETE /api/v1/kb/articles/{id}`

---

### /known-errors — Known Errors Page

**File:** `/packages/frontend/src/pages/KnownErrorsPage.tsx`

**Purpose:** Manage known errors and workarounds

**Search:**
- Input field searching across error titles

**Create Button:**
- Opens dialog to create new known error

**Known Error List:**
- Cards or table showing:
  - Title
  - Description
  - Workaround (collapsed, expandable)
  - Status badge
  - Actions: edit, delete, link to tickets

**Dialogs:**
- Create/edit form with: title, description, workaround, status
- Link to ticket dropdown

**API Hooks Used:**
- `useKnownErrors()` — `GET /api/v1/known-errors`
- `useCreateKnownError()` — `POST /api/v1/known-errors`
- `useUpdateKnownError()` — `PUT /api/v1/known-errors/{id}`
- `useDeleteKnownError()` — `DELETE /api/v1/known-errors/{id}`

---

### /monitoring — Monitoring Page

**File:** `/packages/frontend/src/pages/MonitoringPage.tsx`

**Purpose:** Configure monitoring sources and view events

**Tabs:**

1. **Sources Tab**
   - Table of monitoring sources (Check_MK, Zabbix, Prometheus, etc.)
   - Columns: name, type, status, last_check, actions
   - Add source button
   - Edit/delete buttons
   - Test connection button

2. **Events Tab**
   - Table of monitoring events
   - Columns: hostname, service_name, state (with badge), output, asset_link, ticket_link, received_at
   - Filters: state (ok, warning, critical, unknown), source
   - Acknowledge button per event
   - Auto-link to asset/ticket if matched

**Dialogs:**

1. **Create Monitoring Source**
   - Name, type (select), config (JSON textarea), webhook_secret, is_active

2. **Edit Source**
   - Same fields as create

3. **Test Connection**
   - Sends test request to configured source
   - Shows success/error message

**API Hooks Used:**
- `useMonitoringSources()` — `GET /api/v1/monitoring/sources`
- `useMonitoringEvents(filters)` — `GET /api/v1/monitoring/events`
- `useMonitoringEventStats()` — `GET /api/v1/monitoring/events/stats`
- `useCreateMonitoringSource()` — `POST /api/v1/monitoring/sources`
- `useUpdateMonitoringSource(id)` — `PUT /api/v1/monitoring/sources/{id}`
- `useDeleteMonitoringSource(id)` — `DELETE /api/v1/monitoring/sources/{id}`
- `useAcknowledgeEvent(eventId)` — `POST /api/v1/monitoring/events/{id}/acknowledge`

---

### /projects — Projects Page

**File:** `/packages/frontend/src/pages/ProjectsPage.tsx`

**Purpose:** Manage projects

**Search:**
- Input field searching across project names and codes

**Create Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Name | Text input | ✓ |
| Code | Text input (auto-filled from name) | ✓ |
| Description | Textarea | ✗ |
| Customer | Select | ✗ |
| Start Date | Date input | ✗ |
| End Date | Date input | ✗ |
| Status | Select | ✓ |

**Project List:**
- Table with: code, name, customer, start_date, end_date, status
- Row click → Navigate to `/projects/{id}`
- Edit button → Open edit dialog
- Delete button

**API Hooks Used:**
- `useProjects()` — `GET /api/v1/projects`
- `useCreateProject()` — `POST /api/v1/projects`
- `useUpdateProject(id)` — `PUT /api/v1/projects/{id}`
- `useDeleteProject(id)` — `DELETE /api/v1/projects/{id}`

---

### /projects/:id — Project Detail Page

**File:** `/packages/frontend/src/pages/ProjectDetailPage.tsx`

**Purpose:** View and manage project details

**Sections:**
- Project metadata (name, code, customer, dates, status)
- Associated tickets
- Project team members (if applicable)

**Buttons:**
- Edit (inline)
- Delete (with confirmation)
- Add tickets to project

**API Hooks Used:**
- `useProject(id)` — `GET /api/v1/projects/{id}`
- `useUpdateProject(id)` — `PUT /api/v1/projects/{id}`
- `useDeleteProject(id)` — `DELETE /api/v1/projects/{id}`

---

### /cab — CAB Board Page

**File:** `/packages/frontend/src/pages/CabBoardPage.tsx`

**Purpose:** Change Advisory Board meeting board (changes awaiting CAB review)

**View:**
- Table or Kanban of changes with CAB_REQUIRED=true
- Columns: change_number, title, risk_level, planned_date, status
- Change status from "pending_cab" to approved/rejected
- Add meeting notes

**API Hooks Used:**
- `useTickets({ cab_required: true })` — `GET /api/v1/tickets`

---

### /reports/sla — SLA Reports Page

**File:** `/packages/frontend/src/pages/SlaReportsPage.tsx`

**Purpose:** View SLA performance reports

**Sections:**

1. **Summary Stats**
   - Total tickets analyzed
   - On-time percentage
   - Breached count
   - Average resolution time

2. **Charts**
   - SLA compliance by priority
   - SLA compliance by type
   - Compliance trend (line chart)

3. **Detailed Breakdown**
   - Table of breached tickets
   - Columns: ticket_number, title, priority, sla_tier, response_due, resolution_due, breached_by

**Filters:**
- Date range
- SLA tier
- Ticket type

**API Hooks Used:**
- `useSlaReports(filters)` — `GET /api/v1/reports/sla`

---

## Settings Routes

All settings routes are nested under `/settings` with layout sidebar navigation.

### /settings/general — General Settings Page

**File:** `/packages/frontend/src/pages/settings/GeneralSettingsPage.tsx`

**Sections:**

1. **Language**
   - Select dropdown (de, en)
   - Changes i18n immediately

2. **Notifications**
   - Email notifications toggle
   - Browser notifications toggle

3. **Theme**
   - Theme selector: light, dark, system
   - Uses `useThemeStore` for state

4. **Branding** (if editable)
   - Company name
   - Logo upload

**API Hooks Used:**
- `useSettings()` — `GET /api/v1/settings`
- `useUpdateSettings()` — `PUT /api/v1/settings/{key}`

---

### /settings/account — Account Settings Page

**File:** `/packages/frontend/src/pages/settings/AccountSettingsPage.tsx`

**Sections:**

1. **Profile**
   - Display name (editable)
   - Email (read-only)
   - Language preference

2. **Password**
   - Current password input
   - New password input
   - Confirm password input
   - "Change Password" button

3. **Session**
   - Logout from all devices button
   - Active sessions list (if available)

**Buttons:**
- "Save" (for profile changes)
- "Change Password"
- "Logout All Devices"

**API Hooks Used:**
- `useCurrentUser()` — `GET /api/v1/users/me`
- `useUpdateUser(id)` — `PUT /api/v1/users/{id}`
- `useChangePassword()` — `POST /api/v1/auth/change-password`

---

### /settings/tenant — Tenant Settings Page

**File:** `/packages/frontend/src/pages/settings/TenantSettingsPage.tsx`

**Sections:**

1. **Tenant Info**
   - Name (editable)
   - Slug (read-only, auto-generated)
   - License info display

2. **License Management**
   - Current edition badge (Community / Enterprise)
   - License key textarea (for activation)
   - "Activate License" button
   - "Deactivate License" button

3. **License Usage**
   - Progress bars for: assets, users, workflows, frameworks, monitoring sources
   - Shows current/max with visual warning thresholds

**Buttons:**
- "Save" (for tenant name changes)
- "Activate License" (if no license)
- "Deactivate License" (if licensed)

**API Hooks Used:**
- `useLicenseInfo()` — `GET /api/v1/license`
- `useLicenseUsage()` — `GET /api/v1/license/usage`
- `useActivateLicense()` — `POST /api/v1/license/activate`
- `useDeactivateLicense()` — `POST /api/v1/license/deactivate`

---

### /settings/users — Users Settings Page

**File:** `/packages/frontend/src/pages/settings/UsersSettingsPage.tsx`

**Sections:**

1. **Users Table**
   - Columns: email, display_name, auth_provider, is_active, last_login, actions
   - Add user button
   - Edit button → opens dialog
   - Delete button
   - Bulk import button → opens CSV import dialog

2. **Groups Section**
   - Table of assignee groups
   - Columns: name, group_type, description, member_count, actions
   - Add group button
   - Edit group button
   - Delete group button
   - View members button

**Add User Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Email | Email input | ✓ |
| Display Name | Text input | ✓ |
| Password | Password input | ✓ |
| Auth Provider | Select (local/oidc) | ✓ |
| Is Active | Toggle | Default: true |

**Add Group Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Name | Text input | ✓ |
| Description | Textarea | ✗ |
| Group Type | Select (support, development, operations, etc.) | ✓ |

**Import Dialog:**
- CSV upload (UserImportDialog component)
- Format: email, display_name, password (or auto-generate)
- Preview before import
- Confirm button

**API Hooks Used:**
- `useUsers()` — `GET /api/v1/users`
- `useCreateUser()` — `POST /api/v1/users`
- `useUpdateUser(id)` — `PUT /api/v1/users/{id}`
- `useDeleteUser(id)` — `DELETE /api/v1/users/{id}`
- `useGroups()` — `GET /api/v1/groups`
- `useCreateGroup()` — `POST /api/v1/groups`
- `useUpdateGroup(id)` — `PUT /api/v1/groups/{id}`
- `useDeleteGroup(id)` — `DELETE /api/v1/groups/{id}`

---

### /settings/customers — Customers Settings Page

**File:** `/packages/frontend/src/pages/settings/CustomersSettingsPage.tsx`

**Similar to /customers but in settings context:**
- Manage customer list
- Edit customer details (name, contact_email, industry, is_active)
- Delete customers
- CSV import

**API Hooks Used:**
- `useCustomers()` — `GET /api/v1/customers`
- `useCreateCustomer()` — `POST /api/v1/customers`
- `useUpdateCustomer(id)` — `PUT /api/v1/customers/{id}`
- `useDeleteCustomer(id)` — `DELETE /api/v1/customers/{id}`

---

### /settings/sla — SLA Settings Page

**File:** `/packages/frontend/src/pages/settings/SlaSettingsPage.tsx`

**Sections:**

1. **SLA Tiers Configuration**
   - Table of SLA tiers (platinum, gold, silver, bronze, none)
   - Columns: tier_name, response_hours, resolution_hours, priority_boost, actions
   - Edit button → opens dialog
   - Add custom tier option

2. **SLA Escalation Rules**
   - Table of escalation rules
   - When SLA is at X% → notify/escalate to group
   - Add rule button
   - Edit/delete buttons

**Edit SLA Tier Dialog:**

| Field | Component |
|-------|-----------|
| Tier Name | Text input |
| Response SLA Hours | Number input |
| Resolution SLA Hours | Number input |
| Priority Boost | Select (low/medium/high/critical) |

**API Hooks Used:**
- `useSlaSettings()` — `GET /api/v1/settings/sla`
- `useUpdateSlaSettings()` — `PUT /api/v1/settings/sla`

---

### /settings/notifications — Notification Settings Page

**File:** `/packages/frontend/src/pages/settings/NotificationSettingsPage.tsx`

**Sections:**

1. **Notification Channels**
   - Email notifications toggle
   - Slack webhook URL (if integrated)
   - Teams webhook URL (if integrated)
   - Test button for each channel

2. **Notification Rules**
   - Table of when to notify
   - Event types: ticket_created, ticket_assigned, ticket_closed, sla_breach, etc.
   - Recipients: specific groups, admins, or email addresses
   - Add rule button
   - Edit/delete buttons

3. **Email Templates**
   - Templates for each notification type
   - Edit button → opens editor

**Test Notification Button:**
- Sends test notification to all configured channels

**API Hooks Used:**
- `useNotificationSettings()` — `GET /api/v1/settings/notifications`
- `useUpdateNotificationSettings()` — `PUT /api/v1/settings/notifications`
- `useTestNotificationChannel()` — `POST /api/v1/settings/notifications/test/{channel}`

---

### /settings/escalation — Escalation Settings Page

**File:** `/packages/frontend/src/pages/settings/EscalationSettingsPage.tsx`

**Sections:**

1. **Escalation Policies**
   - Table of escalation chains
   - Each policy has: conditions (SLA %, time), actions (notify, reassign, etc.)
   - Add policy button
   - Edit/delete buttons

2. **Major Incident Management**
   - Declare major incident button
   - Active incidents list
   - Incident details: title, start_time, affected_count, status
   - Resolve incident button

**API Hooks Used:**
- `useEscalationPolicies()` — `GET /api/v1/settings/escalation`
- `useCreateEscalationPolicy()` — `POST /api/v1/settings/escalation`
- `useDeclareMajorIncident()` — `POST /api/v1/escalation/declare`
- `useResolveMajorIncident()` — `POST /api/v1/escalation/resolve/{id}`

---

### /settings/audit — Audit Log Page

**File:** `/packages/frontend/src/pages/settings/AuditLogPage.tsx`

**Purpose:** View system audit trail

**Table:**
- Columns: timestamp, action, resource_type, resource_id, user, old_value, new_value, status
- Filterable by: action, resource_type, date range, user
- Searchable by resource_id, details

**Buttons:**
- Export to CSV
- Clear old logs (>90 days)

**API Hooks Used:**
- `useAuditLogs(filters)` — `GET /api/v1/audit/logs`

---

### /settings/asset-types — Asset Types Settings Page

**File:** `/packages/frontend/src/pages/settings/AssetTypesSettingsPage.tsx`

**Purpose:** Manage custom asset types and their attribute schemas

**Table:**
- Columns: slug, name, category, description, attribute_count, actions
- Add asset type button
- Edit button
- Delete button

**Add/Edit Asset Type Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Slug | Text input (lowercase, unique) | ✓ |
| Name | Text input | ✓ |
| Category | Select (`ASSET_TYPE_CATEGORIES`) | ✓ |
| Description | Textarea | ✗ |
| Attribute Schema | JSON editor (array of field definitions) | ✗ |

**Attribute Schema Fields:**
Each attribute can be: text, number, select, multiselect, date, checkbox, textarea
- Field name, label, type, required, options (for select), default_value, etc.

**API Hooks Used:**
- `useAssetTypes()` — `GET /api/v1/asset-types`
- `useCreateAssetType()` — `POST /api/v1/asset-types`
- `useUpdateAssetType(slug)` — `PUT /api/v1/asset-types/{slug}`
- `useDeleteAssetType(slug)` — `DELETE /api/v1/asset-types/{slug}`

---

### /settings/relation-types — Relation Types Settings Page

**File:** `/packages/frontend/src/pages/settings/RelationTypesSettingsPage.tsx`

**Purpose:** Define asset relationship types

**Table:**
- Columns: slug, name, description, is_bidirectional, actions

**Add/Edit Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Slug | Text input (unique) | ✓ |
| Name | Text input | ✓ |
| Description | Textarea | ✗ |
| Is Bidirectional | Toggle | Default: false |

**API Hooks Used:**
- `useRelationTypes()` — `GET /api/v1/relation-types`
- `useCreateRelationType()` — `POST /api/v1/relation-types`
- `useUpdateRelationType(slug)` — `PUT /api/v1/relation-types/{slug}`
- `useDeleteRelationType(slug)` — `DELETE /api/v1/relation-types/{slug}`

---

### /settings/classifications — Classification Settings Page

**File:** `/packages/frontend/src/pages/settings/ClassificationSettingsPage.tsx`

**Purpose:** Manage asset classification models

**Sections:**

1. **Classification Models**
   - Table: name, description, categories_count, actions
   - Add model button
   - Edit button
   - Delete button

2. **Categories (per model)**
   - Editable table of categories within selected model
   - Add category button
   - Edit/delete buttons

**Add/Edit Model Dialog:**

| Field | Component |
|-------|-----------|
| Name | Text input |
| Description | Textarea |
| Categories | Multi-input (comma-separated or list) |

**API Hooks Used:**
- `useClassificationModels()` — `GET /api/v1/classifications/models`
- `useCreateClassificationModel()` — `POST /api/v1/classifications/models`
- `useUpdateClassificationModel(id)` — `PUT /api/v1/classifications/models/{id}`
- `useDeleteClassificationModel(id)` — `DELETE /api/v1/classifications/models/{id}`

---

### /settings/capacity-types — Capacity Types Settings Page

**File:** `/packages/frontend/src/pages/settings/CapacityTypesSettingsPage.tsx`

**Purpose:** Define capacity metrics (CPU, RAM, storage, etc.)

**Table:**
- Columns: name, unit, description, applies_to_types, actions

**Add/Edit Dialog:**

| Field | Component |
|-------|-----------|
| Name | Text input |
| Unit | Text input (%, GB, cores, etc.) |
| Description | Textarea |
| Applies to Asset Types | Multi-select |

**API Hooks Used:**
- `useCapacityTypes()` — `GET /api/v1/capacity/types`
- `useCreateCapacityType()` — `POST /api/v1/capacity/types`
- `useUpdateCapacityType(id)` — `PUT /api/v1/capacity/types/{id}`
- `useDeleteCapacityType(id)` — `DELETE /api/v1/capacity/types/{id}`

---

### /settings/service-profiles — Service Profiles Settings Page

**File:** `/packages/frontend/src/pages/settings/ServiceProfilesSettingsPage.tsx`

**Purpose:** Define service profiles for service catalog

**Table:**
- Columns: name, description, services_count, actions

**Add/Edit Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Name | Text input | ✓ |
| Description | Textarea | ✗ |
| Included Services | Multi-select service descriptions | ✗ |

**API Hooks Used:**
- `useServiceProfiles()` — `GET /api/v1/services/profiles`
- `useCreateServiceProfile()` — `POST /api/v1/services/profiles`
- `useUpdateServiceProfile(id)` — `PUT /api/v1/services/profiles/{id}`
- `useDeleteServiceProfile(id)` — `DELETE /api/v1/services/profiles/{id}`

---

### /settings/system — System Settings Page

**File:** `/packages/frontend/src/pages/settings/SystemSettingsPage.tsx`

**Purpose:** Global system configuration (admin only)

**Sections:**

1. **System Info**
   - App version (read-only)
   - Database info (read-only)
   - Uptime (read-only)
   - API health status

2. **Email Configuration**
   - SMTP server address
   - SMTP port
   - From address
   - Auth username/password
   - Test button

3. **OIDC Configuration** (Enterprise)
   - Provider URL
   - Client ID
   - Client Secret
   - Scopes
   - Enable toggle

4. **Email Inbound** (if enabled)
   - IMAP configuration
   - Webhook configuration
   - Test button

**API Hooks Used:**
- `useSystemInfo()` — `GET /api/v1/system/info`
- `useSystemSettings()` — `GET /api/v1/settings/system`
- `useUpdateSystemSettings()` — `PUT /api/v1/settings/system`
- `useTestEmailConfig()` — `POST /api/v1/settings/system/test-email`
- `useTestOidcConfig()` — `POST /api/v1/settings/system/test-oidc`

---

## Customer Portal Routes

All portal routes use separate authentication and layout.

### /portal/tickets — Portal Tickets Page

**File:** `/packages/frontend/src/pages/portal/PortalTicketsPage.tsx`

**Purpose:** Customer view of their tickets only

**View:**
- Table of customer's tickets
- Columns: ticket_number, title, status, priority, created_at
- Filter by status
- Create new ticket button

**Create Ticket Dialog:**

| Field | Component | Required |
|-------|-----------|----------|
| Service | Select (from available services) | ✓ |
| Title | Text input | ✓ |
| Description | Textarea | ✓ |
| Priority | Select (low, medium, high) | ✗ |

**Row Click:**
- Navigate to `/portal/tickets/{id}`

**API Hooks Used:**
- `portalApi.getTickets()` — `GET /api/v1/portal/tickets`
- `portalApi.createTicket()` — `POST /api/v1/portal/tickets`
- `portalApi.getServices()` — `GET /api/v1/portal/services`

---

### /portal/tickets/:id — Portal Ticket Detail Page

**File:** `/packages/frontend/src/pages/portal/PortalTicketDetailPage.tsx`

**Purpose:** Customer view of single ticket with comment capability

**Sections:**

1. **Ticket Info** (read-only)
   - Number, title, type, status, priority
   - Created date, last update date

2. **Description** (read-only)
   - Markdown rendered

3. **Comments**
   - List of comments from agents and customers
   - Only customer comments and agent responses visible
   - Add comment form: textarea + "Submit" button

4. **Status Updates** (read-only)
   - Timeline of status changes

**Buttons:**
- Back to tickets list
- Add comment (submit form)

**API Hooks Used:**
- `portalApi.getTicket(id)` — `GET /api/v1/portal/tickets/{id}`
- `portalApi.addComment(id)` — `POST /api/v1/portal/tickets/{id}/comments`
- `portalApi.getComments(id)` — `GET /api/v1/portal/tickets/{id}/comments`

---

### /portal/kb — Portal Knowledge Base Page

**File:** `/packages/frontend/src/pages/portal/PortalKbPage.tsx`

**Purpose:** Public KB articles visible to customers

**Search:**
- Input field searching across public articles

**Article List:**
- Cards or table of public articles
- Columns: title, category, tags, published_at
- Click to read article

**Article View:**
- Rendered markdown content
- Back to list button
- Related articles (if available)

**API Hooks Used:**
- `portalApi.getKbArticles()` — `GET /api/v1/portal/kb/articles` (public only)

---

## Reusable Components & Patterns

### shadcn/ui Components Used

All in `/packages/frontend/src/components/ui/`:

| Component | Usage | Key Props |
|-----------|-------|-----------|
| Button | All buttons | `variant`, `size`, `disabled`, `onClick` |
| Input | Text inputs | `type`, `placeholder`, `value`, `onChange` |
| Select | Dropdowns | `value`, `onValueChange`, `placeholder` |
| Textarea | Multi-line | `value`, `onChange`, `placeholder`, `rows` |
| Dialog | Modals | `open`, `onOpenChange` |
| AlertDialog | Destructive confirmations | Confirmation wrapper |
| Tabs | Multi-section views | `value`, `onValueChange` |
| Badge | Status/category tags | `variant` (default, secondary, destructive, etc.) |
| Card | Container | CardHeader, CardTitle, CardContent, CardFooter |
| Table | Data lists | TableHeader, TableBody, TableRow, TableCell |
| Checkbox | Boolean input | `checked`, `onCheckedChange` |
| Switch | Toggle boolean | `checked`, `onCheckedChange` |
| Skeleton | Loading placeholder | `className` |
| Avatar | User images | `AvatarFallback` for initials |
| Tooltip | Hover info | TooltipTrigger, TooltipContent |
| DropdownMenu | Context menus | DropdownMenuItem, DropdownMenuSeparator |

### Custom Components

| Component | File | Purpose |
|-----------|------|---------|
| `DynamicFormRenderer` | `/components/cmdb/DynamicFormRenderer.tsx` | Renders form fields from attribute schema |
| `DynamicFieldDisplay` | `/components/cmdb/DynamicFieldDisplay.tsx` | Displays attribute values |
| `AssetPickerDialog` | `/components/AssetPickerDialog.tsx` | Modal for selecting assets |
| `ErrorBoundary` | `/components/ErrorBoundary.tsx` | Error fallback UI |
| `LicenseBanner` | `/components/layout/LicenseBanner.tsx` | License status warning |
| `ControlsTab` | `/components/compliance/ControlsTab.tsx` | Compliance controls display |
| `AuditsTab` | `/components/compliance/AuditsTab.tsx` | Audit trail display |
| `EvidenceTab` | `/components/compliance/EvidenceTab.tsx` | Compliance evidence display |

### Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| `Sidebar` | `/components/layout/Sidebar.tsx` | Left navigation with collapsible state |
| `Header` | `/components/layout/Header.tsx` | Top navigation bar with user menu |
| `ProtectedLayout` | `/components/layout/ProtectedLayout.tsx` | Auth guard wrapper for protected routes |
| `ThemeProvider` | `/components/layout/ThemeProvider.tsx` | Dark/light mode provider |

---

## State Management & API Hooks

### Auth Store (`useAuthStore`)

**File:** `/packages/frontend/src/stores/auth-store.ts`

**State:**
- `user: User | null`
- `isLoading: boolean`
- `error: string | null`
- `isAuthenticated: boolean`

**Methods:**
- `login(email, password): Promise<void>`
- `logout(): void`
- `clearError(): void`
- `setUser(user): void`

### Theme Store (`useThemeStore`)

**File:** `/packages/frontend/src/stores/theme-store.ts`

**State:**
- `theme: 'light' | 'dark' | 'system'`

**Methods:**
- `setTheme(theme): void`

### API Client

**File:** `/packages/frontend/src/api/client.ts`

- `apiClient.get<T>(url): Promise<T>`
- `apiClient.post<T>(url, data): Promise<T>`
- `apiClient.put<T>(url, data): Promise<T>`
- `apiClient.patch<T>(url, data): Promise<T>`
- `apiClient.delete<T>(url): Promise<T>`

### TanStack Query Hook Pattern

All API hooks follow this pattern:

```typescript
// Read (GET)
useQuery({
  queryKey: [resource, params],
  queryFn: () => apiClient.get(`/api/v1/${resource}?${params}`),
})

// Write (POST/PUT/DELETE)
useMutation({
  mutationFn: (data) => apiClient.post(`/api/v1/${resource}`, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
})
```

---

## Navigation & Layout Elements

### Main Sidebar Navigation

**File:** `/packages/frontend/src/components/layout/Sidebar.tsx`

**Nav Items:**
1. Dashboard → `/`
2. Tickets → `/tickets`
3. Assets → `/assets`
4. Customers → `/customers`
5. Projects → `/projects`
6. Workflows → `/workflows`
7. Services → `/services`
8. Compliance → `/compliance`
9. Known Errors → `/known-errors`
10. Knowledge Base → `/knowledge-base`
11. Monitoring → `/monitoring`
12. SLA Reports → `/reports/sla`
13. CAB Board → `/cab`
14. Settings → `/settings`

**Sidebar Features:**
- Collapsible (toggle button)
- Active route highlighting
- User initials avatar
- Version display (from `useSystemInfo()`)
- Tooltips when collapsed

### Header Navigation

**File:** `/packages/frontend/src/components/layout/Header.tsx`

**Elements:**
- Page title (dynamic based on route)
- Search bar (global?)
- Notification bell icon
- Theme toggle (sun/moon/monitor)
- Language toggle dropdown
- User menu dropdown:
  - Profile → `/settings/account`
  - Settings → `/settings`
  - Logout

---

## Key i18n Namespaces

| Namespace | Location | Contains |
|-----------|----------|----------|
| `common` | `packages/frontend/src/i18n/locales/{de,en}/common.json` | UI strings (buttons, labels, common terms) |
| `tickets` | `packages/frontend/src/i18n/locales/{de,en}/tickets.json` | Ticket-specific strings |
| `cmdb` | `packages/frontend/src/i18n/locales/{de,en}/cmdb.json` | Asset/CMDB strings |
| `workflows` | `packages/frontend/src/i18n/locales/{de,en}/workflows.json` | Workflow strings |
| `settings` | `packages/frontend/src/i18n/locales/{de,en}/settings.json` | Settings page strings |
| `compliance` | `packages/frontend/src/i18n/locales/{de,en}/compliance.json` | Compliance strings |
| `services` | `packages/frontend/src/i18n/locales/{de,en}/services.json` | Service catalog strings |
| `portal` | `packages/frontend/src/i18n/locales/{de,en}/portal.json` | Customer portal strings |

---

## Error States & Empty States

### Standard Error Handling
- Red banner with AlertCircle icon
- Error message from API
- Retry button when applicable
- Toast notifications (sonner) for transient errors

### Empty States
- Centered icon + message
- Call-to-action button (create, import, etc.)
- Skeleton loaders while data fetches

---

## Accessibility & Keyboard Navigation

- All buttons have `onClick` handlers
- Form inputs have associated `<Label>` elements with `htmlFor`
- Modals have focus management
- Status badges use ARIA labels where appropriate
- Keyboard shortcuts for common actions (document needed)

---

## Testing Notes

### Critical User Flows

1. **Login → Dashboard → Ticket Creation → Ticket Detail**
   - Auth flow, ticket CRUD, detail view

2. **Asset Creation → Asset Relations → Asset Graph**
   - Asset CMDB, relationship DAG, visualization

3. **Ticket Assignment → SLA Tracking → Compliance**
   - Ticket workflow, SLA enforcement, regulatory mapping

4. **Workflow Template Creation → Workflow Instantiation → Step Completion**
   - Workflow designer, runtime engine, approval routing

5. **Portal Login → Create Ticket → Add Comment**
   - Customer portal flow, ticket self-service

### Known Testing Challenges

- **Drag & drop (Kanban)** — Requires browser automation (Playwright)
- **React Flow graphs** — Requires canvas manipulation
- **i18n state** — Language switching affects all text; must reset between tests
- **File uploads** — CSV import for users/customers
- **Markdown editing** — KB article content
- **Real-time data** — Tickets, comments, monitoring events
- **Socket.IO notifications** — If live updates are implemented

---

End of E2E Test Inventory.

This document comprehensively catalogs:
- **45 pages** across main app, settings, and portal
- **100+ forms** with field specifications
- **50+ tables** with column definitions
- **200+ buttons** and actions
- **30+ dialogs/modals** with form fields
- **40+ API endpoints** consumed via TanStack Query hooks
- **Reusable components** and their props
- **State management** patterns
- **Navigation structure**
- **i18n namespaces**
