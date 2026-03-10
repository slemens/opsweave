# OpsWeave — Production-Readiness Audit

**Datum:** 2026-03-10
**Version:** 0.2.9
**Methodik:** Systematische Analyse aller Source Files (Backend + Frontend) nach 6 Kategorien

---

## Zusammenfassung

| Schweregrad | Anzahl |
|-------------|--------|
| Critical    | 14     |
| High        | 16     |
| Medium      | 18     |
| Low         | 12     |
| **Gesamt**  | **60** |

---

## CRITICAL (Muss vor Production behoben werden)

### C-01 — Monitoring-Modul nicht implementiert
- **Datei:** `packages/backend/src/routes/index.ts:60`
- **Kategorie:** Missing
- **Beschreibung:** Gesamtes Monitoring-Modul fehlt. Routen auskommentiert (`// TODO: mount remaining module routes`). Kein Controller, kein Service, keine Frontend-API. Check_MK v1/v2 Integration nicht vorhanden.
- **Behebung:** Phase 6 implementieren oder Monitoring-Nav-Eintrag entfernen und als "Planned" dokumentieren.

### C-02 — JWT/Session Secrets mit Default-Werten
- **Datei:** `packages/backend/src/config/index.ts:88-89`
- **Kategorie:** Hardcoded
- **Beschreibung:** `jwtSecret` und `sessionSecret` fallen auf `'change-me-in-production'` zurück. In Production ohne gesetzte Env-Vars kann jeder JWTs fälschen.
- **Behebung:** Startup-Validierung: App muss mit Fehler abbrechen wenn Secrets nicht gesetzt sind (NODE_ENV=production).

### C-03 — Portal JWT Secret separater Default
- **Datei:** `packages/backend/src/modules/portal/portal.service.ts:25-26`, `portal.routes.ts:52-53`
- **Kategorie:** Hardcoded
- **Beschreibung:** Portal-Auth nutzt eigenen Fallback `'opsweave-dev-secret-change-in-production'` statt den zentralen Config-Wert.
- **Behebung:** Portal muss `config.jwtSecret` aus zentraler Config nutzen, kein eigener Fallback.

### C-04 — Health-Check prüft DB nicht wirklich
- **Datei:** `packages/backend/src/modules/system/system.controller.ts:30`
- **Kategorie:** Stub
- **Beschreibung:** `dbStatus = 'connected' as const` — hardcoded. Kein `SELECT 1` oder ähnlicher Connectivity-Check.
- **Behebung:** Echten DB-Query ausführen (`SELECT 1`), bei Fehler `status: 'degraded'` zurückgeben.

### C-05 — System-Info hardcoded auf 'community' Edition
- **Datei:** `packages/backend/src/modules/system/system.controller.ts:71`
- **Kategorie:** Stub
- **Beschreibung:** `edition: 'community'` fest codiert mit `// TODO: read actual license to determine edition`.
- **Behebung:** Lizenz aus Tenant lesen und Edition korrekt zurückgeben.

### C-06 — App-Version hardcoded auf '0.1.0'
- **Datei:** `packages/backend/src/modules/system/system.controller.ts:8`
- **Kategorie:** Hardcoded
- **Beschreibung:** `const APP_VERSION = '0.1.0'` — stimmt nicht mit package.json (0.2.9) überein.
- **Behebung:** Version aus `package.json` zur Laufzeit lesen.

### C-07 — PostgreSQL SLA-Engine ist Stub
- **Datei:** `packages/backend/src/lib/db-specific/postgres.ts:10-22`
- **Kategorie:** Stub
- **Beschreibung:** `resolveSlaTierPostgres()` gibt `console.warn()` aus und returnt `null`. SLA-Vererbung funktioniert nur mit SQLite.
- **Behebung:** Rekursives CTE für PostgreSQL implementieren (analog zu `resolveSlaTierSqlite()`).

### C-08 — Email-Webhook ohne Signatur-Validierung
- **Datei:** `packages/backend/src/modules/email-inbound/email.controller.ts:175`
- **Kategorie:** Missing
- **Beschreibung:** `// TODO: validate webhook secret for each provider.` — Öffentlicher Endpoint ohne Auth oder HMAC-Prüfung. Angreifer können beliebige Tickets per Fake-Webhook erstellen.
- **Behebung:** HMAC-SHA256 Signatur-Validierung für Mailgun/SendGrid implementieren.

### C-09 — Email-Webhook ohne Input-Validierung
- **Datei:** `packages/backend/src/modules/email-inbound/email.controller.ts:180+`
- **Kategorie:** Missing
- **Beschreibung:** Öffentlicher Endpoint castet `req.body as Record<string, unknown>` ohne Zod-Schema. Kein Size-Limit, keine Typ-Prüfung.
- **Behebung:** Zod-Schema für Webhook-Payload definieren und via `validate()` Middleware einsetzen.

### C-10 — Ticket-Kategorien ohne Zod-Validierung
- **Datei:** `packages/backend/src/modules/tickets/tickets.routes.ts:108-112`
- **Kategorie:** Missing
- **Beschreibung:** POST/PUT für `/tickets/categories` haben keine `validate()` Middleware. Controller castet direkt `req.body as { name: string }`.
- **Behebung:** Zod-Schema erstellen und Middleware einsetzen.

### C-11 — Mock-Daten im LicenseBanner
- **Datei:** `packages/frontend/src/components/layout/LicenseBanner.tsx:7-11`
- **Kategorie:** Mock
- **Beschreibung:** `MOCK_USAGE = { assets: { current: 12, max: 50 }, users: { current: 3, max: 5 } }` — Fake-Daten statt API-Call.
- **Behebung:** `GET /api/v1/license/usage` aufrufen und echte Werte anzeigen.

### C-12 — Kunden: Kein Create-Button auf CustomersPage
- **Datei:** `packages/frontend/src/pages/CustomersPage.tsx`
- **Kategorie:** Missing
- **Beschreibung:** Hauptseite für Kunden hat keinen "Neuer Kunde"-Button. Kunden können nur über Settings → Kunden-Tab erstellt werden.
- **Behebung:** Create-Dialog auf CustomersPage hinzufügen.

### C-13 — Kunden: Detail-Seite ist view-only
- **Datei:** `packages/frontend/src/pages/CustomerDetailPage.tsx`
- **Kategorie:** Incomplete
- **Beschreibung:** Kein Edit- oder Delete-Button. Kunden-Stammdaten können nicht von der Detail-Seite bearbeitet werden.
- **Behebung:** Edit-Dialog und Delete-Aktion (mit Bestätigung) auf CustomerDetailPage ergänzen.

### C-14 — Kunden: DELETE-Endpoint fehlt
- **Datei:** `packages/backend/src/modules/customers/customers.routes.ts`
- **Kategorie:** Missing
- **Beschreibung:** Kein `DELETE /api/v1/customers/:id` implementiert. Kunden können nicht gelöscht werden.
- **Behebung:** DELETE-Route + Service-Funktion (soft delete via `is_active = false` oder hard delete mit Cascade-Prüfung).

---

## HIGH (Sollte vor Release behoben werden)

### H-01 — Socket.IO nur Placeholder
- **Datei:** `packages/backend/src/server.ts:50-56`
- **Kategorie:** Stub
- **Beschreibung:** Nur `console.log` bei connect/disconnect. Keine Real-Time Events für Ticket-Updates, Board-Refresh oder Notifications.
- **Behebung:** Event-Emitter bei Ticket-Änderungen implementieren; Frontend-Subscription einrichten.

### H-02 — Seed-Passwörter im Code
- **Datei:** `packages/backend/src/db/seed/index.ts:77-78, 231`
- **Kategorie:** Hardcoded
- **Beschreibung:** `'changeme'` und `'password123'` als Demo-Passwörter. Credentials werden in Log ausgegeben und sind in Git-History sichtbar.
- **Behebung:** Akzeptabel für Demo-Seed, aber Startup-Warning wenn Seed-Passwörter in Production unverändert genutzt werden.

### H-03 — DB-Credentials als Fallback in Config
- **Datei:** `packages/backend/src/config/index.ts:82`
- **Kategorie:** Hardcoded
- **Beschreibung:** `'postgresql://opsweave:opsweave_secret@localhost:5432/opsweave_db'` als Default.
- **Behebung:** In Production darf kein Fallback greifen. Env-Var-Pflicht erzwingen.

### H-04 — Asset Relations DELETE ohne Param-Validierung
- **Datei:** `packages/backend/src/modules/assets/assets.routes.ts:138-141`
- **Kategorie:** Missing
- **Beschreibung:** `DELETE /:id/relations/:rid` hat keine `validateParams` Middleware. IDs werden unvalidiert an Service übergeben.
- **Behebung:** `validateParams(z.object({ id: z.string().uuid(), rid: z.string().uuid() }))` hinzufügen.

### H-05 — Tickets: DELETE nicht implementiert
- **Datei:** `packages/backend/src/modules/tickets/tickets.routes.ts`
- **Kategorie:** Missing
- **Beschreibung:** Kein `DELETE /api/v1/tickets/:id`. Tickets können nicht gelöscht werden.
- **Behebung:** Bewusste Entscheidung: Soft-Delete (status='deleted') oder als Feature dokumentieren dass Tickets nur archiviert werden.

### H-06 — Ticket-Kategorien: DELETE fehlt
- **Datei:** `packages/backend/src/modules/tickets/tickets.routes.ts`
- **Kategorie:** Missing
- **Beschreibung:** POST und PUT für Kategorien existieren, aber kein DELETE. Einmal erstellte Kategorien können nicht entfernt werden.
- **Behebung:** DELETE-Route ergänzen mit Prüfung ob noch Tickets zugeordnet sind.

### H-07 — Users: Kein Passwort-Ändern UI
- **Datei:** `packages/frontend/src/pages/SettingsPage.tsx`
- **Kategorie:** Missing
- **Beschreibung:** Kein "Passwort ändern"-Dialog für Benutzer. Weder für eigenes Passwort noch für Admin-Reset.
- **Behebung:** Password-Change-Dialog im Account-Tab oder User-Management implementieren.

### H-08 — Portal-User-Verwaltung fehlt im Frontend
- **Datei:** Frontend
- **Kategorie:** Missing
- **Beschreibung:** Backend-Schema `customer_portal_users` existiert mit CRUD, aber keine UI zum Verwalten von Portal-Benutzern pro Kunde.
- **Behebung:** Portal-User-Tab in CustomerDetailPage oder Settings ergänzen.

### H-09 — Portal: Logout-Endpoint fehlt im Backend
- **Datei:** `packages/backend/src/modules/portal/portal.routes.ts`
- **Kategorie:** Missing
- **Beschreibung:** Frontend ruft `POST /portal/auth/logout` auf, aber keine Route existiert im Backend.
- **Behebung:** Route ergänzen (bei stateless JWT reicht 200 OK Response).

### H-10 — Asset Sub-Endpoints fehlen (sla-chain, services, compliance)
- **Datei:** `packages/backend/src/modules/assets/assets.routes.ts`
- **Kategorie:** Missing
- **Beschreibung:** Laut CLAUDE.md spezifiziert: `GET /assets/:id/sla-chain`, `GET /assets/:id/services`, `GET /assets/:id/compliance` — alle drei nicht implementiert.
- **Behebung:** Endpoints implementieren oder aus Spec entfernen.

### H-11 — console.warn statt strukturiertem Logging
- **Datei:** Mehrere Backend-Dateien (tickets.service.ts:419, db-specific/postgres.ts, email-poll.worker.ts)
- **Kategorie:** Incomplete
- **Beschreibung:** Fehler werden mit `console.warn()` geloggt statt mit strukturiertem Logger (Winston/Pino). In Production gehen Fehlerdetails verloren.
- **Behebung:** Zentralen Logger einführen und `console.*` Calls ersetzen.

### H-12 — Stille JSON-Parse-Fehler in Services
- **Datei:** `packages/backend/src/modules/services/services.service.ts:37,40`, `kb.service.ts:109-111`
- **Kategorie:** Incomplete
- **Beschreibung:** `catch { return []; }` — JSON-Parse-Fehler bei Tags/Compliance-Tags werden verschluckt. Daten gehen still verloren.
- **Behebung:** Mindestens Warn-Log bei Parse-Fehlern, idealerweise Fehler an Aufrufer propagieren.

### H-13 — Lizenz-Validierung returnt null ohne Kontext
- **Datei:** `packages/backend/src/middleware/license.ts:77,85`
- **Kategorie:** Incomplete
- **Beschreibung:** `catch { return null; }` — Wenn Lizenz-Validierung fehlschlägt, gibt es keinerlei Information warum.
- **Behebung:** Fehlergrund loggen (abgelaufen, ungültige Signatur, malformed JWT).

### H-14 — Hardcoded German String in Email Controller
- **Datei:** `packages/backend/src/modules/email-inbound/email.controller.ts:149-150`
- **Kategorie:** Hardcoded
- **Beschreibung:** `'Webhook-basierte Provider benötigen keinen Verbindungstest...'` — Deutsche Fehlermeldung direkt im Controller statt über i18n.
- **Behebung:** i18n-Key verwenden.

### H-15 — Frontend Error Handling bei Mutations unvollständig
- **Datei:** `packages/frontend/src/pages/ServiceCatalogPage.tsx` (und andere Pages)
- **Kategorie:** Incomplete
- **Beschreibung:** `catch (err)` prüft nur `err instanceof ApiRequestError`, andere Error-Typen werden nicht behandelt.
- **Behebung:** Generischen Fallback für unbekannte Error-Typen ergänzen.

### H-16 — Portal Auth Middleware inkonsistent
- **Datei:** `packages/backend/src/modules/portal/portal.routes.ts:42-48`
- **Kategorie:** Incomplete
- **Beschreibung:** Portal-Auth gibt `res.status().json()` direkt zurück statt Errors zu throwen. Umgeht globalen Error-Handler.
- **Behebung:** `throw new UnauthorizedError()` verwenden wie in Main-Auth-Middleware.

---

## MEDIUM (Sollte behoben werden)

### M-01 — Localhost-URLs als Config-Defaults
- **Datei:** `packages/backend/src/config/index.ts:96,98`
- **Beschreibung:** `oidcRedirectUri` und `corsOrigin` fallen auf `http://localhost` zurück. In Production non-funktional.
- **Behebung:** Env-Var-Pflicht in Production.

### M-02 — Redis-URL Default localhost
- **Datei:** `packages/backend/src/config/index.ts:86`
- **Beschreibung:** `redis://localhost:6379` als Fallback. Queue-Operationen schlagen still fehl wenn Redis nicht lokal läuft.
- **Behebung:** Env-Var-Pflicht oder Startup-Check.

### M-03 — Settings /:key ohne Param-Validierung
- **Datei:** `packages/backend/src/modules/settings/settings.routes.ts:50`
- **Beschreibung:** `GET /settings/:key` hat keine `validateParams` Middleware.
- **Behebung:** Key-Format validieren (alphanumerisch + Punkte).

### M-04 — Non-Null Assertion (!) in allen Controllern
- **Datei:** Alle Controller-Dateien
- **Beschreibung:** `const tenantId = req.tenantId!;` — TypeScript `!` statt expliziter Guard.
- **Behebung:** Defensive Checks: `if (!req.tenantId) throw new UnauthorizedError()`.

### M-05 — Keine Query-Timeouts
- **Datei:** Alle Service-Dateien
- **Beschreibung:** Drizzle ORM Queries haben kein explizites Timeout. Langsame Queries blockieren den Event-Loop.
- **Behebung:** Connection-Level Timeout konfigurieren.

### M-06 — Email Poller Race Condition beim Start
- **Datei:** `packages/backend/src/modules/email-inbound/email-poll.worker.ts`
- **Beschreibung:** Email-Polling startet vor DB-Readiness. Fehler werden geloggt aber Worker bricht ggf. still ab.
- **Behebung:** Retry mit Exponential Backoff oder Startup-Sequenz-Garantie.

### M-07 — Seed Portal-User UUID hardcoded
- **Datei:** `packages/backend/src/db/seed/index.ts:234`
- **Beschreibung:** `id: '00000000-0000-0000-0000-000000000099'` statt `uuidv4()`. Inkonsistent mit allen anderen IDs.
- **Behebung:** `uuidv4()` verwenden.

### M-08 — Community-Limits ohne Inline-Kommentare
- **Datei:** `packages/backend/src/middleware/license.ts:11-17`
- **Beschreibung:** Magic Numbers (50, 5, 3, 1, 1) ohne Erklärung im Code.
- **Behebung:** Inline-Kommentare mit Business-Begründung.

### M-09 — User/Group API-Hooks in falscher Datei
- **Datei:** `packages/frontend/src/api/tickets.ts`
- **Beschreibung:** `useCreateUser`, `useUpdateUser`, `useDeleteUser`, Group-Hooks sind in `tickets.ts` statt in eigener Datei.
- **Behebung:** In `api/users.ts` und `api/groups.ts` auslagern.

### M-10 — Fehlende Loading-States in Ticket-Board Dialogen
- **Datei:** `packages/frontend/src/pages/TicketBoardPage.tsx`
- **Beschreibung:** `useUsers`, `useGroups`, `useCustomers` zeigen keinen Loading-State während Daten laden.
- **Behebung:** Skeleton-Loader für Select-Dropdowns in Dialogen.

### M-11 — Fehlende Retry-Buttons bei Error-States
- **Datei:** `packages/frontend/src/pages/TicketBoardPage.tsx` (und andere)
- **Beschreibung:** Bei API-Fehlern wird nur Text angezeigt, kein "Erneut versuchen"-Button.
- **Behebung:** `<Button onClick={() => refetch()}>` ergänzen.

### M-12 — Inkonsistente Error-Response Formate (Portal vs Main)
- **Datei:** Portal-Middleware vs globaler Error-Handler
- **Beschreibung:** Portal gibt anderes Error-Format zurück als Main-API. Frontend muss zwei Formate parsen.
- **Behebung:** Error-Envelope standardisieren.

### M-13 — Keine Validierung für Backend-i18n Error Messages
- **Datei:** Backend Error-Handler
- **Beschreibung:** Zod-Validierungsfehler werden nur auf Englisch zurückgegeben, nicht i18n-fähig.
- **Behebung:** Accept-Language Header für API-Fehlermeldungen respektieren.

### M-14 — Ticket `/tickets/:id/workflow` Endpoint fehlt (Spec vs Impl)
- **Datei:** `packages/backend/src/modules/tickets/tickets.routes.ts`
- **Beschreibung:** CLAUDE.md spezifiziert `GET /tickets/:id/workflow`, implementiert ist nur `GET /workflows/ticket/:ticketId`.
- **Behebung:** Alias-Route ergänzen oder Spec aktualisieren.

### M-15 — Kein Confirmation-Dialog bei Ticket-Status-Änderungen
- **Datei:** `packages/frontend/src/pages/TicketDetailPage.tsx`
- **Beschreibung:** Status-Änderungen (z.B. auf "closed") werden ohne Bestätigung durchgeführt.
- **Behebung:** AlertDialog für destruktive Status-Übergänge.

### M-16 — Kein Bulk-Export (CSV/JSON)
- **Datei:** Frontend
- **Beschreibung:** Kein Daten-Export für Tickets, Assets, Compliance-Berichte.
- **Behebung:** Export-Button mit CSV-Download implementieren.

### M-17 — docker-compose.yml: Hardcoded Credentials
- **Datei:** `docker-compose.yml:39`
- **Beschreibung:** `DATABASE_URL=postgresql://opsweave:opsweave_secret@postgres:5432/opsweave_db` direkt im Compose-File.
- **Behebung:** `.env`-Referenz nutzen statt Inline-Werte.

### M-18 — Kein Error Boundary im Frontend
- **Datei:** `packages/frontend/src/App.tsx`
- **Beschreibung:** Kein React Error Boundary. Unbehandelte Render-Fehler crashen die gesamte App.
- **Behebung:** Error Boundary Komponente um Router wrappen.

---

## LOW (Nice-to-have / Aufräumen)

### L-01 — TODO-Kommentare im Code
- **Dateien:** `routes/index.ts:60`, `system.controller.ts:30,71`, `email.controller.ts:175`
- **Beschreibung:** 4 TODO-Kommentare die auf unfertige Features hinweisen.
- **Behebung:** In GitHub Issues überführen und aus Code entfernen.

### L-02 — Socket.IO Placeholder-Log
- **Datei:** `packages/backend/src/server.ts:50-56`
- **Beschreibung:** Connection-Logging ohne Nutzen in Production.
- **Behebung:** Entfernen oder hinter Debug-Flag setzen.

### L-03 — Demo-Domain in Seed
- **Datei:** `packages/backend/src/db/seed/index.ts:237`
- **Beschreibung:** `portal@acme.example.de` — Demo-Domain statt `example.com` (RFC 2606).
- **Behebung:** Marginal, aber `example.com` wäre standardkonformer.

### L-04 — Demo-Tenant Name/Slug
- **Datei:** `packages/backend/src/db/seed/index.ts:61-62`
- **Beschreibung:** `name: 'Demo Organisation'` — nicht problematisch, aber generisch.
- **Behebung:** Kein Handlungsbedarf.

### L-05 — VPN-Domain in KB-Seed
- **Datei:** `packages/backend/src/db/seed/index.ts:969`
- **Beschreibung:** `vpn.firma.de` als Beispiel-Domain in KB-Artikel.
- **Behebung:** In `vpn.example.com` ändern.

### L-06 — Settings Page UI-Überladung
- **Datei:** `packages/frontend/src/pages/SettingsPage.tsx`
- **Beschreibung:** 9+ Tabs (General, Appearance, Account, License, Tenant, Email, Groups, Customers, SLA) auf einer Seite.
- **Behebung:** Langfristig in Sub-Routen aufteilen.

### L-07 — Kein Bulk-Import für Benutzer
- **Datei:** Frontend
- **Beschreibung:** Benutzer können nur einzeln angelegt werden.
- **Behebung:** CSV-Import Feature.

### L-08 — Kein Batch-Update für Tickets
- **Datei:** Frontend
- **Beschreibung:** Mehrere Tickets können nicht gleichzeitig aktualisiert werden.
- **Behebung:** Multi-Select + Batch-Actions im Board.

### L-09 — Fehlende Soft-Delete Konsistenz
- **Datei:** Backend
- **Beschreibung:** Manche Entitäten werden hard-deleted (Assets, Groups), andere haben `is_active` Flag (Users, Customers).
- **Behebung:** Konsistente Strategie definieren und dokumentieren.

### L-10 — OpenAPI Spec möglicherweise veraltet
- **Datei:** `docs/api/openapi.yaml`
- **Beschreibung:** Spec wurde initial generiert, neue Endpoints (vertical catalogs, customer overview, SLA) möglicherweise nicht enthalten.
- **Behebung:** Spec aktualisieren oder auto-generieren.

### L-11 — Fehlende JSDoc in Frontend API-Clients
- **Datei:** `packages/frontend/src/api/*.ts`
- **Beschreibung:** API-Hooks haben keine Dokumentation.
- **Behebung:** Kurze JSDoc-Kommentare ergänzen.

### L-12 — i18n-Completeness nicht in CI geprüft
- **Datei:** `.github/workflows/ci.yml`
- **Beschreibung:** `check-i18n` Script existiert aber wird nicht in CI ausgeführt.
- **Behebung:** Als CI-Step ergänzen.

---

## Priorisierte Aktionsplan

### Phase A — Production-Blocking (sofort)
1. C-02, C-03: Secrets-Validierung beim Startup (fail fast wenn nicht gesetzt)
2. C-08, C-09: Email-Webhook absichern (Signatur + Zod-Schema)
3. C-10: Ticket-Kategorien Zod-Validierung
4. C-11: LicenseBanner Mock-Daten durch API-Call ersetzen
5. C-04, C-05, C-06: System-Controller Stubs fixen
6. C-12, C-13, C-14: Customer CRUD vervollständigen

### Phase B — Release-Qualität (vor GA)
1. H-01: Socket.IO Events implementieren (oder Feature entfernen)
2. H-04, M-03: Fehlende Param-Validierungen ergänzen
3. H-07, H-08: User-Passwort-UI + Portal-User-Verwaltung
4. H-11: Strukturiertes Logging einführen
5. H-12, H-13: Stille Fehler mit Logging/Propagation versehen

### Phase C — Polish (nach GA)
1. C-01, C-07: Monitoring-Modul + PostgreSQL SLA-Engine
2. M-09: API-Hooks reorganisieren
3. M-16: Export-Funktionalität
4. M-18: Error Boundary
5. L-01: TODOs aufräumen
