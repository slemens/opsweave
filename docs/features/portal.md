# Kundenportal

Das Kundenportal ist ein Self-Service Portal für Endkunden mit **eigener Authentifizierung**,
getrennt von den internen Agenten-Accounts.

## Zugang

Das Portal ist unter `/portal/login` erreichbar.
Kundenportal-User sind in einer separaten Tabelle (`customer_portal_users`) gespeichert
und haben **keinen Zugang** zur internen ITSM-Oberfläche.

**Demo-Zugang (Seed-Daten):**
- URL: http://localhost:8080/portal/login
- E-Mail: `portal@acme.example.de`
- Passwort: `changeme`
- Tenant: `demo-org`

## Features

### Meine Tickets

- Liste aller Tickets des eigenen Kunden
- Filter nach Status
- Ticket-Detail mit Kommentaren

**Sichtbarkeit:** Nur externe Kommentare (keine internen Notizen der Agenten)

### Neues Ticket erstellen

Portal-User können Tickets einreichen:
- Typ (Incident / Change)
- Titel und Beschreibung
- Priorität

Das Ticket wird mit `source: 'portal'` und der `customer_id` des Portal-Users angelegt.

### Kommentare

Portal-User können externe Kommentare hinterlassen.
Agenten sehen diese Kommentare in der normalen Ticket-Ansicht.

### Wissensdatenbank

Alle **veröffentlichten, öffentlichen** KB-Artikel sind im Portal sichtbar:
- Suche
- Artikel-Karten mit Kategorie und Tags
- Vollständige Artikel-Ansicht (Markdown gerendert)

## Authentifizierung

Das Portal nutzt eigene JWT-Tokens mit dem Flag `portal: true`.
Tenant-Zuordnung erfolgt über den `tenantSlug` beim Login.

```json
{
  "sub": "portal-user-id",
  "email": "user@customer.example",
  "displayName": "Max Mustermann",
  "customerId": "customer-uuid",
  "tenantId": "tenant-uuid",
  "portal": true
}
```

## Portal-User verwalten

Portal-User werden aktuell direkt in der Datenbank angelegt.
Eine Admin-UI für Portal-User-Management ist geplant.

```sql
INSERT INTO customer_portal_users
  (id, tenant_id, customer_id, email, display_name, password_hash, is_active, created_at)
VALUES (?, ?, ?, ?, ?, bcrypt(?), 1, ?);
```

## REST API (Portal-Endpunkte)

```
POST /api/v1/portal/auth/login         # Portal-Login (gibt JWT zurück)
GET  /api/v1/portal/auth/me            # Eigenes Profil + Kunden-Info
GET  /api/v1/portal/tickets            # Eigene Tickets (paginiert)
GET  /api/v1/portal/tickets/:id        # Ticket-Detail + externe Kommentare
POST /api/v1/portal/tickets            # Neues Ticket erstellen
POST /api/v1/portal/tickets/:id/comments # Kommentar hinzufügen
GET  /api/v1/portal/kb                 # Öffentliche KB-Artikel (optional: ?q=)
```
