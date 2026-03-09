# OpsWeave — Known Bugs & Issues

> Gesammelt während Phase 1 Entwicklung und Smoke Tests.
> Priorisierung: P1 = Blocker, P2 = Wichtig, P3 = Nice-to-fix

---

## Backend

### B-001: drizzle-kit push CJS-Kompatibilität (P3)
**Beschreibung:** `drizzle-kit push` funktioniert nicht, weil der CJS-Loader `.js`-Importe aus den ESM-Schema-Dateien nicht auflösen kann.
**Workaround:** `src/db/setup.ts` erstellt Tabellen via Raw SQL.
**Fix:** Schema-Barrel-Export (`index.ts`) ohne `.js`-Extensions testen, oder drizzle-kit Config anpassen.

### B-002: Ticket-Detail — Assignee/Reporter/Group nicht aufgelöst (P2)
**Beschreibung:** Im Ticket-Detail-View zeigt die Sidebar "Nicht zugewiesen" und "-" für Zugewiesen an, Gruppe und Ersteller, obwohl Daten in der DB vorhanden sind.
**Ursache:** Der `getTicket()` Service macht keine JOINs auf `users` und `assignee_groups`. Er gibt nur die IDs zurück, nicht die aufgelösten Objekte (`assignee`, `reporter`, `assignee_group`).
**Fix:** JOINs im `tickets.service.ts` → `getTicket()` hinzufügen (analog zu `getBoardData()` das bereits `assignee_name` joined).

### B-003: Dashboard Stats — "Offene Tickets" zählt nur status=open (P3)
**Beschreibung:** Die Stat-Card "Offene Tickets" zeigt nur Tickets mit `status=open`, nicht `open + in_progress`. Geschmackssache ob das korrekt ist.
**Fix:** Entscheidung treffen ob "Offene Tickets" = nur `open` oder `open + in_progress` bedeutet.

### B-004: Board — Ticket-Cards zeigen "assignee_name" statt volles Objekt (P3)
**Beschreibung:** `getBoardData()` gibt nur `assignee_name` als flaches Feld zurück. Die Frontend-Ticket-Cards auf dem Board können dadurch keine Avatare oder Initialen korrekt anzeigen.
**Fix:** Board-Response sollte ein `assignee`-Objekt mit `id`, `display_name`, `email` liefern.

---

## Frontend

### F-001: Radix UI Tabs — Synthetische Clicks funktionieren nicht (P3)
**Beschreibung:** In der Settings-Seite können die Tabs (Allgemein, Darstellung, Konto, Lizenz, Organisation) nicht programmatisch per `click()` oder `dispatchEvent` gewechselt werden. Nur echte User-Clicks funktionieren.
**Ursache:** Radix UI Tabs nutzen interne State-Verwaltung die synthetische Events ignoriert.
**Impact:** Nur für automatisierte Tests relevant. Manuelle Nutzung funktioniert.

### F-002: Sprach-Dropdown im Settings-Tab "Allgemein" zeigt leeren Wert (P2)
**Beschreibung:** Der Sprach-Selector unter Einstellungen > Allgemein zeigt einen leeren Wert statt "Deutsch" oder "English".
**Ursache:** Vermutlich fehlendes Value-Binding oder die Options-Werte stimmen nicht mit dem i18n-Language-Code überein.
**Fix:** Select-Value auf `i18n.language` binden und Options korrekt mappen.

### F-003: Kommentar-Autoren zeigen "Unbekannter Benutzer" (P2)
**Beschreibung:** Im Ticket-Detail werden Kommentar-Autoren als "Unbekannter Benutzer" angezeigt statt mit ihrem Namen.
**Ursache:** Gleiche Ursache wie B-002 — der Backend-Service `getTicketComments()` joined nicht die `users`-Tabelle für `author_id`.
**Fix:** JOIN auf `users` in `getTicketComments()` hinzufügen.

---

## Infrastruktur

### I-001: Docker End-to-End nicht getestet (P2)
**Beschreibung:** Die Docker-Container (Single + Multi) wurden noch nicht end-to-end getestet. Schema-Setup (`setup.ts`) muss im Container laufen bevor der Server startet.
**Fix:** Entrypoint-Script erstellen das DB-Setup + Migration + Server-Start orchestriert.

### I-002: Git User Config nicht gesetzt (P3)
**Beschreibung:** Commits zeigen "Lemens <sebastian.lemens@h4ng6y2pmj.localdomain>" statt korrekten Namen/Email.
**Fix:** `git config user.name` und `git config user.email` im Repo setzen.

### I-003: Port-Konflikt Frontend Dev Server (P3)
**Beschreibung:** Port 5173 war bereits von einer anderen Vite-App belegt. Frontend musste auf Port 5174 ausweichen.
**Impact:** Nur lokale Entwicklungsumgebung betroffen. `.claude/launch.json` nutzt 5174.

---

## Erledigte Bugs (behoben)

### ~~B-FIXED-001: Express 5 req.query read-only~~
**Behoben in:** `fix(backend): Express 5 req.query read-only compatibility`
**Beschreibung:** Express 5 macht `req.query` zum read-only Getter. `validateQuery` Middleware konnte nicht auf `req.query` schreiben.
**Lösung:** Parsed Query wird auf `req.parsedQuery` gespeichert, Controller lesen von dort.

### ~~F-FIXED-001: API Response Envelope Mismatch~~
**Behoben in:** `fix(frontend): align API response handling with backend envelope`
**Beschreibung:** Frontend hat die `{ data: T }` Envelope des Backends nicht korrekt entpackt. Login schlug fehl mit "Cannot read properties of undefined (reading 'tenants')".
**Lösung:** API Client entpackt automatisch: `{ data }` → `T`, `{ data, meta }` → beibehalten.

### ~~F-FIXED-002: camelCase vs snake_case Mismatch~~
**Behoben in:** `fix(frontend): align API response handling with backend envelope`
**Beschreibung:** Backend liefert `displayName`, `isSuperAdmin` (camelCase), Frontend erwartete `display_name`, `is_superadmin` (snake_case).
**Lösung:** Auth Store und alle Components auf camelCase umgestellt.

### ~~B-FIXED-002: TypedDb Union Type Error~~
**Behoben in:** `feat(backend): add DB schema, auth, users, groups, tickets modules`
**Beschreibung:** `getDb()` gibt Union-Type zurück, `.insert()` etc. sind nicht aufrufbar.
**Lösung:** `getDb() as TypedDb` Cast-Pattern in allen Service-Dateien.
