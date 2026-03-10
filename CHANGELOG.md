# Changelog

All notable changes to OpsWeave will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2026-03-10

### Changed
- **Documentation Cleanup**: Consolidated ~15 root markdown files into structured `docs/` directory
  - Moved `architecture.md` → `docs/development/architecture.md`
  - Moved `ITIL_COMPLIANCE.md` → `docs/ITIL_COMPLIANCE.md`
  - Consolidated `TODO.md` + `TODO_BACKLOG.md` → `docs/ROADMAP.md`
  - Removed obsolete tracking files (PROGRESS.md, BUGS.md, AUDIT_RESULTS.md)
- Updated CHANGELOG with all missing release entries (v0.2.0–v0.3.1)

## [0.3.1] - 2026-03-10

### Added
- **Searchable Asset Picker**: Replaced dropdown with dialog featuring search, filters (type/status/customer), and pagination
- **Batch Ticket Updates**: Multi-select in list view with bulk status/priority/assignee changes (max 100)
- **Bulk User Import**: CSV upload with drag-and-drop, preview, validation, and credential display
- **Settings Sub-Routes**: Split monolithic settings page into lazy-loaded sub-pages

### Fixed
- React hooks order error in TicketListView (useCallback before early returns)
- Email poller startup race condition with exponential backoff (M-06)
- Version display in sidebar from package.json (C-06)

## [0.3.0] - 2026-03-10

### Added
- **Production Readiness Audit**: 51 of 60 findings resolved
- **Dockerfile.single**: Cross-platform multi-stage build for single-container deployment

### Fixed
- Docker build: root workspace lockfile, tsconfig.base.json in context, npm install for rollup compatibility
- CI: GHCR push permissions, release workflow permissions
- Lint: removed unused imports across codebase

## [0.2.0] - 2026-03-09

### Added
- **CMDB (Phase 2)**: Full asset CRUD, DAG relations with cycle detection, SLA inheritance, topology graph (React Flow + dagre)
- **Workflow Engine (Phase 3)**: Template designer, step types (form/routing/approval/condition/automatic), runtime engine
- **Service Catalog (Phase 4)**: 3-tier model (descriptions → horizontal → vertical catalogs), asset-service links
- **Compliance (Phase 4)**: Regulatory frameworks, requirements, compliance matrix, gap analysis
- **Email Inbound (Phase 5)**: IMAP poller, webhook support, thread matching, auto-ticket creation
- **Knowledge Base (Phase 7)**: Markdown articles with internal/public visibility, ticket linking
- **Customer Portal (Phase 5)**: Separate auth, ticket view/create/comment, public KB access
- **Dashboard (Phase 7)**: KPI cards, ticket charts (Recharts)
- **Enterprise License**: RSA keypair validation, vertical catalogs, advanced features
- **SLA Management**: Definitions, tier assignments, breach tracking
- **Admin Settings**: Backend config, license management, system settings UI
- **Customers**: Customer management with SLA assignments, clickable KPI cards
- **Ticket Enhancements**: List view with sortable columns, preset filters, inline editing
- **CMDB Enhancements**: Category filter buttons, asset search
- **CI/CD**: GitHub Actions for CI, E2E tests, docs deployment
- **Docs**: VitePress documentation site, branding assets, OpenAPI spec

### Fixed
- API response envelope handling across frontend
- Compliance and service catalog seed data
- E2E test stability (12 failing tests fixed)
- Community license limit banners

## [0.1.0] - 2026-03-09

### Added
- **Multi-Tenant Foundation**: Full multi-tenant architecture with tenant_id isolation on all entities
- **Authentication**: Local auth with JWT tokens, tenant switching, bcrypt password hashing
- **User Management**: Tenant-scoped user CRUD, role-based access (admin/manager/agent/viewer)
- **Group Management**: Assignee groups with member management and group-based ticket routing
- **Ticket Management**: Full incident/problem/change CRUD with:
  - Auto-generated ticket numbers (INC/CHG/PRB-YYYY-NNNNN)
  - Comment system with internal/external visibility
  - Full audit trail (ticket history)
  - Kanban board view grouped by status
  - Ticket statistics and board data endpoints
- **CMDB Schema**: Complete asset and relation data model (ready for Phase 2)
- **Dual-Database Support**: PostgreSQL (production) and SQLite (single-container) via Drizzle ORM
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui
  - Dark mode support
  - Internationalization (German/English)
  - Responsive layout with sidebar navigation
  - Ticket board (Kanban) and detail views
  - Settings page with license usage meters
  - Login page
- **Licensing**: Offline JWT-based license validation with community limits
  - 50 assets, 5 users, 3 workflows, 1 framework, 1 monitoring source
- **Docker**: Single-container (SQLite) and multi-container (PostgreSQL + Redis) deployment
- **i18n**: Full German and English translations, user-switchable
- **API**: RESTful API with OpenAPI spec at /api/v1/
- **Seed Data**: Demo tenant with sample users, groups, and tickets
