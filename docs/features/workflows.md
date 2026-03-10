# Workflow Engine

Die Workflow Engine ermöglicht die Automatisierung und Steuerung von ITSM-Prozessen.
Workflows werden als Templates definiert und automatisch beim Erstellen von Tickets ausgelöst.

![Workflow Templates](/screenshots/workflows.png)

## Konzepte

**Template:** Definition eines Workflows (Schritte, Reihenfolge, Bedingungen)

**Instance:** Aktiver Lauf eines Templates, verknüpft mit einem Ticket

**Step:** Einzelne Aufgabe innerhalb eines Workflows

## Step-Typen

| Typ | Beschreibung |
|-----|--------------|
| `form` | Agent füllt ein Formular aus (Freitext, Checkboxen) |
| `approval` | Manager/Lead muss genehmigen (approve/reject) |
| `condition` | Automatische Verzweigung basierend auf Ticket-Attributen |
| `routing` | Weiterleitung an andere Gruppe/Person |
| `automatic` | Automatische Aktion ohne manuelle Interaktion |

## Trigger-Typen

Workflows werden automatisch ausgelöst wenn ein Ticket erstellt wird:

| Trigger | Beschreibung |
|---------|--------------|
| `ticket_type` | Basierend auf Ticket-Typ (incident, change, problem) |
| `ticket_type + subtype` | Ticket-Typ + Subtyp Kombination |
| `manual` | Manuell durch Agent gestartet |

## Template-Designer

![Workflow Detail](/screenshots/workflow-detail.png)

Der visuelle Designer nutzt **React Flow**:
- Drag & Drop von Step-Karten
- Verbindungen zwischen Steps ziehen
- Step-Eigenschaften inline bearbeiten
- Live-Vorschau des Workflow-Graphs

## Runtime

Wenn ein Workflow ausgelöst wird:

1. Workflow-Instance wird erstellt (Status: `running`)
2. Erster Step wird aktiviert → zuständige Person/Gruppe wird benachrichtigt
3. Person schließt Step ab (Formular ausfüllen, genehmigen etc.)
4. Nächster Step wird aktiviert
5. Bei `condition`-Step: automatische Verzweigung
6. Letzter Step abgeschlossen → Instance Status: `completed`

## Fortschritt im Ticket

Der Workflow-Tab im Ticket-Detail zeigt:
- Aktuellen Step mit Fortschrittsbalken
- Alle Steps mit Status (pending, active, completed, skipped)
- Step-Completion Form direkt im Tab

## Timeout & Eskalation

Jeder Step kann ein `timeout_hours` Feld haben.
Bei Überschreitung wird der Step als `timed_out` markiert und
eine Eskalation ausgelöst (konfigurierbar).

## REST API

```
GET    /api/v1/workflows/templates           # Alle Templates
POST   /api/v1/workflows/templates           # Template erstellen
GET    /api/v1/workflows/templates/:id        # Detail
PUT    /api/v1/workflows/templates/:id        # Aktualisieren
DELETE /api/v1/workflows/templates/:id        # Löschen
POST   /api/v1/workflows/instantiate          # Manuell auslösen
GET    /api/v1/workflows/instances/:id        # Instance-Status
POST   /api/v1/workflows/instances/:id/steps/:sid/complete  # Step abschließen
POST   /api/v1/workflows/instances/:id/cancel # Abbrechen
```

## Community-Limit

Community Edition: **3 Workflow-Templates** pro Tenant.
