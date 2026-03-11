# Wissensdatenbank

Die Wissensdatenbank (KB) speichert strukturiertes Wissen in Markdown-Artikeln
und verknüpft es mit Tickets.

![Wissensdatenbank](/screenshots/knowledge-base.png)

## Artikel

Jeder Artikel hat:

| Feld | Beschreibung |
|------|--------------|
| `title` | Artikeltitel |
| `slug` | URL-freundlicher Identifier (auto-generiert) |
| `content` | Markdown-Inhalt |
| `category` | Kategorie (z.B. "Netzwerk", "Anleitungen") |
| `tags` | Array von Tags für Filterung |
| `visibility` | `internal` (nur Agenten) oder `public` (auch Kundenportal) |
| `status` | `draft`, `published`, `archived` |

## Sichtbarkeit

**Intern (`internal`):** Nur für eingeloggte Agenten sichtbar.
Typisch für: Eskalationsprozesse, interne Checklisten, Passwort-Policies.

**Öffentlich (`public`):** Erscheint auch im [Kundenportal](/features/portal).
Typisch für: Anleitungen für Endbenutzer, FAQ, Known Issues.

## Ticket-Verknüpfung

Artikel können mit Tickets verknüpft werden:
- "Known Issue" → referenziert alle betroffenen Incidents
- "How-To" → verknüpft mit dem Change der die Anleitung erfordert

Verknüpfungen erscheinen:
- Im **Wissensdatenbank-Tab** des Tickets (alle verknüpften Artikel)
- Im Artikel-Detail unter `linked_ticket_ids`

## Suche

- Volltext-Suche über Titel und Kategorie
- Filter: Status, Sichtbarkeit, Kategorie
- Im Portal: nur publizierte, öffentliche Artikel

## REST API

```
GET    /api/v1/kb/articles                    # Liste (filter, paginate, search)
POST   /api/v1/kb/articles                    # Erstellen
GET    /api/v1/kb/articles/:id                # Detail mit linked_ticket_ids
PUT    /api/v1/kb/articles/:id                # Aktualisieren
DELETE /api/v1/kb/articles/:id                # Löschen (+ Links)
POST   /api/v1/kb/articles/:id/link/:ticketId # Mit Ticket verknüpfen
DELETE /api/v1/kb/articles/:id/link/:ticketId # Verknüpfung entfernen
```

### Filter-Parameter

```
GET /api/v1/kb/articles?q=exchange&status=published&visibility=public&category=Netzwerk
GET /api/v1/kb/articles?linked_ticket_id=<uuid>  # Artikel verknüpft mit Ticket
```
