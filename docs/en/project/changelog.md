# Changelog

All notable changes to OpsWeave are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

::: tip GitHub Releases
All releases with download packages: [GitHub Releases](https://github.com/slemens/opsweave/releases)
:::

## [0.4.1] - 2026-03-10

### Added
- **Create Ticket Page**: Full page instead of dialog for ticket creation with RFC fields
- **CAB Board**: Change Advisory Board with Pending/All tabs and decision workflow (Approve/Reject/Defer)
- **Monitoring Page**: Event dashboard with status cards, source management, and event table

### Fixed
- SQLite boolean binding for `cab_required` (integer instead of boolean)
- Navigate error after removal of the create ticket dialog

## [0.4.0] - 2026-03-10

### Added
- **ITIL Phase B**: Monitoring events UI, service request subtypes, SLA performance reports
- **KB Search**: Full-text search in the knowledge base
- **CAB Foundation**: Backend endpoints for CAB decisions

## [0.3.9] - 2026-03-10

### Added
- **Notification System**: Toast notifications for ticket updates and SLA warnings

## [0.3.8] - 2026-03-10

### Added
- **Escalation Management**: Escalation levels (L1-L3) with target group and justification
- **Known Error Database (KEDB)**: Creation, editing, and search of known errors

## [0.3.7] - 2026-03-10

### Added
- **Major Incident Management**: Declaration, incident commander, bridge call URL
- **Root Cause Analysis**: Root cause analysis on problem tickets

## [0.3.6] - 2026-03-10

### Added
- **Parent-Child Tickets**: Hierarchical ticket linking with close blocking
- **Ticket Categories**: Categorization with inline creation

## [0.3.5] - 2026-03-10

### Added
- **RFC Fields for Changes**: Justification, risk assessment, implementation plan, rollback plan
- **SLA Definitions**: Gold/Silver/Bronze tiers with configurable times

## [0.3.4] - 2026-03-10

### Added
- **Service Requests**: Separate ticket type with subtypes (Standard)
- **Ticket List View**: Sortable columns, SLA indicators, pagination

## [0.3.3] - 2026-03-10

### Added
- **Impact x Urgency Matrix**: Automatic priority calculation per ITIL
- **SLA Tracking Improvements**: Breach indicators in board and list

## [0.3.2] - 2026-03-10

### Changed
- **Documentation cleanup**: ~15 markdown files in root consolidated into structured `docs/` folders
- CHANGELOG updated with all missing release entries (v0.2.0-v0.3.1)

## [0.3.1] - 2026-03-10

### Added
- **Searchable Asset Picker**: Dialog with search, filters (type/status/customer) and pagination replaces dropdown
- **Batch Ticket Updates**: Multi-select in list view for bulk changes (status/priority/assignment, max. 100)
- **User Bulk Import**: CSV upload with drag-and-drop, preview, validation, and credential display
- **Settings Sub-Routes**: Settings page split into lazy-loaded sub-pages

### Fixed
- React Hooks order in TicketListView
- Email poller startup race condition with exponential backoff
- Version display in sidebar from package.json

## [0.3.0] - 2026-03-10

### Added
- **Production Readiness Audit**: 51 of 60 findings resolved
- **Dockerfile.single**: Cross-platform multi-stage build for single-container deployment

### Fixed
- Docker build: Root workspace lockfile, tsconfig.base.json in context, npm install for Rollup compatibility
- CI: GHCR push permissions, release workflow permissions
- Lint: Unused imports removed

## [0.2.0] - 2026-03-09

### Added
- **CMDB**: Asset CRUD, DAG relations with cycle detection, SLA inheritance, topology graph (React Flow + dagre)
- **Workflow Engine**: Template designer, step types (Form/Routing/Approval/Condition/Automatic), runtime engine
- **Service Catalog**: 3-tier model (Descriptions → Horizontal → Vertical Catalogs), asset-service links
- **Compliance**: Regulatory frameworks, requirements, compliance matrix, gap analysis
- **Email Inbound**: IMAP poller, webhook support, thread matching, auto-ticket creation
- **Knowledge Base**: Markdown articles with internal/public visibility, ticket linking
- **Customer Portal**: Separate auth, ticket view/creation/comments, public KB articles
- **Dashboard**: KPI cards, ticket charts (Recharts)
- **Enterprise License**: RSA keypair validation, vertical catalogs
- **SLA Management**: Definitions, tier assignments, breach tracking
- **Admin Settings**: Backend configuration, license management, system settings UI
- **Customers**: Customer management with SLA assignments, clickable KPI cards
- **Ticket Enhancements**: List view with sortable columns, preset filters, inline editing
- **CMDB Enhancements**: Category filter, asset search
- **CI/CD**: GitHub Actions for CI, E2E tests, docs deployment
- **Documentation**: VitePress site, branding assets, OpenAPI spec

### Fixed
- API response envelope handling in frontend
- Compliance and service catalog seed data
- E2E test stability (12 failed tests fixed)
- Community license limit banner

## [0.1.0] - 2026-03-09

### Added
- **Multi-Tenant Foundation**: Complete multi-tenant architecture with tenant_id isolation
- **Authentication**: Local auth with JWT tokens, tenant switching, bcrypt password hashing
- **User Management**: Tenant-scoped user CRUD, role-based access (Admin/Manager/Agent/Viewer)
- **Group Management**: Assignee groups with member management and group-based ticket routing
- **Ticket Management**: Incident/Problem/Change CRUD with auto-numbering, comments, audit trail, Kanban board
- **CMDB Schema**: Complete asset and relations data model
- **Dual-Database Support**: PostgreSQL (production) and SQLite (single-container) via Drizzle ORM
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui, dark mode, i18n, responsive layout
- **Licensing**: Offline JWT-based license validation with community limits
- **Docker**: Single-container (SQLite) and multi-container (PostgreSQL + Redis) deployment
- **i18n**: Complete German and English translations
- **API**: RESTful API with OpenAPI spec
- **Seed Data**: Demo tenant with sample data
