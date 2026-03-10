# Changelog

Alle wichtigen Änderungen an OpsWeave werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
und das Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

::: tip GitHub Releases
Alle Releases mit Download-Paketen: [GitHub Releases](https://github.com/slemens/opsweave/releases)
:::

## [0.3.2] - 2026-03-10

### Geändert
- **Dokumentation aufgeräumt**: ~15 Markdown-Dateien im Root konsolidiert in strukturierte `docs/`-Ordner
- CHANGELOG mit allen fehlenden Release-Einträgen (v0.2.0–v0.3.1) aktualisiert

## [0.3.1] - 2026-03-10

### Neu
- **Durchsuchbarer Asset-Picker**: Dialog mit Suche, Filtern (Typ/Status/Kunde) und Paginierung ersetzt Dropdown
- **Batch-Ticket-Updates**: Mehrfachauswahl in der Listenansicht für Massenänderungen (Status/Priorität/Zuweisung, max. 100)
- **Benutzer-Massenimport**: CSV-Upload mit Drag-and-Drop, Vorschau, Validierung und Credential-Anzeige
- **Settings Sub-Routen**: Einstellungsseite in lazy-loaded Unterseiten aufgeteilt

### Behoben
- React Hooks-Reihenfolge in TicketListView
- Email-Poller Startup Race Condition mit Exponential Backoff
- Versionsanzeige in der Sidebar aus package.json

## [0.3.0] - 2026-03-10

### Neu
- **Production Readiness Audit**: 51 von 60 Findings behoben
- **Dockerfile.single**: Cross-Platform Multi-Stage Build für Single-Container Deployment

### Behoben
- Docker Build: Root Workspace Lockfile, tsconfig.base.json im Context, npm install für Rollup-Kompatibilität
- CI: GHCR Push Permissions, Release Workflow Permissions
- Lint: Ungenutzte Imports entfernt

## [0.2.0] - 2026-03-09

### Neu
- **CMDB**: Asset CRUD, DAG-Relationen mit Zykluserkennung, SLA-Vererbung, Topologie-Graph (React Flow + dagre)
- **Workflow Engine**: Template-Designer, Step-Typen (Form/Routing/Approval/Condition/Automatic), Runtime Engine
- **Service Katalog**: 3-Tier-Modell (Beschreibungen → Horizontale → Vertikale Kataloge), Asset-Service-Links
- **Compliance**: Regulatorik-Frameworks, Anforderungen, Compliance-Matrix, Gap-Analyse
- **E-Mail Inbound**: IMAP-Poller, Webhook-Support, Thread-Matching, Auto-Ticket-Erstellung
- **Wissensdatenbank**: Markdown-Artikel mit interner/öffentlicher Sichtbarkeit, Ticket-Verknüpfung
- **Kundenportal**: Separate Auth, Ticket-Ansicht/-Erstellung/-Kommentare, öffentliche KB-Artikel
- **Dashboard**: KPI-Karten, Ticket-Charts (Recharts)
- **Enterprise-Lizenz**: RSA-Keypair-Validierung, Vertikale Kataloge
- **SLA-Management**: Definitionen, Tier-Zuweisungen, Breach-Tracking
- **Admin-Einstellungen**: Backend-Konfiguration, Lizenzverwaltung, System-Settings UI
- **Kunden**: Kundenverwaltung mit SLA-Zuweisungen, klickbare KPI-Karten
- **Ticket-Erweiterungen**: Listenansicht mit sortierbaren Spalten, Preset-Filter, Inline-Editing
- **CMDB-Erweiterungen**: Kategorie-Filter, Asset-Suche
- **CI/CD**: GitHub Actions für CI, E2E-Tests, Docs-Deployment
- **Dokumentation**: VitePress-Site, Branding-Assets, OpenAPI-Spec

### Behoben
- API-Response-Envelope-Handling im Frontend
- Compliance und Service-Catalog Seed-Daten
- E2E-Test-Stabilität (12 fehlgeschlagene Tests behoben)
- Community-Lizenz-Limit-Banner

## [0.1.0] - 2026-03-09

### Neu
- **Multi-Tenant Foundation**: Vollständige Multi-Tenant-Architektur mit tenant_id-Isolation
- **Authentifizierung**: Lokale Auth mit JWT-Tokens, Tenant-Switching, bcrypt Passwort-Hashing
- **Benutzerverwaltung**: Tenant-scoped User CRUD, Rollenbasierter Zugriff (Admin/Manager/Agent/Viewer)
- **Gruppenverwaltung**: Bearbeiter-Gruppen mit Mitgliederverwaltung und gruppenbasiertem Ticket-Routing
- **Ticket-Management**: Incident/Problem/Change CRUD mit Auto-Nummern, Kommentaren, Audit-Trail, Kanban-Board
- **CMDB-Schema**: Vollständiges Asset- und Relations-Datenmodell
- **Dual-Database-Support**: PostgreSQL (Produktion) und SQLite (Single-Container) via Drizzle ORM
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui, Dark Mode, i18n, responsive Layout
- **Lizenzierung**: Offline JWT-basierte Lizenzvalidierung mit Community-Limits
- **Docker**: Single-Container (SQLite) und Multi-Container (PostgreSQL + Redis) Deployment
- **i18n**: Vollständige deutsche und englische Übersetzungen
- **API**: RESTful API mit OpenAPI Spec
- **Seed-Daten**: Demo-Tenant mit Beispieldaten
