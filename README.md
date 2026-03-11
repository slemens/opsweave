<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="docs/public/logo.svg" />
    <img src="docs/public/logo.svg" alt="OpsWeave Logo" width="120" />
  </picture>
</p>

<h1 align="center">OpsWeave</h1>

<p align="center">
  <strong>Weaving your IT operations together — asset-centric, workflow-powered.</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#editions">Editions</a> •
  <a href="#documentation">Docs</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/release-v0.4.6-orange?style=flat-square" alt="Release" />
  <img src="https://github.com/slemens/opsweave/actions/workflows/ci.yml/badge.svg" alt="CI" />
  <img src="https://img.shields.io/badge/i18n-de%20%7C%20en-blue?style=flat-square" alt="Languages" />
</p>

---

## What is OpsWeave?

OpsWeave is a modular, asset-centric IT Service Management platform. It combines ITIL-aligned processes (Incident, Problem, Change) with a powerful CMDB, service catalog, compliance mapping, and workflow automation — all in a single, easy-to-deploy application.

**Everything revolves around the asset.** Every ticket, SLA, service contract, and compliance requirement links back to assets in the CMDB. This gives you full context at a glance — when an incident comes in, you immediately see the affected infrastructure, applicable SLAs, regulatory requirements, and service agreements.

<p align="center">
  <img src="docs/public/screenshots/dashboard.png?v=2" alt="OpsWeave Dashboard" width="800" />
</p>

### Kanban Board

<p align="center">
  <img src="docs/public/screenshots/ticket-board.png?v=2" alt="Ticket Kanban Board" width="800" />
</p>

### Ticket Detail

<p align="center">
  <img src="docs/public/screenshots/ticket-detail.png?v=2" alt="Ticket Detail View" width="800" />
</p>

### CMDB & Asset Topology

<p align="center">
  <img src="docs/public/screenshots/cmdb-table.png?v=2" alt="CMDB Asset Table" width="800" />
</p>

<p align="center">
  <img src="docs/public/screenshots/cmdb-topology.png?v=2" alt="CMDB Topology Graph" width="800" />
</p>

### Workflow Designer

<p align="center">
  <img src="docs/public/screenshots/workflow-detail.png?v=2" alt="Workflow Designer" width="800" />
</p>

## Quick Start

**Single container — up and running in 30 seconds:**

```bash
docker run -d \
  -p 8080:8080 \
  -v opsweave-data:/data \
  --name opsweave \
  ghcr.io/slemens/opsweave:latest
```

Open [http://localhost:8080](http://localhost:8080) and log in with `admin@opsweave.local` / `changeme`.

**Production deployment with PostgreSQL:**

```bash
git clone https://github.com/slemens/opsweave.git
cd opsweave
cp .env.example .env    # Edit with your settings
docker compose up -d
```

## Features

### 🎫 Ticket Management
- Incident, Problem, and Change processes
- Kanban board with drill-down views (by type → group → ticket)
- Drag & drop ticket routing between assignee groups
- Full audit trail and comment system
- SLA tracking with automatic breach detection

### 🗄️ CMDB (Configuration Management Database)
- Asset-centric data model with typed relationships
- Directed Acyclic Graph (DAG) — assets can have multiple parents
- Typed edges: `runs_on`, `connected_to`, `stored_on`, `powered_by`, etc.
- **SLA inheritance validation** — automatically detects when a Gold-SLA VM runs on Bronze-SLA infrastructure
- Interactive graph visualization

### ⚙️ Workflow Engine
- Visual workflow designer (drag & drop)
- Step types: Forms, Routing, Approvals, Conditions, Automations
- Automatic workflow instantiation based on ticket type/subtype
- Timeout-based escalation

### 📋 Service Catalog (3-Tier)
- **Service Descriptions** — atomic building blocks defining what you do (and don't do)
- **Horizontal Catalog** — standard service bundles
- **Vertical Catalogs** — industry-specific overrides (e.g., Banking Edition with DORA-compliant patching)
- Direct linking to CMDB assets

### ✅ Compliance & Regulatory Mapping
- Framework management (DORA, NIS2, ISO 27001, BSI C5, ...)
- Map requirements to service descriptions
- Compliance matrix with gap analysis
- Flag assets under specific regulatory scope

### 📡 Monitoring Integration
- Check_MK webhook integration (auto-creates incidents)
- Asset matching via hostname/IP
- Event deduplication (no incident spam)
- Extensible for Zabbix, Prometheus, etc.

### 🌐 Built for Teams
- **Multi-language**: German (default) and English, switchable per user
- **REST API**: Every function is API-accessible — automate everything
- **OIDC Authentication**: Azure AD, Keycloak, Okta (Enterprise)
- **Role-based access**: Admin, Manager, Agent, Viewer

## Editions

| | Community | Enterprise |
|---|:---:|:---:|
| **Price** | Free | Contact us |
| **Assets** | 50 | Unlimited |
| **Users** | 5 | Unlimited |
| **Tickets** | ∞ | ∞ |
| **CMDB** | ✅ Full | ✅ Full |
| **Workflow Templates** | 3 | ∞ |
| **Service Catalog** | Basic | Full (vertical catalogs) |
| **Compliance Frameworks** | 1 | ∞ |
| **Auth** | Local | + OIDC/SAML |
| **Monitoring Sources** | 1 | ∞ |
| **API** | ✅ Full | ✅ Full |

The Community Edition is fully functional — no artificial feature gates. Enterprise adds scale and enterprise authentication.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui, React Flow
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (production) or SQLite (single-container)
- **ORM:** Drizzle ORM (supports both databases)
- **Auth:** Local accounts + OIDC (Enterprise)
- **Queue:** BullMQ + Redis (production) or better-queue (single-container)
- **i18n:** react-i18next (frontend) + i18next (backend)
- **Testing:** Vitest + Playwright

## Documentation

Full documentation is available at **[https://slemens.github.io/opsweave](https://slemens.github.io/opsweave)**

- [What is OpsWeave?](docs/guide/index.md)
- [Installation](docs/guide/installation.md)
- [Quick Start](docs/guide/quickstart.md)
- [Licensing](docs/guide/licensing.md)
- [API Reference](docs/api/index.md)
- [Architecture](docs/development/architecture.md)

## API

OpsWeave is API-first. Every function available in the UI is also available via REST API.

```bash
# List all incidents
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/tickets?ticket_type=incident

# Create an asset
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"web-server-01","asset_type":"server_virtual","sla_tier":"gold"}' \
  http://localhost:8080/api/v1/assets

# Check SLA conflicts for an asset
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/assets/{id}/sla-chain
```

Full OpenAPI specification is auto-generated and available at `/api/v1/docs`.

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

- **Issues:** Bug reports and feature requests via GitHub Issues
- **PRs:** Fork → Branch → PR (English, conventional commits)
- **Discussions:** GitHub Discussions for questions and ideas

## License

OpsWeave is licensed under the [GNU Affero General Public License v3.0](LICENSE).

---

<p align="center">
  Made with ❤️ for the ITSM community
</p>
