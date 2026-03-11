# What is OpsWeave?

OpsWeave is a modular, asset-centric **open-source IT Service Management system** (ITSM).
It maps ITIL-compliant processes (Incident, Problem, Change) and links them via a CMDB
with service agreements, regulatory mapping, and an integrated customer portal.

![OpsWeave Dashboard](/screenshots/dashboard.png)

## Core Principles

**Asset-centric:** The asset (CI) is the central entity. Everything — tickets, SLAs, contracts,
compliance — references assets.

**Multi-Tenant:** Multiple customers/organizations on a single instance. Strict data isolation
via `tenant_id` on every table.

**API-first:** Every function is accessible and controllable via REST. The UI consumes the same
API as external integrations.

**Docker-first:** `docker run` for a single instance (SQLite), `docker compose up` for production
(PostgreSQL + Redis).

## Architecture

```
┌─────────────────────────────────────────┐
│         React 19 + Tailwind v4          │  Frontend
│         TypeScript, shadcn/ui, i18n     │
└──────────────────┬──────────────────────┘
                   │ REST API
┌──────────────────┴──────────────────────┐
│        Express 5 + TypeScript           │  Backend
│        Drizzle ORM (PG + SQLite)        │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   PostgreSQL 16          SQLite 3
   + Redis (BullMQ)       (Single-Container)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind v4 |
| UI Components | shadcn/ui, Radix UI |
| i18n | react-i18next (DE + EN) |
| Backend | Node.js, Express 5, TypeScript |
| ORM | Drizzle ORM (PostgreSQL + SQLite) |
| Auth | Local accounts (JWT), OIDC (Enterprise) |
| Queue | BullMQ + Redis (Multi) / better-queue (Single) |
| Container | Docker, Docker Compose |

## Business Model

OpsWeave follows a freemium model (similar to Check_MK):

| Feature | Community | Enterprise |
|---------|-----------|------------|
| Assets | ≤ 50 | Unlimited |
| Users | ≤ 5 | Unlimited |
| Tickets | Unlimited | Unlimited |
| CMDB | Full | Full |
| Workflows | ≤ 3 Templates | Unlimited |
| Service Catalog | Basic | Full |
| Compliance | 1 Framework | All |
| Auth | Local | + OIDC/SAML |
| Support | Community | Commercial |

The Enterprise license is an offline-verifiable JWT (RS256) — no license server,
no internet access required.

## Next Steps

- [Installation →](/en/guide/installation)
- [Quick Start →](/en/guide/quickstart)
- [Licensing →](/en/guide/licensing)
