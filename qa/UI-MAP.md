# OpsWeave Frontend UI Map

## Executive Summary

**Framework & Architecture:**
- React 18 with TypeScript (Strict mode)
- Vite as build tool
- React Router for routing
- TanStack Query (React Query) for server state management
- Zustand for client state (auth, theme)
- Tailwind CSS + shadcn/ui for UI components
- react-i18next for internationalization (German default, English complete)
- Sonner for toast notifications
- React Flow for graph/workflow visualization

**Authentication:**
- Login page at `/login` (public)
- Protected routes via ProtectedLayout wrapper
- Token-based auth with JWT (stored in Zustand auth store)
- Portal login at `/portal/login` (separate auth system)

**Theme:**
- Light/Dark/System modes
- Configurable via dropdown in header
- Persisted to localStorage via theme store

**i18n:**
- Namespaces: common, tickets, cmdb, workflows, services, compliance, settings, portal
- Language toggle: DE (default) ↔ EN

---

## Route Map & Pages

### Public Routes

#### `/login` - LoginPage
**File:** `packages/frontend/src/pages/LoginPage.tsx`

**Purpose:** User authentication

**Form:** Login form with email + password
- **Fields:**
  - Email (text input, required)
  - Password (password input, required)
- **Validation:** Browser default HTML5 validation
- **Submit Action:** POST `/api/v1/auth/login` via `useAuthStore.login()`
- **Error Handling:** Displays error message below submit button; shows "Invalid credentials" error
- **Session Expired Alert:** Shows amber banner if `?reason=session_expired` in query params

**Language Toggle:** Button to switch between DE/EN (bottom of card)

**Loading State:** "Anmelden..." text + spinner on button during submission

**States:**
- Default
- Loading (button disabled, spinner shown)
- Error (red error message box)
- Session expired (amber warning box)

---

### Protected Routes (Require Authentication)

All these routes use `<ProtectedLayout>` wrapper which provides:
- Left sidebar with navigation
- Top header with search, theme toggle, language toggle, notifications, user menu
- Main content area with page title from header

#### Navigation Items in Sidebar:
1. Dashboard `/`
2. Tickets `/tickets`
3. Assets `/assets`
4. Customers `/customers`
5. Projects `/projects`
6. Workflows `/workflows`
7. Services `/services`
8. Compliance `/compliance`
9. Known Errors `/known-errors`
10. Knowledge Base `/knowledge-base`
11. Monitoring `/monitoring`
12. Capacity Planning `/capacity-planning`
13. SLA Reports `/reports/sla`
14. CAB Board `/cab`
15. Settings `/settings` (at bottom, separator above)

#### `/` - DashboardPage
**File:** `packages/frontend/src/pages/DashboardPage.tsx`

**Purpose:** Overview dashboard with KPIs and recent activity

**Data Sources:**
- `useTicketStats()` → GET `/api/v1/tickets/stats` — returns `{ by_status: {...}, by_type: {...}, sla_breached, total }`
- `useAssetStats()` → GET `/api/v1/assets/stats` — returns `{ by_type, by_status, by_sla, total }`
- `useTickets({ limit: 5, sort: 'created_at', order: 'desc' })` → 5 recent tickets
- `useTicketTimeline(30)` → GET `/api/v1/tickets/timeline?days=30` — 30-day ticket creation timeline
- `useTicketsByCustomer(5)` → GET `/api/v1/tickets/top-customers?limit=5` — top 5 customers by ticket count

**Components:**

1. **Welcome Section** (top)
   - "Welcome, {User Name}" heading
   - App claim text
   - Refresh button (calls `refetch()` on stats)

2. **Error State** (conditional)
   - Red alert card if `isError` from stats query
   - Retry button

3. **Stat Cards** (4 columns, responsive to 2/1 on mobile)
   - Open Tickets (Ticket icon, blue)
   - SLA Breaches (AlertTriangle icon, red if > 0, default otherwise)
   - Total Assets (Server icon, blue)
   - Pending Changes (GitPullRequest icon, amber if > 0, default otherwise)
   - Each card is clickable → navigates to respective page

4. **Chart Cards** (2x2 grid)
   - **Ticket Timeline** (LineChart from Recharts)
     - X-axis: date (formatted as DD.MM.)
     - Y-axis: count
     - Data from `timelineData` or empty state
   - **Top Customers** (BarChart from Recharts, horizontal)
     - X-axis: count
     - Y-axis: customer names (truncated to 12 chars)
     - Colored bars (5-color rotation)

5. **Quick Overview Cards** (2-column grid)
   - **Ticket Status Overview**
     - 5 status rows: open, in_progress, pending, resolved, closed
     - Each row has: status name, progress bar (color-coded), count badge
     - Skeleton loaders while loading
   - **Recent Tickets**
     - List of 5 most recent tickets
     - Each ticket: ticket number, title, status badge, relative time
     - Clickable → navigates to ticket detail

**Loading State:** Skeleton loaders for charts and lists

**Empty State:** Icon + message for empty lists/charts

---

#### `/tickets` - TicketBoardPage
**File:** `packages/frontend/src/pages/TicketBoardPage.tsx`

**Purpose:** Kanban board view of tickets grouped by status

**Data Sources:**
- `useBoardData()` → GET `/api/v1/tickets/board` — returns columns with status + tickets
- `useTickets()` with filters → for list view
- `useCategories()` → ticket categories for filtering

**Views:**
1. **Board View** (default)
   - 5 columns: open, in_progress, pending, resolved, closed
   - Each column has count badge
   - Tickets are cards with:
     - Priority dot (colored circle)
     - Ticket number (monospace, small)
     - Title (bold, truncated)
     - Status badge
     - Assignee avatar (small)
     - Created date (relative time)
   - Drag & drop between columns (dnd-kit library)
   - On drop: PATCH `/api/v1/tickets/:id/status` with new status
   
2. **List View** (toggleable)
   - Table with columns:
     - Checkbox (select multiple)
     - Ticket Number (link to detail)
     - Title
     - Status (badge)
     - Priority (dot + text)
     - Assignee (avatar + name)
     - Created (relative time)
   - Sortable columns (click header to toggle sort)
   - Pagination controls (prev/next, page indicator)

**Filters:**
- Search box (text input, searches title + description)
- Status dropdown (all / open / in_progress / pending / resolved / closed)
- Type dropdown (all / incident / change / problem)
- Priority dropdown (all / critical / high / medium / low)
- Assignee group dropdown (all / list of groups)
- Category dropdown (all / list of categories)
- Clear filters button (red X icon)

**Action Buttons:**
- **+ New Ticket** (top-left) → navigates to `/tickets/new`
- **Download** (export as CSV)
- **View/Board toggle** (LayoutGrid/List icons)
- **Refresh** (RefreshCw icon)

**Loading State:** Skeleton rows in list view, empty column cards in board view

**Empty State:** Icon + "No tickets" message with "Create new" button

---

#### `/tickets/new` - CreateTicketPage
**File:** `packages/frontend/src/pages/CreateTicketPage.tsx`

**Purpose:** Create new ticket

**Data Sources:**
- `useGroups()` → assignee groups dropdown
- `useCustomers()` → customer dropdown
- `useCategories()` → category dropdown

**Form Fields:**

1. **Basic Info Card**
   - Ticket Type (select: incident, change, problem)
   - Title (text input, required, validates min 5 chars)
   - Description (textarea, markdown-supported)

2. **Classification Card** (for all types)
   - Priority (select: critical, high, medium, low)
   - Impact (select, if applicable)
   - Urgency (select, if applicable)

3. **Change-Specific Card** (shows if type === 'change')
   - Risk Likelihood (select: low, medium, high, critical)
   - Risk Impact (select: low, medium, high, critical)
   - Risk Matrix display (2D grid showing calculated risk level)

4. **Assignment Card**
   - Customer (select, optional)
   - Assignee Group (select, optional)
   - Category (select, optional)

5. **Parent Ticket** (if `?parent=:id` query param)
   - Shows parent ticket info (read-only)

**Submit Action:** POST `/api/v1/tickets` with `CreateTicketPayload`

**Loading State:** Button shows spinner + "Lutte..." text; form inputs disabled

**Error Handling:** Toast notification on error

**Success:** Toast notification + navigate to `/tickets/:id`

---

#### `/tickets/:id` - TicketDetailPage
**File:** `packages/frontend/src/pages/TicketDetailPage.tsx`

**Purpose:** View and edit single ticket with full details

**Data Sources:**
- `useTicket(id)` → GET `/api/v1/tickets/:id`
- `useTicketComments(id)` → GET `/api/v1/tickets/:id/comments`
- `useTicketHistory(id)` → GET `/api/v1/tickets/:id/history`
- `useChildTickets(id)` → GET `/api/v1/tickets/:id/children`
- `useTicketWorkflow(id)` → workflow instance for ticket
- `useGroups()` → for assignment dropdowns
- `useCustomers()` → for assignment
- `useUsers()` → for assignment
- `useKbArticles()` → for linking KB articles
- `useWorkflowTemplates()` → for manual workflow instantiation

**Layout: Tabs**

**Tab 1: Details**
- Header with back button, ticket number, title, priority badge
- Two-column layout:
  
  **Left column (main content):**
  - Description (markdown rendered)
  - Known Error link (if associated, with external link icon)
  - Related KB Articles (list with external link icons)
  - Workflow section (if workflow instance exists):
    - Current step name
    - Step status badge
    - Progress bar through steps
    - Action button (Complete Step / etc based on step type)

  **Right column (sidebar):**
  - Status (select dropdown, onChange → PATCH status)
  - Priority (select dropdown, onChange → PATCH priority)
  - Impact & Urgency (read-only or editable based on type)
  - Change Risk (if type === 'change'):
    - Risk Likelihood select
    - Risk Impact select
    - Risk Matrix visualization
  - Assignee (select from groups + users, onChange → PATCH assign)
  - Customer (select, editable)
  - Category (select, editable)
  - Related Asset (card with asset name + link, can remove relation)
  - SLA Info:
    - Response due (red if breached)
    - Resolve due (red if breached)
    - Breached badge

- Action buttons:
  - Edit (inline form)
  - Delete (AlertDialog confirmation)
  - Create Child Ticket (modal to create sub-ticket)
  - Link Asset (AssetPickerDialog)
  - Link KB Article (search + select dialog)

**Tab 2: Comments**
- List of ticket comments (sorted by date desc)
- Each comment shows:
  - Author avatar + name
  - Timestamp (relative)
  - Comment content (markdown rendered)
  - Internal flag (eye icon if internal)
  - Delete button (if own comment or admin)
- Add comment form:
  - Textarea for comment text
  - Internal toggle switch (checkbox + label)
  - Submit button (Send icon)

**Tab 3: History**
- Audit log table
- Columns: timestamp, field, old value, new value, changed by
- Pagination
- Export button

**Tab 4: Child Tickets**
- Table of child tickets (if any)
- Columns: ticket number, type, title, status, priority, assignee, created date
- Each row is clickable → navigate to child ticket detail
- Empty state if no children

**Tab 5: Workflow** (if applicable)
- Shows workflow instance diagram (React Flow)
- Current step highlighted
- Step details panel on click
- Complete step dialog (based on step type)

**Loading State:** Skeleton loaders for each section

**Error State:** Red alert card with retry button

---

#### `/assets` - AssetsPage
**File:** `packages/frontend/src/pages/AssetsPage.tsx`

**Purpose:** View and manage CMDB assets

**Data Sources:**
- `useAssets(params)` → GET `/api/v1/assets?page=...&limit=25&...filters`
- `useAssetTypes()` → for type dropdown + categorization
- `useCustomers()` → for customer filter
- `useFullAssetGraph()` → for global graph view (optional)

**Views:**

1. **Table View** (default)
   - Columns:
     - Name (link to detail)
     - Type (badge, colored)
     - Status (badge with color)
     - SLA Tier (badge: platinum, gold, silver, bronze, none)
     - Environment (badge)
     - Owner Group (text)
     - Customer (text)
     - IP Address (monospace, small)
     - Created (relative time)
   - Sortable by any column
   - Pagination

2. **Graph View** (toggle button)
   - React Flow graph of asset relations
   - Nodes are assets (colored by status)
   - Edges are relations (labeled with relation type)
   - MiniMap on bottom-right
   - Controls (zoom, fit view, etc)

**Filters:**
- Search box (asset name, IP, etc)
- Asset Type dropdown (all / server / network / application / etc)
- Category filter (all / compute / network / storage / etc) — shows category groups
- Status filter (all / active / inactive / maintenance / decommissioned)
- SLA Tier filter (all / platinum / gold / silver / bronze / none)
- Environment filter (all / production / staging / development / etc)
- Customer filter (all / list of customers)
- Clear filters button

**Action Buttons:**
- **+ New Asset** (top-right) → navigate to `/assets/new`
- **View/Graph toggle** (LayoutGrid/Network icons)
- **Refresh**

**Loading State:** Skeleton rows in table, "Loading..." in graph view

**Empty State:** Icon + "No assets found" message with create button

---

#### `/assets/new` - CreateAssetPage
**File:** `packages/frontend/src/pages/CreateAssetPage.tsx`

**Purpose:** Create new asset

**Data Sources:**
- `useAssetTypes()` → asset type schema for dynamic form
- `useCustomers()` → for customer select

**Form Fields:**

1. **Basic Info**
   - Name (text input, required, lowercase identifier)
   - Display Name (text input, readable name)
   - Asset Type (grouped select with categories)
   - IP Address (text input, optional, validates IPv4/IPv6)
   - Location (text input, optional)

2. **Classification**
   - SLA Tier (select: platinum, gold, silver, bronze, none)
   - Environment (select: production, staging, development, etc)
   - Customer (select, optional)

3. **Dynamic Fields** (based on selected asset type)
   - Fields rendered via `DynamicFormRenderer` component
   - Varies by asset type schema

**Submit Action:** POST `/api/v1/assets` with `CreateAssetPayload`

**Loading State:** Spinner on button

**Error Handling:** Toast notification

**Success:** Toast notification + navigate to `/assets/:id`

---

#### `/assets/:id` - AssetDetailPage
**File:** `packages/frontend/src/pages/AssetDetailPage.tsx`

**Purpose:** View and manage single asset

**Data Sources:**
- `useAsset(id)` → GET `/api/v1/assets/:id`
- `useAssetRelations(id)` → GET `/api/v1/assets/:id/relations`
- `useAssetTickets(id)` → GET `/api/v1/assets/:id/tickets`
- `useAssetGraph(id)` → GET `/api/v1/assets/:id/graph` (local relation graph)
- `useClassificationModels()` → for classifications
- `useAssetClassifications(id)` → classifications applied to this asset
- `useAssetCapacityHistory(id)` → capacity utilization history

**Layout: Tabs**

**Tab 1: Overview**
- Header with back button, asset name, status badge, type badge
- Two-column:
  
  **Left:**
  - Asset type (badge)
  - Status (select dropdown, onChange → PATCH)
  - IP Address (text)
  - Location (text, editable)
  - SLA Tier (select, editable)
  - Environment (select, editable)
  - Owner Group (select, editable)
  - Customer (select, editable)
  - Attributes (key-value pairs, editable based on schema)

  **Right:**
  - Last updated timestamp
  - Created timestamp
  - Created by (user name)
  - Edit button (inline form)
  - Delete button (AlertDialog)
  - Duplicate button (create copy)

- SLA Chain section (if applicable):
  - Shows SLA inheritance chain (parent assets)
  - Effective SLA Tier badge

**Tab 2: Relations**
- Table of related assets:
  - Direction (incoming ← / outgoing →)
  - Related Asset (name + type, link to detail)
  - Relation Type (label)
  - Properties (read-only)
  - Actions: Edit (dialog), Delete (AlertDialog)
- Add relation button → AssetPickerDialog + relation type select
- DAG Visualization (React Flow showing this asset and 1-hop neighbors)

**Tab 3: Relations History**
- Audit log of relation changes
- Columns: timestamp, source, target, relation type, change type, changed by

**Tab 4: Tickets**
- Table of related tickets
- Columns: ticket number, type, title, status, priority, assignee, created
- Each row is link to ticket detail
- Link new ticket button

**Tab 5: Services**
- Table of services this asset provides/supports
- Columns: service code, title, customer, link
- Each row is link to service detail

**Tab 6: Compliance**
- Table of compliance frameworks applying to this asset
- Columns: framework name, version, flagged (yes/no), reason, last reviewed
- Flag/unflag buttons

**Tab 7: Capacity**
- Capacity utilization chart (LineChart from Recharts)
- Shows utilization over time
- Capacity requirements table:
  - Requirement type, current value, threshold, status (color-coded)
- Add requirement button → dialog
- Migration recommendations (if available)

**Tab 8: Graph**
- React Flow visualization of asset + relations (1-hop neighbors)
- Nodes are assets, edges are relations
- Click node to drill-down (navigates to that asset detail)

**Loading State:** Skeleton loaders for each tab

**Error State:** Red alert with retry button

---

#### `/customers` - CustomersPage
**File:** `packages/frontend/src/pages/CustomersPage.tsx`

**Purpose:** View and manage customers

**Data Sources:**
- `useCustomers()` → GET `/api/v1/customers`

**Layout:**

- Header with "New Customer" button (+ icon)
- Search box (filters by name, email, industry)
- Grid of customer cards:
  - Customer name (heading)
  - Industry (badge, if set)
  - Contact email (with mail icon)
  - Ticket count (badge)
  - Asset count (badge)
  - Each card is clickable → navigate to `/customers/:id`

**Create Dialog:**
- Form fields:
  - Name (text, required)
  - Contact Email (email, optional)
  - Industry (text, optional)
- Submit button (creates customer)
- Success: Toast + close dialog + refetch list

**Loading State:** Skeleton cards

**Empty State:** "No customers" message with create button

---

#### `/customers/:id` - CustomerDetailPage
**File:** `packages/frontend/src/pages/CustomerDetailPage.tsx`

**Purpose:** View and manage customer details

**Data Sources:**
- `useCustomerOverview(id)` → GET `/api/v1/customers/:id`
- `usePortalUsers(customerId)` → GET `/api/v1/customers/:id/portal-users` (customer portal users)

**Layout: Tabs**

**Tab 1: Overview**
- Header with back button, customer name
- Two-column:
  
  **Left:**
  - Name (text, editable)
  - Industry (text, editable)
  - Contact Email (text, editable)

  **Right:**
  - Edit button (inline form mode)
  - Delete button (AlertDialog)
  - Created timestamp
  - Last updated timestamp

- Quick stats:
  - Active Assets (count, link to assets filter)
  - Open Tickets (count, link to tickets filter)
  - Active Services (count)
  - SLA Compliance (percentage badge)

**Tab 2: Tickets**
- Table of tickets for this customer
- Columns: ticket number, type, title, status, priority, assignee, created
- Sortable, paginated
- Create ticket button (pre-fills customer)

**Tab 3: Assets**
- Table of assets for this customer
- Columns: name, type, status, SLA tier, environment, IP address, created
- Sortable, paginated
- Create asset button (pre-fills customer)

**Tab 4: Services**
- Table of services associated with customer
- Columns: service code, title, catalog, created
- Link/unlink service buttons

**Tab 5: Portal Users** (if Enterprise)
- Table of portal users for this customer
- Columns: email, display name, is active, last login, actions
- Each row has edit (inline form) + delete (AlertDialog) buttons
- Add portal user button → dialog with:
  - Email (text, required)
  - Display Name (text, required)
  - Password (password, required)
  - Create button

**Loading State:** Skeleton loaders

**Error State:** Red alert with retry

---

#### `/workflows` - WorkflowsPage
**File:** `packages/frontend/src/pages/WorkflowsPage.tsx`

**Purpose:** View and manage workflow templates

**Data Sources:**
- `useWorkflowTemplates()` → GET `/api/v1/workflows/templates?page=...`
- `useLicenseInfo()` → for checking workflow count limit (Community: 3 max)

**License Banner:**
- If Community edition + workflows count = 3:
  - Amber banner: "Limit von 3 Workflows erreicht. Upgrade auf Enterprise für unbegrenzte Workflows."

**Table:**
- Columns:
  - Name (link to detail)
  - Trigger Type (badge: ticket_created, ticket_updated, manual)
  - Active (toggle switch, onChange → PATCH)
  - Trigger Subtype (ticket type: incident, change, problem, or "—")
  - Step Count (badge)
  - Last Updated (relative time)
  - Actions: Edit (link), Delete (AlertDialog)
- Sortable
- Paginated

**Filters:**
- Search box
- Trigger Type filter (all / ticket_created / ticket_updated / manual)
- Active filter (all / active / inactive)

**Action Buttons:**
- **+ New Workflow** → dialog with name + trigger type select + submit
  - Creates workflow → navigates to `/workflows/:id`
- **Refresh**

**Loading State:** Skeleton rows

**Empty State:** "No workflows" message with create button

---

#### `/workflows/:id` - WorkflowDetailPage
**File:** `packages/frontend/src/pages/WorkflowDetailPage.tsx`

**Purpose:** Edit workflow template and steps

**Data Sources:**
- `useWorkflowTemplate(id)` → GET `/api/v1/workflows/templates/:id`
- `useUpdateWorkflowTemplate()` → PATCH workflow
- `useAddWorkflowStep()` → POST step
- `useRemoveWorkflowStep()` → DELETE step
- `useReorderWorkflowSteps()` → POST reorder
- `useTemplateInstances(templateId)` → GET past/current instances

**Layout: Tabs**

**Tab 1: Steps**
- React Flow diagram (or list view):
  - Nodes are steps (drag to reorder via dnd-kit)
  - Each step card shows:
    - Step order (number)
    - Step name
    - Step type badge (form, routing, approval, condition, automatic)
    - Timeout (if set)
    - Actions: Edit (inline form), Delete (AlertDialog)
  - Add step button (bottom) → dialog:
    - Name
    - Step type (select)
    - Step-type-specific config (forms, routing rules, etc)
    - Timeout (optional)
    - Add button

**Tab 2: Details**
- Name (text, editable)
- Description (textarea, editable)
- Trigger Type (select: ticket_created, ticket_updated, manual)
- Trigger Subtype (if ticket_created/ticket_updated: select ticket types)
- Active toggle (switch)
- Save button

**Tab 3: Instances**
- Table of workflow instances (past executions)
- Columns: ticket number, status (running, completed, failed), started at, completed at
- Each row is clickable → shows instance details (read-only)
- Pagination
- Pagination

**Loading State:** Skeleton loaders

**Error State:** Red alert

---

#### `/services` - ServiceCatalogPage
**File:** `packages/frontend/src/pages/ServiceCatalogPage.tsx`

**Purpose:** View and manage service catalog (service descriptions + catalogs)

**Data Sources:**
- `useServiceDescriptions()` → GET `/api/v1/services/descriptions`
- `useHorizontalCatalogs()` → GET `/api/v1/services/catalogs/horizontal`
- `useVerticalCatalogs()` (Enterprise) → GET `/api/v1/services/catalogs/vertical`

**Layout: Tabs**

**Tab 1: Service Descriptions**
- Table:
  - Code (link to detail)
  - Title
  - Status (draft, published, archived)
  - Version
  - Compliance Tags (comma-separated list)
  - Actions: Edit, Delete
- Search filter
- Status filter
- Add service button → dialog:
  - Code (required)
  - Title (required)
  - Description (textarea)
  - Scope Included (textarea)
  - Scope Excluded (textarea)
  - Compliance Tags (comma-separated)
  - Create button

**Tab 2: Horizontal Catalogs**
- Table:
  - Name (link to detail)
  - Description
  - Item Count (badge)
  - Status
  - Actions: Edit, Delete
- Add catalog button → dialog:
  - Name (required)
  - Description (textarea)
  - Services (multi-select from service descriptions)
  - Create button

**Tab 3: Vertical Catalogs** (Enterprise only)
- Banner if Community: "Vertikale Kataloge sind ein Enterprise-Feature"
- Table (if Enterprise):
  - Name
  - Base Catalog
  - Customer (optional)
  - Industry (optional)
  - Status
  - Actions: Edit, Delete
- Add vertical catalog button

**Loading State:** Skeleton rows

**Empty State:** "No items" message with create button

---

#### `/compliance` - CompliancePage
**File:** `packages/frontend/src/pages/CompliancePage.tsx`

**Purpose:** View and manage compliance frameworks + requirements + mappings

**Data Sources:**
- `useFrameworks()` → GET `/api/v1/compliance/frameworks`
- `useRequirements(frameworkId)` → GET `/api/v1/compliance/frameworks/:id/requirements`
- `useMatrix()` → GET `/api/v1/compliance/frameworks/:id/matrix` (mappings)
- `useServiceDescriptions()` → for mapping selections

**License Banner:**
- If Community edition + frameworks count = 1:
  - Amber banner: "Limit von 1 Regulatorik-Framework erreicht. Upgrade auf Enterprise für mehr Frameworks."

**Layout: Tabs**

**Tab 1: Frameworks**
- Table:
  - Name
  - Version
  - Requirement Count (badge)
  - Effective Date
  - Status
  - Actions: Edit (inline form), Delete (AlertDialog)
- Add framework button → dialog:
  - Name (required)
  - Version (text, optional)
  - Description (textarea)
  - Effective Date (date picker)
  - Create button

**Tab 2: Controls/Requirements**
- Framework selector dropdown (to switch which framework viewing)
- Table:
  - Code (requirement ID)
  - Title
  - Category
  - Description
  - Actions: Edit, Delete
- Add requirement button → dialog:
  - Code (required)
  - Title (required)
  - Description (textarea)
  - Category (select)
  - Create button

**Tab 3: Mappings**
- Requirement-to-Service mappings
- Framework selector dropdown
- Table:
  - Requirement Code
  - Service Code
  - Coverage Level (select: covered, partially_covered, not_covered)
  - Evidence Notes (text)
  - Actions: Edit (inline), Delete
- Add mapping button → dialog:
  - Requirement (select)
  - Service (select)
  - Coverage Level (select)
  - Evidence Notes (textarea)
  - Create button

**Tab 4: Matrix**
- Compliance matrix (Requirement × Service grid)
- Cells show coverage level + color coding
- Hover shows evidence
- Click cell to edit mapping

**Tab 5: Asset Coverage**
- Table of assets + framework coverage
- Columns: asset name, flagged (yes/no), reason, flagged date, actions
- Each asset row has flag/unflag buttons
- Mark/unmark compliance flag

**Tab 6: Dashboard** (Compliance Summary)
- Overall compliance score (percentage, color-coded)
- Gap analysis chart (uncovered requirements count)
- Completeness by category (bar chart)
- Top risks (table of uncovered high-priority requirements)

**Loading State:** Skeleton loaders

**Empty State:** "No frameworks" message with create button

---

#### `/knowledge-base` - KnowledgeBasePage
**File:** `packages/frontend/src/pages/KnowledgeBasePage.tsx`

**Purpose:** View and manage KB articles

**Data Sources:**
- `useKbArticles()` → GET `/api/v1/kb/articles?page=...&status=...&visibility=...`

**Table:**
- Columns:
  - Title (link to view/edit modal)
  - Category
  - Tags (comma-separated badges)
  - Visibility (badge: internal, public)
  - Status (badge: draft, published, archived)
  - View Count (number)
  - Last Updated (relative time)
  - Actions: Edit (modal), Delete (AlertDialog)
- Sortable, paginated
- Search filter (title + category)
- Visibility filter (all / internal / public)
- Status filter (all / draft / published / archived)
- Category dropdown

**Action Buttons:**
- **+ New Article** → dialog:
  - Title (required)
  - Category (select)
  - Tags (comma-separated text)
  - Content (markdown textarea with preview)
  - Visibility (radio: internal / public)
  - Status (select: draft, published)
  - Create button
- **Refresh**

**Edit Dialog:**
- Same fields as create, with current values pre-filled
- Save button

**Loading State:** Skeleton rows

**Empty State:** "No articles" message with create button

---

#### `/known-errors` - KnownErrorsPage
**File:** `packages/frontend/src/pages/KnownErrorsPage.tsx`

**Purpose:** View and manage known errors (KB-like, but linked to incidents)

**Data Sources:**
- `useKnownErrors()` → GET `/api/v1/known-errors?page=...&status=...&q=...`

**Table:**
- Columns:
  - Title (link to view modal)
  - Status (badge: identified, workaround_available, resolved)
  - Workaround (text, truncated)
  - Affected Tickets (count)
  - Created (relative time)
  - Actions: Edit (modal), Delete (AlertDialog)
- Sortable, paginated
- Search filter
- Status filter

**Action Buttons:**
- **+ New Known Error** → dialog:
  - Title (required)
  - Description (textarea)
  - Symptoms (textarea)
  - Workaround (textarea, optional)
  - Status (select)
  - Create button
- **Refresh**

**Edit Dialog:**
- Same fields, pre-filled
- Save button

**Loading State:** Skeleton rows

**Empty State:** "No known errors" message with create button

---

#### `/monitoring` - MonitoringPage
**File:** `packages/frontend/src/pages/MonitoringPage.tsx`

**Purpose:** View and manage monitoring sources + events

**Data Sources:**
- `useMonitoringSources()` → GET `/api/v1/monitoring/sources`
- `useMonitoringEvents()` → GET `/api/v1/monitoring/events?page=...&status=...`
- `useMonitoringEventStats()` → summary stats

**Layout: Tabs**

**Tab 1: Sources**
- Table:
  - Name
  - Type (badge: checkmk_v1, checkmk_v2, zabbix, prometheus, etc)
  - Status (badge: active / inactive)
  - Last Event (relative time)
  - Actions: Edit (inline form), Delete (AlertDialog), Test button
- Add source button → dialog:
  - Name (required)
  - Type (select)
  - Config (JSON textarea, varies by type)
  - Is Active (toggle)
  - Create button

**Tab 2: Events**
- Stat cards (top):
  - Total Events (count, blue)
  - Open Events (count, red)
  - Acknowledged (count, yellow)
- Table:
  - Hostname (link to asset if matched)
  - Service Name
  - State (badge: ok, warning, critical, unknown)
  - Output (text, truncated)
  - Matched Asset (asset name, if auto-matched)
  - Matched Ticket (ticket number, if auto-created incident)
  - Timestamp (relative)
  - Actions: Acknowledge (button), Link Asset (dialog), Link Ticket (dialog), Delete (AlertDialog)
- Filter by state (all / ok / warning / critical / unknown)
- Filter by acknowledged (all / acknowledged / unacknowledged)
- Pagination

**Tab 3: Integration Config**
- Display webhook URLs for inbound events
- Copy button for webhook URLs
- Type-specific instructions (e.g., for Check_MK, Zabbix, etc)

**Loading State:** Skeleton loaders

**Empty State:** "No sources/events" message

---

#### `/projects` - ProjectsPage
**File:** `packages/frontend/src/pages/ProjectsPage.tsx`

**Purpose:** View and manage projects

**Data Sources:**
- `useProjects()` → GET `/api/v1/projects`
- `useCustomers()` → for customer select in create dialog

**Table:**
- Columns:
  - Code (link to detail)
  - Name
  - Customer (if set)
  - Status
  - Start Date
  - End Date
  - Asset Count (badge)
  - Actions: Edit (inline form), Delete (AlertDialog)
- Search filter (code + name)
- Status filter (all / active / completed / on_hold)
- Pagination

**Action Buttons:**
- **+ New Project** → dialog:
  - Code (required)
  - Name (required)
  - Description (textarea)
  - Customer (select, optional)
  - Status (select)
  - Start Date (date picker)
  - End Date (date picker)
  - Create button
- **Refresh**

**Loading State:** Skeleton rows

**Empty State:** "No projects" message with create button

---

#### `/projects/:id` - ProjectDetailPage
**File:** `packages/frontend/src/pages/ProjectDetailPage.tsx`

**Purpose:** View and manage project details

**Data Sources:**
- `useProject(id)` → GET `/api/v1/projects/:id`
- `useProjectAssets(id)` → GET `/api/v1/projects/:id/assets`

**Layout: Tabs**

**Tab 1: Overview**
- Header with back button, project code, project name
- Two-column:
  
  **Left:**
  - Code (text, editable)
  - Name (text, editable)
  - Description (textarea, editable)
  - Status (select, editable)
  - Customer (select, editable)

  **Right:**
  - Start Date (date picker, editable)
  - End Date (date picker, editable)
  - Duration (calculated, read-only)
  - Progress (percentage, progress bar)
  - Created (timestamp)
  - Last Updated (timestamp)

- Action buttons:
  - Save (if editing)
  - Delete (AlertDialog)

**Tab 2: Assets**
- Table of project assets
- Columns: asset name, type, status, SLA tier, created
- Add asset button → AssetPickerDialog
- Remove asset button (per row)

**Loading State:** Skeleton loaders

**Error State:** Red alert

---

#### `/capacity-planning` - CapacityPlanningPage
**File:** `packages/frontend/src/pages/CapacityPlanningPage.tsx`

**Purpose:** Capacity planning and utilization analysis

**Data Sources:**
- `useCapacityUtilization()` → GET `/api/v1/capacity/utilization`
- `useCompatibleHosts()` → GET `/api/v1/capacity/compatible-hosts?asset_id=...`
- `useMigrationCheck()` → GET `/api/v1/capacity/migration-check?source=...&target=...`
- `useOverprovisionedAssets()` → GET `/api/v1/capacity/overprovisioned`
- `useCapacityTypes()` → for capacity metric types
- `useAssets()` → for asset selection

**Layout: Tabs**

**Tab 1: Overview**
- Utilization Overview table:
  - Asset name
  - Capacity type
  - Current usage (%)
  - Threshold (%)
  - Status (badge: ok, warning, critical)
  - Progress bar (color-coded by utilization %)
- Filter by asset + capacity type
- Pagination

**Tab 2: Trends**
- LineChart (from Recharts) showing utilization over time
- Select asset + capacity type from dropdowns
- X-axis: date
- Y-axis: utilization %
- Alert bands for warning/critical thresholds

**Tab 3: Migration Analysis**
- Source Asset (select)
- Target Asset (select)
- Check button → calls migration API
- Results:
  - Compatible (yes/no)
  - Estimated downtime
  - Risk assessment
  - Recommendation

**Tab 4: Overprovisioned Assets**
- Table of assets using significantly less than provisioned capacity
- Columns: asset name, capacity type, current usage %, recommendation
- Cost savings estimate (total)

**Loading State:** Skeleton loaders

**Empty State:** "No data" message

---

#### `/reports/sla` - SlaReportsPage
**File:** `packages/frontend/src/pages/SlaReportsPage.tsx`

**Purpose:** SLA performance reporting

**Data Sources:**
- `useSlaPerformanceReport()` → GET `/api/v1/sla/performance-report?time_range=...&ticket_type=...`

**Report Sections:**

1. **Summary Stat Cards**
   - On-Time Delivery % (green if > 95%)
   - SLA Breaches (count, red)
   - Average Response Time (duration)
   - Average Resolution Time (duration)

2. **SLA Performance by Ticket Type**
   - Table:
     - Ticket Type
     - On-Time % (progress bar)
     - Breaches (count)
     - Avg Response (duration)
     - Avg Resolution (duration)

3. **Performance Trend Chart**
   - LineChart showing on-time % over last 30 days
   - Target SLA line (horizontal)

4. **Breach Analysis**
   - Table of breached tickets:
     - Ticket Number
     - Title
     - Type
     - Response Due (red if past)
     - Resolution Due (red if past)
     - Days Overdue (number)

**Filters:**
- Time Range (select: last 7 days, last 30 days, last 90 days, custom range)
- Ticket Type (select: all / incident / change / problem)
- SLA Tier (select: all / platinum / gold / silver / bronze)
- Priority (select: all / critical / high / medium / low)

**Export Button:** Download as CSV/PDF

**Loading State:** Skeleton loaders

---

#### `/cab` - CabBoardPage
**File:** `packages/frontend/src/pages/CabBoardPage.tsx`

**Purpose:** Change Advisory Board (CAB) approval workflow

**Data Sources:**
- `useCabPending()` → GET `/api/v1/cab/pending` (pending approvals)
- `useCabAll()` → GET `/api/v1/cab/all` (all CAB decisions, paginated)
- `useCabDecision()` → PATCH decision (approve/reject/defer)

**Layout: Tabs**

**Tab 1: Pending**
- Table of pending CAB decisions
- Columns:
  - Ticket Number (link to ticket detail)
  - Title
  - Type (badge: change / rfc)
  - Risk Level (badge: low, medium, high, critical)
  - Requested By (user name)
  - Requested Date (relative time)
  - Actions: Make Decision (button)
- Empty state if no pending items

**Tab 2: All Decisions**
- Table of all CAB decisions (paginated)
- Columns:
  - Ticket Number
  - Title
  - Decision (badge: approved, rejected, deferred)
  - Decided By (user name)
  - Decided Date (relative time)
  - Reason (text, truncated)
- Filter by decision (all / approved / rejected / deferred)
- Pagination

**Decision Dialog:**
- Triggered by "Make Decision" button on pending item
- Shows:
  - Ticket title + number
  - Risk Matrix (2D grid of impact × likelihood)
  - Risk Assessment (text)
  - Recommendation (text)
- Form fields:
  - Decision (radio: approved / rejected / deferred)
  - Reason (textarea)
  - Decide button

**Loading State:** Skeleton rows

**Empty State:** "No pending CAB items" message

---

### Settings Routes

#### `/settings` - SettingsLayout
**File:** `packages/frontend/src/pages/settings/SettingsLayout.tsx`

**Purpose:** Settings section container with sidebar navigation

**Navigation Sidebar:**
1. General Settings
2. Account Settings
3. Tenant Settings
4. Users & Groups
5. Customers
6. SLA Settings
7. Notification Settings
8. Escalation Rules
9. Audit Log
10. Asset Types
11. Relation Types
12. Classifications
13. Capacity Types
14. Service Profiles
15. System Settings

All settings pages follow same pattern:
- Settings heading in header
- Sidebar navigation (above on mobile, left on desktop)
- Content area with form/table

---

#### `/settings/general` - GeneralSettingsPage
**File:** `packages/frontend/src/pages/settings/GeneralSettingsPage.tsx`

**Purpose:** General application settings

**Form Sections:**
1. **Branding**
   - App Name (text)
   - App Logo (file upload)
   - Primary Color (color picker)
   - Save button

2. **Localization**
   - Default Language (select: de, en)
   - Date Format (select)
   - Time Format (select)
   - Timezone (select)
   - Save button

3. **Regional**
   - Country (select)
   - Phone Number Format (select)
   - Currency (select)
   - Save button

---

#### `/settings/account` - AccountSettingsPage
**File:** `packages/frontend/src/pages/settings/AccountSettingsPage.tsx`

**Purpose:** Personal account settings

**Form Sections:**

1. **Profile**
   - Display Name (text, editable)
   - Email (text, read-only)
   - Language Preference (select: de, en)
   - Save button

2. **Password**
   - Current Password (password input)
   - New Password (password input)
   - Confirm Password (password input)
   - Change Password button (POST `/api/v1/auth/change-password`)
   - Success toast

3. **Two-Factor Auth** (if Enterprise)
   - Enable/disable toggle
   - Setup instructions (if enabling)
   - Recovery codes (downloadable)

---

#### `/settings/tenant` - TenantSettingsPage
**File:** `packages/frontend/src/pages/settings/TenantSettingsPage.tsx`

**Purpose:** Tenant-wide settings (admin only)

**Form Sections:**

1. **Tenant Info**
   - Name (text, editable)
   - Slug (text, read-only)
   - Save button

2. **License**
   - Current Edition (badge: community / enterprise)
   - License Status (valid until / expired)
   - License Key (text area, paste to activate enterprise)
   - Activate License button
   - Feature matrix (table showing enabled features)

3. **Tenant Settings**
   - Auto-close resolved tickets after X days (number input)
   - Default SLA Tier (select)
   - Enable email inbound (toggle)
   - Save button

---

#### `/settings/users` - UsersSettingsPage
**File:** `packages/frontend/src/pages/settings/UsersSettingsPage.tsx`

**Purpose:** User and group management

**Layout: Tabs**

**Tab 1: Users**
- Table:
  - Display Name
  - Email
  - Role (badge: admin / manager / agent / viewer)
  - Is Active (toggle)
  - Last Login (relative time)
  - Actions: Edit (inline form), Delete (AlertDialog)
- Search filter (name + email)
- Role filter (all / admin / manager / agent / viewer)
- Add User button → dialog:
  - Email (required)
  - Display Name (required)
  - Password (required, or generate random)
  - Role (select)
  - Send Invitation (toggle)
  - Create button
- Import Users button → CSV upload dialog
- Pagination

**Tab 2: Groups**
- Table:
  - Group Name
  - Members Count (badge)
  - Type (badge: functional / team / etc)
  - Created (relative time)
  - Actions: Edit (inline form), Delete (AlertDialog)
- Add Group button → dialog:
  - Name (required)
  - Type (select)
  - Members (multi-select from users)
  - Create button
- Pagination

**Loading State:** Skeleton rows

---

#### `/settings/customers` - CustomersSettingsPage
**File:** `packages/frontend/src/pages/settings/CustomersSettingsPage.tsx`

**Purpose:** Customer management from settings

**Table:**
- Columns:
  - Name
  - Industry
  - Contact Email
  - Is Active (toggle)
  - Assets (count)
  - Tickets (count)
  - Actions: Edit (inline form), Delete (AlertDialog)
- Search filter
- Status filter (all / active / inactive)
- Add Customer button → dialog
- Pagination

---

#### `/settings/sla` - SlaSettingsPage
**File:** `packages/frontend/src/pages/settings/SlaSettingsPage.tsx`

**Purpose:** SLA tier definitions and rules

**Table:**
- Columns:
  - SLA Tier (platinum, gold, silver, bronze, none)
  - Response Time (hours, editable)
  - Resolution Time (hours, editable)
  - Priority Multiplier (number, editable)
  - Is Default (toggle)
  - Actions: Edit, Delete
- Edit rows inline (click cell to edit)
- Save All button
- SLA calculation explanation (collapsible)

---

#### `/settings/notifications` - NotificationSettingsPage
**File:** `packages/frontend/src/pages/settings/NotificationSettingsPage.tsx`

**Purpose:** Notification settings

**Form Sections:**

1. **Notification Channels**
   - Email (toggle)
   - SMS (toggle, if configured)
   - In-App (toggle)
   - Slack (toggle, if configured)
   - Save button

2. **Event Subscriptions**
   - Ticket Created (checkbox)
   - Ticket Assigned (checkbox)
   - Ticket Status Changed (checkbox)
   - SLA Breach (checkbox)
   - Workflow Step (checkbox)
   - Comment Added (checkbox)
   - Save button

3. **Escalation Preferences**
   - Email After X minutes (number)
   - Escalate to Manager (checkbox)
   - Save button

---

#### `/settings/escalation` - EscalationSettingsPage
**File:** `packages/frontend/src/pages/settings/EscalationSettingsPage.tsx`

**Purpose:** Escalation rules

**Table:**
- Columns:
  - Trigger (e.g., "Open ticket >4 hours")
  - Action (e.g., "Notify manager")
  - Is Active (toggle)
  - Actions: Edit, Delete
- Add Escalation Rule button → dialog:
  - Trigger (select: open ticket X hours, sla breach, no assignee, etc)
  - Action (select: notify user / group, assign ticket, create incident, etc)
  - Create button
- Pagination

---

#### `/settings/audit` - AuditLogPage
**File:** `packages/frontend/src/pages/settings/AuditLogPage.tsx`

**Purpose:** Audit trail of system changes

**Table:**
- Columns:
  - Timestamp (relative)
  - User (name)
  - Action (e.g., "Created ticket", "Updated asset", "Changed SLA", etc)
  - Resource (ticket number / asset ID / etc)
  - Details (what changed, in JSON or key: old → new format)
- Filter by resource type (all / tickets / assets / workflows / etc)
- Filter by action (all / created / updated / deleted)
- Filter by user (all / list of users)
- Date range picker (from / to)
- Search (by resource ID or user name)
- Export CSV button
- Pagination

---

#### `/settings/asset-types` - AssetTypesSettingsPage
**File:** `packages/frontend/src/pages/settings/AssetTypesSettingsPage.tsx`

**Purpose:** Define asset types

**Table:**
- Columns:
  - Name
  - Slug (identifier)
  - Category (badge)
  - Icon
  - Schema (preview)
  - Actions: Edit (modal), Delete (AlertDialog)
- Add Asset Type button → dialog:
  - Name (required)
  - Slug (auto-filled from name, editable)
  - Category (select: compute, network, storage, application, etc)
  - Icon (emoji picker or icon select)
  - Schema (JSON textarea, for custom attributes)
  - Create button
- Pagination

---

#### `/settings/relation-types` - RelationTypesSettingsPage
**File:** `packages/frontend/src/pages/settings/RelationTypesSettingsPage.tsx`

**Purpose:** Define asset relation types

**Table:**
- Columns:
  - Name
  - Direction (single / bidirectional)
  - Description
  - Actions: Edit, Delete
- Add Relation Type button → dialog:
  - Name (required)
  - Direction (select: single / bidirectional)
  - Description (textarea)
  - Create button

---

#### `/settings/classifications` - ClassificationSettingsPage
**File:** `packages/frontend/src/pages/settings/ClassificationSettingsPage.tsx`

**Purpose:** Asset classification models

**Table:**
- Columns:
  - Model Name
  - Dimensions (count)
  - Assets Tagged (count)
  - Actions: Edit, Delete
- Add Classification button → dialog:
  - Name (required)
  - Dimensions (list of dimension values, multi-line text)
  - Create button

---

#### `/settings/capacity-types` - CapacityTypesSettingsPage
**File:** `packages/frontend/src/pages/settings/CapacityTypesSettingsPage.tsx`

**Purpose:** Define capacity metric types

**Table:**
- Columns:
  - Name (e.g., "CPU (%)", "Memory (GB)", "Disk (GB)")
  - Unit
  - Threshold Warning (%)
  - Threshold Critical (%)
  - Actions: Edit, Delete
- Add Capacity Type button → dialog:
  - Name (required)
  - Unit (select: %, GB, Mbps, cores, etc)
  - Threshold Warning (number, %)
  - Threshold Critical (number, %)
  - Create button

---

#### `/settings/service-profiles` - ServiceProfilesSettingsPage
**File:** `packages/frontend/src/pages/settings/ServiceProfilesSettingsPage.tsx`

**Purpose:** Service SLA profiles (variants)

**Table:**
- Columns:
  - Profile Name
  - Base Service (service code)
  - Response Time (hours)
  - Resolution Time (hours)
  - Actions: Edit, Delete
- Add Profile button → dialog:
  - Name (required)
  - Base Service (select)
  - Response Time (number)
  - Resolution Time (number)
  - Create button

---

#### `/settings/system` - SystemSettingsPage
**File:** `packages/frontend/src/pages/settings/SystemSettingsPage.tsx`

**Purpose:** System-level settings (Super-Admin only)

**Form Sections:**

1. **Database**
   - DB Type (read-only: PostgreSQL or SQLite)
   - Connection String (masked, read-only)

2. **Mail Server**
   - SMTP Host (text)
   - SMTP Port (number)
   - SMTP User (text)
   - SMTP Password (password)
   - From Address (email)
   - Test Email button (sends test email)
   - Save button

3. **Monitoring Webhook**
   - Webhook URL (display + copy button)
   - Webhook Secret (display + regenerate button)

4. **Maintenance**
   - Database Backup (button → triggers backup download)
   - Clear Cache (button → clears query cache)
   - Rebuild Search Index (button)

---

### Portal Routes (Customer self-service)

#### `/portal/login` - PortalLoginPage
**File:** `packages/frontend/src/pages/portal/PortalLoginPage.tsx`

**Purpose:** Portal login (separate from main app)

**Form:**
- Email (text, required)
- Password (password, required)
- Tenant Slug (text, required — which customer's portal)
- Login button → POST `/api/v1/portal/auth/login`
- Error handling (red alert)

**Storage:** Token + user info saved to localStorage (`portalAuth` key)

---

#### `/portal` - PortalLayout
**File:** `packages/frontend/src/pages/portal/PortalLayout.tsx`

**Purpose:** Portal page layout

**Header:**
- OpsWeave logo + "Customer Portal" badge
- Navigation links: Tickets, KB, Help
- User dropdown menu (Display Name, Logout)

**Content:**
- Outlet (PortalTicketsPage or PortalTicketDetailPage or PortalKbPage)

---

#### `/portal/tickets` - PortalTicketsPage
**File:** `packages/frontend/src/pages/portal/PortalTicketsPage.tsx`

**Purpose:** Customer's tickets view

**Data Sources:**
- `portalApi.getTickets()` → GET `/api/v1/portal/tickets` (customer-scoped)
- `portalApi.getServices()` → GET `/api/v1/portal/services` (for new ticket form)

**Layout:**

1. **Create Ticket Button** (top-right)
   - Opens dialog:
     - Service (select)
     - Title (text, required)
     - Description (textarea)
     - Priority (select: low, medium, high, critical)
     - Create button

2. **Ticket List**
   - Table:
     - Ticket Number (link to detail)
     - Title
     - Status (badge)
     - Priority (badge)
     - Created (relative time)
     - Last Updated (relative time)
   - Search filter (title + number)
   - Status filter (all / open / in_progress / pending / resolved / closed)
   - Pagination

**Loading State:** Skeleton rows

**Empty State:** "No tickets" message with create button

---

#### `/portal/tickets/:id` - PortalTicketDetailPage
**File:** `packages/frontend/src/pages/portal/PortalTicketDetailPage.tsx`

**Purpose:** Customer's ticket detail view

**Data Sources:**
- `portalApi.getTicket(id)` → GET `/api/v1/portal/tickets/:id`
- `portalApi.getTicketComments(id)` → GET `/api/v1/portal/tickets/:id/comments`
- `portalApi.addComment()` → POST `/api/v1/portal/tickets/:id/comments`

**Content:**

1. **Header**
   - Back button (to `/portal/tickets`)
   - Ticket Number + Title
   - Status badge (read-only)
   - Priority badge

2. **Main Content**
   - Description (read-only, markdown rendered)
   - Created timestamp
   - Last updated timestamp

3. **Comments Section**
   - List of comments (sorted by date desc):
     - Author name
     - Comment content (markdown rendered)
     - Timestamp (relative)
   - Add comment form:
     - Textarea for comment
     - Submit button (Post Comment)
   - Loading state while submitting

**Error State:** Red alert with retry

---

#### `/portal/kb` - PortalKbPage
**File:** `packages/frontend/src/pages/portal/PortalKbPage.tsx`

**Purpose:** Public knowledge base (customer self-service)

**Data Sources:**
- `portalApi.getKbArticles()` → GET `/api/v1/portal/kb/articles` (visibility='public' only)

**Layout:**

1. **Search Box** (prominent, top)
   - Search by title + content

2. **Category Filter** (sidebar)
   - List of categories (links)
   - "All" category (default)

3. **Article Grid/List**
   - Each article card shows:
     - Title (link to view)
     - Category
     - Tags (badges)
     - Preview text (first 100 chars)
     - View count
     - Click card → view full article in modal or page

4. **Article View Modal/Page**
   - Title (heading)
   - Category + Tags
   - Article content (markdown rendered)
   - Related Articles (if linked in DB)
   - Close button

**Loading State:** Skeleton cards

**Empty State:** "No articles" message

---

## Core UI Components Library

All components from `packages/frontend/src/components/ui/` are from shadcn/ui:

- Button (variants: default, destructive, outline, secondary, ghost, link)
- Input (text, email, password, number, etc)
- Textarea
- Label
- Card (CardHeader, CardTitle, CardContent, CardFooter, CardDescription)
- Badge (variants: default, secondary, destructive, outline, warning, success)
- Skeleton (placeholder loader)
- Separator
- Avatar (with AvatarImage, AvatarFallback)
- Dialog (DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter)
- AlertDialog (AlertDialogHeader, AlertDialogTitle, etc — confirmation dialogs)
- Dropdown Menu (DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, etc)
- Select (SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel)
- Tabs (TabsList, TabsTrigger, TabsContent)
- Table (TableHeader, TableBody, TableRow, TableCell, TableHead)
- Tooltip (TooltipProvider, TooltipTrigger, TooltipContent)
- Switch (toggle checkbox)
- Checkbox (checkbox input)
- Progress (progress bar)

---

## Reusable Components

**Layout Components:**
- `ProtectedLayout` — wrapper for authenticated pages (sidebar + header)
- `Sidebar` — left navigation with collapsible toggle
- `Header` — top bar with search, theme toggle, language toggle, notifications, user menu
- `PortalLayout` — portal page wrapper

**Dialog/Modal Components:**
- `AssetPickerDialog` — modal to select/search assets
- Generic dialogs (created inline with shadcn Dialog component)

**Form Components:**
- `DynamicFormRenderer` — renders form fields based on JSON schema (for asset attribute creation)
- `DynamicFieldDisplay` — renders asset attribute values

**Compliance Components:**
- `ControlsTab` — compliance framework controls/requirements table
- `AuditsTab` — compliance audit trail
- `EvidenceTab` — compliance mapping evidence
- `CrossMappingsTab` — framework to framework mappings
- `ComplianceDashboardTab` — compliance summary + KPIs

**Error Handling:**
- `ErrorBoundary` — catches React errors and displays fallback UI

---

## State Management

**Zustand Stores:**
- `useAuthStore` — authentication (user, isAuthenticated, login, logout, error, isLoading)
- `useThemeStore` — theme (light/dark/system)

**TanStack Query (React Query):**
- Query keys namespaced by resource (e.g., `ticketKeys.all`, `assetKeys.list(params)`)
- Automatic caching + refetching
- useQuery for GET operations
- useMutation for POST/PATCH/DELETE operations
- Invalidate queries on mutation success

**Portal Auth:**
- Custom localStorage-based auth (separate from main app)
- `getPortalAuth()`, `setPortalAuth()`, `clearPortalAuth()` functions in `api/portal.ts`

---

## Data Flow Patterns

**Typical List Page Flow:**
1. useState for filters + pagination
2. useMemo to build query params from filter state
3. useQuery with params to fetch data
4. useQueryClient + useMutation for create/update/delete actions
5. onSuccess callback invalidates related queries
6. Component re-renders with fresh data

**Typical Detail Page Flow:**
1. useParams to get ID from URL
2. useQuery to fetch single resource by ID
3. useQuery to fetch related data (comments, history, etc)
4. useMutation for PATCH/DELETE on the resource
5. useNavigate to redirect on success
6. toast.success() for user feedback

**API Calls:**
- All API calls go through `apiClient` (instance of wrapper around fetch)
- `apiClient.get()`, `apiClient.post()`, `apiClient.patch()`, `apiClient.delete()`, `apiClient.put()`
- Automatic JWT token injection (via Authorization header)
- Single response wrapper unwrapping (convert `{ data: T }` → `T`)
- Error handling (throw ApiRequestError with message)

---

## Forms & Validation

**Patterns:**
- useState for form field state
- onChange handlers to update state
- Form submit → call mutation function
- useQuery to load dropdown options
- isLoading state from mutation → disable form inputs + show spinner on button
- Inline validation (min length, required, etc)
- Error messages displayed in red alert boxes

**Validation Examples:**
- Title: minimum 5 characters
- Email: HTML5 email validation
- IP Address: regex validation (IPv4/IPv6)
- Dropdown selects: required (browser HTML5)
- Textarea: optional or required

---

## i18n Keys

**Common Namespaces:**
- `common` — shared UI text (actions, status, generic labels)
- `tickets` — ticket-specific (statuses, priorities, types)
- `cmdb` — asset/CMDB (asset types, SLA tiers, environments)
- `workflows` — workflow-specific
- `services` — service catalog
- `compliance` — compliance/regulatory
- `settings` — settings pages
- `portal` — portal-specific (customer facing)

**Examples:**
- `t('actions.create')` → "Erstellen"
- `t('tickets:statuses.open')` → "Offen"
- `t('cmdb:types.server_virtual')` → "Virtueller Server"
- `t('dashboard.welcome')` → "Willkommen"

---

## Accessibility & Testing

**Test IDs:**
- `data-testid="page-{name}"` on page root (e.g., `data-testid="page-dashboard"`)
- `data-testid="btn-{action}"` on buttons (e.g., `data-testid="btn-create-ticket"`)
- `data-testid="input-{field}"` on inputs (e.g., `data-testid="input-email"`)
- `data-testid="nav-{section}"` on navigation links
- `data-testid="card-{type}"` on cards
- `data-testid="error-{context}"` on error messages

**ARIA Labels:**
- All icon-only buttons have `aria-label`
- Form labels linked via `htmlFor`
- Tables have proper THead/TBody structure
- Dropdowns use Select component (accessible by default)

**Keyboard Navigation:**
- All buttons focusable (Tab key)
- Enter to click buttons/submit forms
- Escape to close dialogs
- Arrow keys in dropdowns/selects

---

## Performance Optimizations

- **Code Splitting:** Lazy-loaded settings pages (Suspense + fallback skeleton)
- **Query Caching:** TanStack Query caches frequently accessed data
- **Virtual Lists:** (not currently used, but potential for large lists)
- **Memoization:** useMemo for derived state (filter params, type name lookups)
- **Debouncing:** (not currently used, but recommended for search inputs)

---

## Error Handling

**Patterns:**
1. **Query Errors:**
   - `isError` flag from useQuery
   - Display red alert card with message
   - Retry button calls `refetch()`

2. **Mutation Errors:**
   - Catch error in onError callback
   - toast.error(error.message)
   - Form stays visible for retry

3. **Network Errors:**
   - ApiRequestError thrown from apiClient
   - Shown as toast or inline alert

4. **Validation Errors:**
   - Inline error messages near form fields
   - Form inputs visually marked (red border potential)

---

## Loading States

**Patterns:**
1. **Full-Page Load:** Skeleton loaders matching layout (cards, rows, etc)
2. **Form Submit:** Spinner on button + disabled inputs
3. **Modal Open:** Dialog appears immediately, content loads inside
4. **List Pagination:** Skeleton rows while loading new page
5. **Charts:** Skeleton rectangle matching chart height

---

## Empty States

**Patterns:**
- Icon (e.g., Ticket, Server, FileText)
- Message text (e.g., "Keine Tickets gefunden")
- Call-to-action button (e.g., "+ Neues Ticket")
- Centered in container (flex, space-y, text-center)

---

## Responsive Design

- **Mobile-first Tailwind approach**
- **Breakpoints:**
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1536px
- **Common Patterns:**
  - Single column on mobile, multi-column on desktop
  - Sidebar hidden/collapsed on mobile, visible on desktop
  - Full-width on mobile, max-w-6xl on desktop
  - Grid auto-responsive (md:grid-cols-2, lg:grid-cols-4, etc)

---

**End of UI Map**

This comprehensive inventory captures every page, form, table, dropdown, button, and data source in the OpsWeave frontend. Use this as a reference for QA, feature development, documentation, or code review.