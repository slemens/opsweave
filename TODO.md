# OpsWeave — Audit TODO

> Ergebnis des vollstandigen Repository-Audits (2026-03-09).
> Priorisiert nach Schweregrad. Jeder Eintrag referenziert betroffene Dateien.

---

## CRITICAL — Vor Production zwingend fixen

- [ ] **AUTH-01: Hardcoded JWT Secret im Portal-Service**
  Portal nutzt eigene `JWT_SECRET`-Variable mit unsicherem Fallback statt zentralem `config.jwtSecret`.
  - `packages/backend/src/modules/portal/portal.service.ts:25-26`
  - Fix: `config.jwtSecret` aus `config/index.ts` importieren, eigene Konstante entfernen

- [ ] **AUTH-02: Default-Secrets in Production erlaubt**
  Kein Startup-Check verhindert `change-me-in-production` als JWT/Session-Secret.
  - `packages/backend/src/config/index.ts:88-89`
  - Fix: In `bootstrap()` validieren — wenn `NODE_ENV=production` UND Secrets = Default → `process.exit(1)`

- [ ] **AUTH-03: JWT-Token in localStorage (XSS-Risiko)**
  Zustand persist speichert Token unverschlusselt in localStorage. Jede XSS-Lucke = Session Hijack.
  - `packages/frontend/src/stores/auth-store.ts:109-117`
  - Fix: Migration zu HttpOnly Secure Cookies oder zumindest Risiko dokumentieren + CSP harten

- [ ] **AUTH-04: Tenant-Switch ohne Re-Auth**
  `switchTenant()` andert nur lokalen State — JWT enthalt weiterhin alten `activeTenantId`. Server vertraut JWT-Claims → Cross-Tenant-Datenleck moglich.
  - `packages/frontend/src/stores/auth-store.ts:88-89`
  - Fix: `switchTenant` muss `POST /api/v1/auth/switch-tenant` aufrufen und neuen JWT erhalten

- [ ] **TEST-01: Null Unit-Test-Coverage**
  CLAUDE.md fordert 80% Coverage. Aktuell: 0% Unit-Tests. Nur 5 E2E-Specs existieren.
  - Betrifft: gesamter `packages/backend/src/` und `packages/frontend/src/`
  - Fix: Vitest aufsetzen, kritische Services zuerst (auth, tickets, SLA, license)

---

## HIGH — Nachste 2 Wochen

### Sicherheit

- [ ] **SEC-01: Kein Rate-Limiting auf Login-Endpoints**
  Globaler Limiter (1000 req/15min) ist zu permissiv fur Auth. Brute-Force moglich.
  - `packages/backend/src/server.ts:85-97`
  - Fix: Separater `rateLimit({ limit: 5 })` fur `/api/v1/auth/login` und `/api/v1/portal/auth/login`

- [ ] **SEC-02: LIKE-Wildcard-Injection in Suche**
  Suchparameter `q` wird nicht escaped — `%` und `_` werden als SQL-Wildcards interpretiert.
  - `packages/backend/src/modules/tickets/tickets.service.ts:128-134`
  - Auch in: `assets.service.ts`, `kb.service.ts`, `portal.service.ts`
  - Fix: `escapeLike()`-Funktion: `str.replace(/[%_\\]/g, '\\$&')`

- [ ] **SEC-03: Fehlende Security-Header in Nginx**
  Kein CSP, kein X-Frame-Options, kein HSTS, kein X-Content-Type-Options.
  - `infra/nginx/nginx.conf`
  - Fix: Headers hinzufugen (CSP, DENY, HSTS max-age=31536000, nosniff)

- [ ] **SEC-04: Auth-Fehlermeldung leakt SSO-Status**
  "This account uses external authentication" verrat Angreifern welche Accounts SSO nutzen.
  - `packages/backend/src/modules/auth/auth.service.ts:181-203`
  - Fix: Alle Login-Fehler einheitlich mit "Invalid email or password" beantworten

- [ ] **SEC-05: Fehlende UNIQUE-Constraint auf Portal-Email**
  Doppelte Emails pro Tenant moglich → Login gibt falschen User zuruck.
  - `packages/backend/src/db/schema/customers.ts` (customerPortalUsers)
  - Fix: `UNIQUE(tenant_id, email)` Constraint hinzufugen + Migration

### Datenintegritat

- [ ] **DATA-01: Race Condition bei Ticket-Nummern**
  Zwei gleichzeitige Requests konnen dieselbe Nummer generieren (SELECT max → INSERT ohne Lock).
  - `packages/backend/src/modules/tickets/tickets.service.ts:40-76`
  - `packages/backend/src/modules/email-inbound/email.service.ts:80-102`
  - `packages/backend/src/modules/portal/portal.service.ts:308-324`
  - Fix: DB-Level Sequence oder atomares Counter-Update mit Exclusive Lock

- [ ] **DATA-02: `'system'` als User-FK ist ungultig**
  `author_id: 'system'` und `created_by: 'system'` verletzen referenzielle Integritat.
  - `packages/backend/src/modules/email-inbound/email.service.ts:485`
  - `packages/backend/src/modules/portal/portal.service.ts`
  - Fix: System-User im Seed anlegen (echte UUID), in Config referenzieren

- [ ] **DATA-03: Duplizierte Ticket-Nummern-Logik (DRY)**
  Selbe Generierungslogik in 3 Dateien copy-pasted.
  - Fix: Extrahieren nach `packages/backend/src/lib/ticket-number.ts`, in allen 3 Stellen importieren

### Performance

- [ ] **PERF-01: N+1 Query in Asset-Relations**
  Schleife fetcht jedes verknupfte Asset einzeln statt Batch-Query.
  - `packages/backend/src/modules/assets/assets.service.ts:378-413`
  - Fix: `inArray(assets.id, sourceIds)` statt Loop

- [ ] **PERF-02: Unbounded User-Liste (limit: 100)**
  Frontend hardcoded `limit: 100` — bei mehr Usern fehlen Eintrage in Dropdowns.
  - `packages/frontend/src/api/tickets.ts:312-328`
  - Fix: Pagination + Server-Side Search fur User/Customer-Dropdowns

---

## MEDIUM — Nachste 4 Wochen

### Backend

- [ ] **MED-01: Strukturiertes Logging einfuhren**
  Aktuell nur `console.log/error`. Kein JSON-Format, keine Log-Level, keine Correlation-IDs.
  - Betrifft: gesamter Backend-Code
  - Fix: pino installieren, Logger-Instanz pro Request mit requestId

- [ ] **MED-02: Health-Check erweitern**
  `/system/health` pruft nicht DB-Konnektivitat oder Queue-Status.
  - `packages/backend/src/modules/system/system.controller.ts`
  - Fix: DB-Ping + Queue-Status + Email-Worker-Status in Health-Response

- [ ] **MED-03: Pagination-Bounds serverseitig validieren**
  Zod-Schema existiert mit `max(maxLimit)`, aber nicht alle Controller nutzen es.
  - Betrifft: alle `*.controller.ts` mit List-Endpoints
  - Fix: `paginationSchema` konsequent in jedem List-Endpoint validieren

- [ ] **MED-04: X-Request-ID Header validieren**
  Akzeptiert beliebige Strings → Log-Injection moglich.
  - `packages/backend/src/middleware/request-id.ts:19`
  - Fix: Nur UUID-Format akzeptieren, sonst eigene generieren

- [ ] **MED-05: Email-Worker Retry + Alerting**
  Poll-Fehler werden geloggt aber nicht retried. Kein Alert an Admin bei Dauerausfall.
  - `packages/backend/src/modules/email-inbound/email-poll.worker.ts:119-123`
  - Fix: Exponential Backoff, Failure-Counter, Config nach N Fehlern deaktivieren

- [ ] **MED-06: Non-null Assertions durch Validierung ersetzen**
  `return created!` nach INSERT ohne Prufung ob Row zuruckkam.
  - `packages/backend/src/modules/portal/portal.service.ts:362`
  - Fix: Null-Check + Fehler werfen wenn INSERT fehlschlagt

- [ ] **MED-07: npm-Audit-Vulnerabilities fixen**
  6 moderate Vulnerabilities (esbuild via drizzle-kit, vitepress).
  - Fix: `drizzle-kit` auf 0.31.9+ upgraden, `vitepress` updaten

### Frontend

- [ ] **MED-08: Query gcTime konfigurieren**
  Kein `gcTime` gesetzt — alte Query-Caches bleiben unbegrenzt im Speicher.
  - `packages/frontend/src/main.tsx:8-16`
  - Fix: `gcTime: 10 * 60 * 1000` (10 Minuten) setzen

- [ ] **MED-09: Request-Timeout im API-Client**
  Fetch-Requests haben kein Timeout — hangen bei langsamen Netzwerken ewig.
  - `packages/frontend/src/api/client.ts`
  - Fix: `AbortController` mit 30s Timeout

- [ ] **MED-10: React.memo auf Ticket-Board-Cards**
  Alle Karten re-rendern bei jeder State-Anderung → Janky DnD.
  - `packages/frontend/src/pages/TicketBoardPage.tsx`
  - Fix: Karten-Komponenten mit `React.memo()` wrappen

- [ ] **MED-11: CSRF-Schutz implementieren**
  Kein CSRF-Token-Handling im API-Client.
  - `packages/frontend/src/api/client.ts`
  - Fix: SameSite-Cookies (wenn AUTH-03 umgesetzt) oder X-CSRF-Token Header

- [ ] **MED-12: Locale in formatDate() aus User-Settings lesen**
  `formatDate()` hardcoded `locale = 'de-DE'` statt i18n-Context.
  - `packages/frontend/src/lib/utils.ts:12-26`
  - Fix: User-Sprache aus Auth-Store oder i18n-Instance lesen

- [ ] **MED-13: getTenantId() Silent Failure**
  Bei korruptem localStorage wird `null` zuruckgegeben — Requests ohne Tenant-Scope.
  - `packages/frontend/src/api/client.ts:36-47`
  - Fix: Warnung loggen, ggf. zum Login redirecten wenn tenantId fehlt

### Accessibility

- [ ] **A11Y-01: ARIA-Labels auf Icon-Only Buttons**
  Sidebar Collapse-Button und andere Icon-Buttons ohne Label.
  - `packages/frontend/src/components/layout/Sidebar.tsx`
  - Fix: `aria-label` und `aria-expanded` hinzufugen

- [ ] **A11Y-02: Farbe als einziger Status-Indikator**
  Status-Badges nutzen nur Farbe — Farbblinde konnen nicht unterscheiden.
  - `packages/frontend/src/pages/TicketDetailPage.tsx:92-98`
  - Fix: Icons zusatzlich zu Farben (z.B. Kreis, Pfeil, Haken)

---

## NICE TO HAVE — Backlog

- [ ] **NTH-01: JWT Key Rotation**
  Kein Mechanismus um JWT-Signing-Keys ohne Downtime zu rotieren.
  - Fix: Versionierte Keys mit Grace Period fur alte Tokens

- [ ] **NTH-02: Offline-Erkennung im Frontend**
  Keine Anzeige wenn User offline geht — Queries scheitern still.
  - Fix: `navigator.onLine` Listener + Banner-Komponente

- [ ] **NTH-03: Optimistic Locking fur gleichzeitige Edits**
  Last-Write-Wins bei parallelen Bearbeitungen → Datenverlust.
  - Fix: Version-Feld + ETag-Header + 409 Conflict bei Stale-Updates

- [ ] **NTH-04: PostgreSQL Connection Pool konfigurieren**
  Pool-Grosse nicht explizit gesetzt.
  - `packages/backend/src/config/database.ts`
  - Fix: `max`, `min`, `idleTimeoutMillis` konfigurierbar machen

- [ ] **NTH-05: Globale Suche uber Entitaten**
  Kein einheitlicher Suchendpoint fur Tickets + Assets + KB-Artikel.
  - Fix: `/api/v1/search?q=...` mit gewichteten Ergebnissen

- [ ] **NTH-06: Docker Image Versionierung**
  Keine Version/Git-SHA Labels in Dockerfiles.
  - `Dockerfile.single:35-38`
  - Fix: Build-Args `VERSION` + `GIT_SHA` als OCI-Labels

- [ ] **NTH-07: Query-Cache Invalidierung granularer machen**
  Manche Mutations invalidieren zu breit (`ticketKeys.all`).
  - Fix: Nur `ticketKeys.detail(id)` + `ticketKeys.lists()` invalidieren

---

## FEHLENDE FEATURES (laut CLAUDE.md Spec)

- [ ] **FEAT-00: License Activation Flow (End-to-End)**
  Kein funktionierender Aktivierungsweg fur Enterprise-Lizenzen.
  - Backend: `POST /api/v1/license/activate` ist auskommentiert (`routes/index.ts:57`)
  - Backend: `GET /api/v1/license` und `GET /api/v1/license/usage` fehlen komplett
  - Backend: Kein License-Controller/Service/Routes-Modul existiert
  - Frontend: License-Tab in SettingsPage nutzt `MOCK_LICENSE` Hardcoded-Daten
  - Frontend: Kein API-Hook fur License-Aktivierung oder Usage-Abfrage
  - Tenant-Service `updateTenant()` akzeptiert kein `license_key` Feld
  - Fix: License-Modul bauen (Controller + Service + Routes), Frontend anbinden, Aktivierungs-UI mit JWT-Key-Eingabe

- [ ] **FEAT-01: Notifications-Modul**
  In CLAUDE.md Projektstruktur gelistet, nicht implementiert.
  - Soll: In-App + Email-Benachrichtigungen, konfigurierbar pro User

- [ ] **FEAT-02: Workflow-Runtime-Engine**
  Templates + Steps existieren im Schema, aber keine Step-Ausfuhrung.
  - Soll: Form-Rendering, Routing-Logik, Approval-Flow, Auto-Aktionen, Timeout-Eskalation

- [ ] **FEAT-03: Monitoring Auto-Incident-Erstellung**
  Events werden gespeichert aber nicht verarbeitet.
  - Soll: Event→Asset-Matching, Auto-Incident mit Deduplizierung

- [ ] **FEAT-04: OIDC-Authentifizierung**
  Config-Felder existieren, Strategy nicht implementiert.
  - Soll: passport-openidconnect fur Azure AD, Keycloak, Okta

- [ ] **FEAT-05: Dashboard KPIs**
  DashboardPage existiert aber minimal.
  - Soll: Offene Tickets, SLA-Breaches, Compliance-Gaps, Trend-Charts

- [ ] **FEAT-06: Bulk-Operationen**
  Kein Multi-Select auf Listen.
  - Soll: Bulk-Close, Bulk-Assign, Bulk-Tag fur Tickets und Assets

- [ ] **FEAT-07: Export-Funktionalitat**
  Kein Datenexport moglich.
  - Soll: CSV/Excel-Export fur Tickets, Assets, Compliance-Matrix

- [ ] **FEAT-08: Auto-Assignment-Rules**
  Kein automatisches Ticket-Routing.
  - Soll: Regeln basierend auf Kategorie, Asset, SLA-Tier → automatische Gruppenzuweisung

- [ ] **FEAT-09: SLA-Breach Proaktive Alerts**
  Keine Warnung vor ablaufenden SLA-Deadlines.
  - Soll: Notification X Minuten vor Response/Resolve-Deadline

- [ ] **FEAT-10: Benutzerverwaltung (User Management UI)**
  Kein Admin-UI zum Verwalten von Benutzern. Users können nur per API/Seed erstellt werden.
  - Soll: Settings-Tab "Benutzer" mit CRUD (erstellen, bearbeiten, deaktivieren, Rolle ändern)
  - User-Liste mit Name, Email, Rolle, Status, letzter Login
  - Passwort-Reset durch Admin
  - Tenant-Membership-Verwaltung (User zu Tenant hinzufügen/entfernen)
  - Rolle pro Tenant setzen (admin, manager, agent, viewer)
  - Backend: `GET/POST /api/v1/users`, `GET/PUT/DELETE /api/v1/users/:id`
  - Frontend: SettingsPage Tab "Benutzer" mit Tabelle + Create/Edit Dialog

---

## ARCHITEKTUR-EMPFEHLUNGEN (fur 10x Scale / 5+ Jahre)

- [ ] **ARCH-01: Strukturierter Logger (pino)**
  `console.log` durch pino mit JSON-Output, Trace-IDs, Log-Levels ersetzen

- [ ] **ARCH-02: Event-Bus fur Modul-Kommunikation**
  Direkte Funktionsaufrufe zwischen Modulen durch Event-System ersetzen.
  Beispiel: Ticket erstellt → SLA-Check → Notification → Audit-Log

- [ ] **ARCH-03: OpenTelemetry Instrumentation**
  Distributed Tracing + Prometheus Metrics fur Observability

- [ ] **ARCH-04: Unified Background Job Processor**
  Alle Async-Arbeit (SLA-Checks, Notifications, Auto-Close, Reports) uber eine Queue

- [ ] **ARCH-05: Redis Cache Layer**
  Hot-Path Reads cachen (Asset-Graphen, User-Listen, License-State)

- [ ] **ARCH-06: HA-Deployment dokumentieren**
  PostgreSQL Read-Replicas, Failover-Patterns, Multi-Region-Strategie

---

## TESTS DIE EXISTIEREN MUSSEN

### Unit-Tests (Vitest)

- [ ] `backend/src/modules/auth/__tests__/auth.service.test.ts` — Login, JWT-Signing, Rollen
- [ ] `backend/src/modules/tickets/__tests__/tickets.service.test.ts` — CRUD, Status-Transitions
- [ ] `backend/src/lib/__tests__/ticket-number.test.ts` — Nummern-Generierung, Edge Cases
- [ ] `backend/src/modules/assets/__tests__/asset-relations.test.ts` — DAG, Zykluserkennung
- [ ] `backend/src/middleware/__tests__/tenant.test.ts` — Tenant-Isolation, fehlender Tenant
- [ ] `backend/src/middleware/__tests__/license.test.ts` — Community-Limits, Enterprise-Features
- [ ] `backend/src/lib/__tests__/sla-engine.test.ts` — Tier-Resolution, Breach-Berechnung, Vererbung
- [ ] `frontend/src/stores/__tests__/auth-store.test.ts` — Login, Logout, Tenant-Switch, Persist
- [ ] `frontend/src/api/__tests__/client.test.ts` — Error-Handling, Token-Injection, Timeout

### Integration-Tests (Supertest)

- [ ] `backend/src/__tests__/tenant-isolation.test.ts` — Cross-Tenant Query Prevention
- [ ] `backend/src/__tests__/license-enforcement.test.ts` — 50 Assets, 5 User Limits
- [ ] `backend/src/__tests__/portal-auth-boundary.test.ts` — Portal-User sieht nur eigene Tickets
- [ ] `backend/src/__tests__/concurrent-tickets.test.ts` — Race Condition bei Nummern-Generierung
- [ ] `backend/src/__tests__/api-validation.test.ts` — Malformed Payloads, Oversized Bodies

### E2E-Tests (Playwright, zusatzlich zu bestehenden)

- [ ] `e2e/tenant-switching.spec.ts` — Tenant-Wechsel, Daten-Isolation nach Switch
- [ ] `e2e/license-limits.spec.ts` — Community-Limits in UI sichtbar + durchgesetzt
- [ ] `e2e/negative-paths.spec.ts` — Ungultige Inputs, Unauthorized Access, Netzwerk-Fehler
