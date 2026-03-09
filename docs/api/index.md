# REST API Übersicht

OpsWeave bietet eine vollständige REST API. Alle Funktionen der UI sind auch über die API verfügbar.

## Basis-URL

```
http://localhost:3000/api/v1/
```

## Authentifizierung

Alle Endpunkte (außer Portal-Auth, Webhooks und `/health`) erfordern einen Bearer Token:

```bash
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:3000/api/v1/tickets
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@opsweave.local", "password": "changeme"}'
```

## Response-Format

**Erfolg (Liste):**
```json
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "limit": 25 }
}
```

**Erfolg (Einzeln):**
```json
{ "data": { ... } }
```

**Fehler:**
```json
{
  "error": "Ticket not found",
  "code": "NOT_FOUND",
  "status": 404
}
```

## Pagination & Filter

```
GET /api/v1/tickets?page=2&limit=10&status=open&sort=created_at&order=desc
```

| Parameter | Beschreibung |
|-----------|--------------|
| `page` | Seite (Standard: 1) |
| `limit` | Einträge pro Seite (Standard: 25, max: 100) |
| `sort` | Sortierfeld |
| `order` | `asc` oder `desc` |
| `q` | Volltextsuche |

## Tenant-Scoping

Der Tenant wird **aus dem JWT gelesen**, nicht aus der URL.
Alle Daten sind automatisch auf den Tenant des eingeloggten Users beschränkt.

## Endpunkte

### Auth

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `POST` | `/auth/login` | Login, gibt JWT zurück |
| `POST` | `/auth/logout` | Logout |
| `POST` | `/auth/refresh` | JWT erneuern |
| `GET` | `/auth/me` | Eigenes Profil + Tenants |
| `POST` | `/auth/switch-tenant` | Aktiven Tenant wechseln |

### Tickets

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/tickets` | Liste (filter: type, status, priority, assignee, q) |
| `POST` | `/tickets` | Erstellen |
| `GET` | `/tickets/:id` | Detail |
| `PUT` | `/tickets/:id` | Aktualisieren |
| `PATCH` | `/tickets/:id/status` | Status ändern |
| `PATCH` | `/tickets/:id/assign` | Zuweisen |
| `GET` | `/tickets/:id/comments` | Kommentare |
| `POST` | `/tickets/:id/comments` | Kommentar hinzufügen |
| `GET` | `/tickets/:id/history` | Änderungsprotokoll |
| `GET` | `/tickets/stats` | Statistiken |
| `GET` | `/tickets/board` | Kanban-Board-Daten |

### Assets

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/assets` | Liste |
| `POST` | `/assets` | Erstellen |
| `GET` | `/assets/:id` | Detail |
| `PUT` | `/assets/:id` | Aktualisieren |
| `DELETE` | `/assets/:id` | Löschen |
| `GET` | `/assets/:id/relations` | Relationen |
| `POST` | `/assets/:id/relations` | Relation hinzufügen |
| `DELETE` | `/assets/:id/relations/:rid` | Relation entfernen |
| `GET` | `/assets/:id/sla-chain` | SLA-Vererbungskette |
| `GET` | `/assets/:id/tickets` | Verknüpfte Tickets |
| `GET` | `/assets/stats` | Statistiken |

### Workflows

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/workflows/templates` | Templates |
| `POST` | `/workflows/templates` | Erstellen |
| `GET/PUT/DELETE` | `/workflows/templates/:id` | Detail |
| `POST` | `/workflows/instantiate` | Manuell auslösen |
| `GET` | `/workflows/instances/:id` | Instance-Status |
| `POST` | `/workflows/instances/:id/steps/:sid/complete` | Step abschließen |
| `POST` | `/workflows/instances/:id/cancel` | Abbrechen |

### Knowledge Base

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/kb/articles` | Liste (filter: status, visibility, category, q, linked_ticket_id) |
| `POST` | `/kb/articles` | Erstellen |
| `GET/PUT/DELETE` | `/kb/articles/:id` | Detail |
| `POST` | `/kb/articles/:id/link/:ticketId` | Mit Ticket verknüpfen |
| `DELETE` | `/kb/articles/:id/link/:ticketId` | Verknüpfung entfernen |

### Service Katalog

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET/POST` | `/services/descriptions` | Leistungsbeschreibungen |
| `GET/PUT` | `/services/descriptions/:id` | Detail |
| `GET/POST` | `/services/catalogs/horizontal` | Horizontale Kataloge |
| `GET/POST` | `/services/catalogs/vertical` | Vertikale Kataloge (Enterprise) |

### Compliance

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET/POST` | `/compliance/frameworks` | Frameworks |
| `GET/POST` | `/compliance/frameworks/:id/requirements` | Anforderungen |
| `GET` | `/compliance/frameworks/:id/matrix` | Compliance-Matrix |
| `GET` | `/compliance/frameworks/:id/gaps` | Gap-Analyse |
| `POST/DELETE` | `/compliance/mappings` | Service↔Anforderung |

### E-Mail

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET/POST` | `/email/configs` | Konfigurationen |
| `GET/PUT/DELETE` | `/email/configs/:id` | Detail |
| `POST` | `/email/configs/:id/test` | Verbindungstest |
| `GET` | `/email/messages` | Eingegangene Mails |
| `POST` | `/email/webhook` | Webhook-Ingest (public) |

### Kundenportal

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `POST` | `/portal/auth/login` | Portal-Login |
| `GET` | `/portal/auth/me` | Portal-User-Profil |
| `GET` | `/portal/tickets` | Eigene Tickets |
| `POST` | `/portal/tickets` | Ticket erstellen |
| `GET` | `/portal/tickets/:id` | Ticket-Detail |
| `POST` | `/portal/tickets/:id/comments` | Kommentar |
| `GET` | `/portal/kb` | Öffentliche KB-Artikel |

### System

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/system/health` | Health Check |
| `GET` | `/system/info` | App-Info (Version, DB) |
| `GET` | `/license` | Lizenz-Status |
| `POST` | `/license/activate` | Enterprise-Key aktivieren |
