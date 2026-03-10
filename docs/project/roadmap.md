# OpsWeave — Roadmap

> Konsolidierter Backlog aller offenen Features, Verbesserungen und technischen Schulden.
> Stand: v0.3.2

---

## Geplante Features

### Phase 6: Monitoring Integration
- Check_MK v1 (Livestatus) + v2 (REST API) Adapter
- Webhook-Inbound + Event-to-Asset-Matching
- Auto-Incident-Erstellung mit Deduplizierung
- Monitoring Source Management UI

### Notifications-Modul
- In-App + Email-Benachrichtigungen
- Konfigurierbar pro User (Ticket-Zuweisung, SLA-Warnung, Kommentar)
- SLA-Breach proaktive Alerts (X Minuten vor Deadline)

### OIDC/SAML Authentifizierung (Enterprise)
- passport-openidconnect für Azure AD, Keycloak, Okta
- OIDC User+Group Sync

### Ticket-Attachments
- File-Upload (Drag & Drop) in Kommentar-Editor
- Bilder inline, andere Dateien als Download
- Storage: Lokales Filesystem oder S3-kompatibel
- `ticket_attachments` Tabelle

### System-User für automatische Änderungen
- Dedizierter System-User (UUID) im Seed
- Alle automatischen Änderungen referenzieren System-User
- Löst DATA-02 (ungültiger `'system'` FK)

### Auto-Assignment-Rules
- Regeln: Kategorie/Asset/SLA-Tier → automatische Gruppenzuweisung
- Konfigurierbar pro Tenant

---

## Technische Schulden

### Sicherheit
- **AUTH-03:** JWT-Token in localStorage → Migration zu HttpOnly Cookies oder Risiko dokumentieren + CSP härten
- **SEC-01:** Rate-Limiting auf Login-Endpoints (5 req/min statt global 1000/15min)
- **SEC-02:** LIKE-Wildcard-Injection escapen (`%`, `_` in Suchfeldern)
- **SEC-04:** Login-Fehlermeldung vereinheitlichen (kein SSO-Status leaken)
- **SEC-05:** UNIQUE-Constraint auf Portal-Email (tenant_id, email)
- **CSRF:** SameSite-Cookies oder X-CSRF-Token Header

### Datenintegrität
- **DATA-01:** Race Condition bei Ticket-Nummern (DB-Level Sequence oder Lock)
- **DATA-03:** Ticket-Nummern-Logik DRY extrahieren (`lib/ticket-number.ts`)

### Performance
- **PERF-01:** N+1 Query in Asset-Relations → Batch-Query mit `inArray()`

### Frontend
- **MED-08:** Query gcTime konfigurieren (10 min statt unbegrenzt)
- **MED-09:** Request-Timeout im API-Client (AbortController, 30s)
- **MED-10:** React.memo auf Ticket-Board-Cards
- **MED-12:** Locale in formatDate() aus User-Settings lesen

### Accessibility
- **A11Y-02:** Farbe als einziger Status-Indikator → Icons zusätzlich

---

## Tests
- Unit-Tests: 0% Coverage → Ziel 80% (auth, tickets, SLA, license)
- Integration-Tests: Tenant-Isolation, License-Enforcement, Portal-Boundary
- E2E: Tenant-Switching, License-Limits, Negative Paths

---

## Architektur-Empfehlungen (langfristig)
- Event-Bus für Modul-Kommunikation
- OpenTelemetry Instrumentation
- Unified Background Job Processor
- Redis Cache Layer
- HA-Deployment Dokumentation
- Optimistic Locking (Version-Feld + ETag)
- Globale Suche über Entitäten
