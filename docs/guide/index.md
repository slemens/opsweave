# Was ist OpsWeave?

OpsWeave ist ein modulares, asset-zentriertes **Open-Source IT Service Management System** (ITSM).
Es bildet ITIL-konforme Prozesse (Incident, Problem, Change) ab und verknüpft diese über eine CMDB
mit Serviceverträgen, Regulatorik-Mapping und einem integrierten Kundenportal.

## Kernprinzipien

**Asset-zentriert:** Das Asset (CI) ist die zentrale Entität. Alles — Tickets, SLAs, Verträge,
Compliance — referenziert Assets.

**Multi-Tenant:** Mehrere Kunden/Organisationen auf einer Instanz. Strikte Datenisolation
via `tenant_id` auf jeder Tabelle.

**API-first:** Jede Funktion ist über REST steuer- und abrufbar. Die UI konsumiert dieselbe
API wie externe Integrationen.

**Docker-first:** `docker run` für Einzelinstanz (SQLite), `docker compose up` für Production
(PostgreSQL + Redis).

## Architektur

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

## Tech-Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind v4 |
| UI-Komponenten | shadcn/ui, Radix UI |
| i18n | react-i18next (DE + EN) |
| Backend | Node.js, Express 5, TypeScript |
| ORM | Drizzle ORM (PostgreSQL + SQLite) |
| Auth | Lokale Accounts (JWT), OIDC (Enterprise) |
| Queue | BullMQ + Redis (Multi) / better-queue (Single) |
| Container | Docker, Docker Compose |

## Geschäftsmodell

OpsWeave folgt dem Freemium-Modell (analog zu Check_MK):

| Feature | Community | Enterprise |
|---------|-----------|------------|
| Assets | ≤ 50 | Unbegrenzt |
| Benutzer | ≤ 5 | Unbegrenzt |
| Tickets | Unbegrenzt | Unbegrenzt |
| CMDB | Vollständig | Vollständig |
| Workflows | ≤ 3 Templates | Unbegrenzt |
| Service Katalog | Basis | Vollständig |
| Compliance | 1 Framework | Alle |
| Auth | Lokal | + OIDC/SAML |
| Support | Community | Kommerziell |

Die Enterprise-Lizenz ist ein offline-validierbares JWT (RS256) — kein Lizenzserver,
kein Internet-Zugang nötig.

## Nächste Schritte

- [Installation →](/guide/installation)
- [Quick Start →](/guide/quickstart)
- [Lizenzierung →](/guide/licensing)
