# Changelog

All notable changes to OpsWeave will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
