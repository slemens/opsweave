# OpsWeave — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React SPA)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Ticket   │ │  CMDB    │ │ Workflow │ │ Service  │   ...     │
│  │ Board    │ │  Graph   │ │ Designer │ │ Catalog  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └─────────────┴─── react-i18next (de/en) ┘               │
│                         │ REST + WebSocket                      │
└─────────────────────────┼───────────────────────────────────────┘
                          │
         ┌────────────────┴─────────────────┐
         │                                  │
    Single-Container                  Multi-Container
    (docker run)                      (docker compose)
         │                                  │
         ▼                            ┌─────┴─────┐
┌─────────────────┐                   │   NGINX   │ :80
│  Node.js :8080  │                   └──┬─────┬──┘
│  Express +      │              /api/*  │     │  /*
│  Static Files   │                ┌─────┘     └─────┐
│  SQLite         │                ▼                  ▼
│  better-queue   │         ┌──────────┐       ┌──────────┐
└─────────────────┘         │ BACKEND  │       │ FRONTEND │
                            │ Express  │       │ Vite     │
                            │ :3000    │       │ :5173    │
                            └────┬─────┘       └──────────┘
                                 │
                            ┌────┴────┐
                            │ BullMQ  │
                            └────┬────┘
                          ┌──────┴──────┐
                          ▼              ▼
                    ┌──────────┐  ┌──────────┐
                    │PostgreSQL│  │  Redis   │
                    │  :5432   │  │  :6379   │
                    └──────────┘  └──────────┘
```

## Dual-Database Strategy

```
                     ┌──────────────────────┐
                     │   Drizzle ORM        │
                     │   (DB-agnostic)      │
                     └─────────┬────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              DB_DRIVER=pg          DB_DRIVER=sqlite
                    │                     │
              ┌─────┴─────┐        ┌─────┴─────┐
              │PostgreSQL │        │  SQLite   │
              │ + Redis   │        │ (file)    │
              │ + BullMQ  │        │ + better  │
              │           │        │   -queue  │
              └───────────┘        └───────────┘
              Multi-Container       Single-Container
              Production            Quick Start
```

### Compatibility Rules
- All queries via Drizzle ORM — NO raw SQL except in `/lib/db-specific/`
- ENUM → varchar + Zod validation (SQLite has no ENUMs)
- INET → varchar(45), TEXT[] → JSON text, TIMESTAMPTZ → ISO 8601 text
- BOOLEAN → integer (0/1) for SQLite compatibility
- UUIDs generated in application layer (not DB-generated)

## Freemium License Enforcement

```
Request Flow:
                                    ┌───────────┐
   POST /api/v1/assets  ──────────► │  License  │
                                    │  Guard    │
                                    │ Middleware │
                                    └─────┬─────┘
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                         Under Limit              Over Limit
                         (< 50 assets)            (≥ 50 assets)
                              │                       │
                              ▼                       ▼
                        ┌──────────┐          ┌──────────────┐
                        │ Continue │          │ 403 Response │
                        │ to       │          │ ASSET_LIMIT  │
                        │ Handler  │          │ _REACHED     │
                        └──────────┘          │ + upgrade    │
                                              │   info       │
                                              └──────────────┘

Limits (Community Edition):
  Assets:     50
  Users:       5
  Workflows:   3
  Frameworks:  1
  Monitoring:  1 source

Enterprise: Unlimited (activated via license key)
```

## i18n Flow

```
┌──────────────┐     Accept-Language: de
│   Browser    │ ──────────────────────────► API Response in German
│              │     Accept-Language: en
│ i18next      │ ──────────────────────────► API Response in English
│ (frontend)   │
│              │     User.language = 'de'
│ locales/     │ ──────────────────────────► Stored preference
│  ├── de/     │                             takes priority
│  └── en/     │
└──────────────┘

Priority: User Setting > Accept-Language Header > System Default (de)
```

## Data Flow: Check_MK → Auto-Incident

```
Check_MK Event (CRIT)
    │
    ▼
POST /api/v1/monitoring/events
    │
    ▼
┌─ Event Processing ─────────────────────────────────────┐
│  1. Validate webhook secret                            │
│  2. Match asset: hostname/IP → CMDB lookup             │
│  3. Dedup: Open incident for same asset+service?       │
│     → YES: Append comment, skip ticket creation        │
│     → NO: Continue                                     │
│  4. Create incident with:                              │
│     • SLA from asset → service chain                   │
│     • Priority from state mapping (CRIT→critical)      │
│  5. Instantiate workflow if template matches            │
│  6. WebSocket push to frontend                         │
└────────────────────────────────────────────────────────┘
```

## SLA Inheritance Validation

```
Asset: VM "app-server-01" (SLA: Gold)
    │
    ├── runs_on ──► Cluster "vmw-cluster-01" (Gold) ✅
    │                   ├── member_of ──► Host "esxi-01" (Bronze) ⚠️
    │                   └── member_of ──► Host "esxi-02" (Gold) ✅
    │
    ├── stored_on ──► Storage "san-01" (Silver) ⚠️
    └── connected_to ──► Switch "sw-core-01" (Gold) ✅

Result: 2 conflicts → Warning displayed in UI (no blocking)
```

## Service Catalog: 3-Tier Resolution

```
┌─ Vertical Catalog: "Banking Edition" ──────────────────┐
│  Base: Horizontal "Managed Linux Server"               │
│                                                         │
│  Overrides:                                            │
│    REPLACE: SD-PATCH-001 → SD-PATCH-DORA-001           │
│    ADD:     SD-AUDIT-BANKING-001                       │
│    REMOVE:  SD-REMOTE-001                              │
│                                                         │
│  Effective = Horizontal − Removes + Adds + Replaces    │
│                                                         │
│  Linked Assets: app-server-01, db-server-02            │
└─────────────────────────────────────────────────────────┘
```
