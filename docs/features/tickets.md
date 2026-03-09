# Ticket Management

OpsWeave unterstützt drei ITIL-konforme Ticket-Typen: **Incident**, **Problem** und **Change**.

## Ticket-Typen

| Typ | Präfix | Beschreibung |
|-----|--------|--------------|
| Incident | `INC` | Ungeplante Unterbrechung eines IT-Services |
| Problem | `PRB` | Ursache eines oder mehrerer Incidents |
| Change | `CHG` | Geplante Änderung an IT-Infrastruktur |

Ticket-Nummern werden automatisch vergeben: `INC-2026-00042`.

## Kanban-Board

Das Ticket-Board zeigt alle Tickets in fünf Spalten:

- **Offen** — Neu eingegangen, noch nicht in Bearbeitung
- **In Bearbeitung** — Aktiv bearbeitet
- **Ausstehend** — Wartet auf externe Rückmeldung
- **Gelöst** — Lösung implementiert, wartet auf Bestätigung
- **Geschlossen** — Abgeschlossen

Tickets können per **Drag & Drop** zwischen Spalten verschoben werden.

## Ticket-Detail

Jedes Ticket hat zwei Bereiche:

**Linke Spalte — Inhalt:**
- Beschreibung (Markdown-Render)
- Child-Tickets (Hierarchie)
- Tabs: Kommentare, Verlauf, Workflows, Wissensdatenbank

**Rechte Spalte — Metadaten:**
- Status, Priorität, Typ, Auswirkung, Dringlichkeit
- Zugewiesen an (Agent + Gruppe)
- Verknüpftes Asset
- Kunde
- SLA-Informationen (Stufe, Fristen, Breach-Indikator)
- Zeitstempel

## Priorität

Die Priorität wird automatisch aus **Auswirkung × Dringlichkeit** berechnet (ITIL-Matrix):

| | Dringlichkeit Hoch | Dringlichkeit Mittel | Dringlichkeit Niedrig |
|---|---|---|---|
| **Auswirkung Hoch** | Kritisch | Hoch | Mittel |
| **Auswirkung Mittel** | Hoch | Mittel | Niedrig |
| **Auswirkung Niedrig** | Mittel | Niedrig | Niedrig |

## SLA-Tracking

SLA-Fristen werden automatisch gesetzt wenn:
1. Das Ticket eine **SLA-Stufe** hat (Gold, Silver, Bronze), oder
2. Das verknüpfte Asset eine SLA-Stufe hat (wird vererbt)

SLA-Zeiten (Beispiel Gold): Reaktion ≤ 1h, Lösung ≤ 4h.
Bei SLA-Breach wird das Ticket rot markiert.

## Kommentare

- **Externe Kommentare** — sichtbar für Agent und Kunde (Portal)
- **Interne Notizen** — nur für Agenten sichtbar (dunkel hervorgehoben)
- Kommentar-Quellen: `agent`, `customer`, `email`, `system`

## History / Audit Trail

Jede Änderung an einem Ticket wird im Verlauf-Tab protokolliert:
- Geändertes Feld (Status, Assignee, Priorität etc.)
- Alter und neuer Wert
- Benutzer und Zeitstempel

## Quellen

Tickets können aus verschiedenen Quellen entstehen:

| Quelle | Beschreibung |
|--------|--------------|
| `manual` | Manuell durch Agent erstellt |
| `portal` | Durch Kunden im Self-Service Portal |
| `email` | Automatisch aus eingehender E-Mail |
| `monitoring` | Automatisch durch Monitoring-Event |
| `api` | Via REST API |

## REST API

```
GET    /api/v1/tickets              # Liste (paginiert, filterbar)
POST   /api/v1/tickets              # Erstellen
GET    /api/v1/tickets/:id          # Detail
PUT    /api/v1/tickets/:id          # Aktualisieren
PATCH  /api/v1/tickets/:id/status   # Status ändern
PATCH  /api/v1/tickets/:id/assign   # Zuweisen
GET    /api/v1/tickets/:id/comments # Kommentare
POST   /api/v1/tickets/:id/comments # Kommentar hinzufügen
GET    /api/v1/tickets/stats        # KPI-Statistiken
GET    /api/v1/tickets/board        # Board-Ansicht (Kanban)
```
