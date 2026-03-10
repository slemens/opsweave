# Change Advisory Board (CAB)

Das Change Advisory Board (CAB) ist die zentrale Instanz zur Bewertung und Genehmigung von Change Requests in OpsWeave. Es stellt sicher, dass Aenderungen an der IT-Infrastruktur strukturiert geprueft und dokumentiert werden.

## CAB-Board

Die CAB-Seite bietet eine uebersichtliche Darstellung aller Change Requests, die eine CAB-Bewertung erfordern.

### Tabs

| Tab | Inhalt |
|-----|--------|
| **Ausstehend** | Change Requests mit Status "CAB Review" -- noch nicht bewertet |
| **Alle Changes** | Komplette Liste aller Change Requests (inkl. bereits bewerteter) |

Jeder Eintrag zeigt:
- Ticket-Nummer (z.B. `CHG-2026-00015`)
- Titel und Kurzbeschreibung
- Risikostufe (farbcodiert)
- Geplantes Umsetzungsdatum
- Zugewiesene Gruppe
- Aktueller Status

## Entscheidungs-Workflow

CAB-Mitglieder koennen fuer jeden Change Request eine Entscheidung treffen:

| Entscheidung | Beschreibung |
|-------------|--------------|
| **Genehmigen** (Approve) | Change wird zur Umsetzung freigegeben |
| **Ablehnen** (Reject) | Change wird abgelehnt mit Begruendung |
| **Zurueckstellen** (Defer) | Change wird vertagt, erneute Pruefung erforderlich |

Jede Entscheidung erfordert eine **Notiz** mit Begruendung. Die Entscheidung wird im Ticket-Verlauf protokolliert.

### Ablauf

1. Agent erstellt Change Request mit `cab_required: true`
2. Ticket erscheint im CAB-Board unter "Ausstehend"
3. CAB-Mitglieder pruefen RFC-Details und Risikobewertung
4. Entscheidung wird getroffen (Approve/Reject/Defer)
5. Bei Genehmigung: Ticket wechselt in naechsten Workflow-Schritt
6. Bei Ablehnung: Ticket wird zurueck an den Ersteller geroutet

## Risikobewertung

Jeder Change Request enthaelt eine strukturierte Risikobewertung:

| Feld | Werte | Beschreibung |
|------|-------|--------------|
| **Risikostufe** | Niedrig, Mittel, Hoch, Kritisch | Gesamtrisiko der Aenderung |
| **Eintrittswahrscheinlichkeit** | Niedrig, Mittel, Hoch | Wahrscheinlichkeit negativer Auswirkungen |
| **Auswirkung** | Niedrig, Mittel, Hoch | Schwere bei Eintritt eines Problems |

Die Risikostufe wird als farbcodiertes Badge angezeigt:
- **Niedrig** -- Gruen
- **Mittel** -- Gelb
- **Hoch** -- Orange
- **Kritisch** -- Rot

## RFC-Details

Der Request for Change (RFC) enthaelt alle relevanten Informationen fuer die CAB-Bewertung:

| Abschnitt | Inhalt |
|-----------|--------|
| **Begruendung** | Warum ist die Aenderung notwendig? |
| **Implementierungsplan** | Schritt-fuer-Schritt-Beschreibung der Umsetzung |
| **Rollback-Plan** | Massnahmen bei fehlgeschlagener Implementierung |
| **Geplanter Start** | Datum und Uhrzeit des Aenderungsbeginns |
| **Geplantes Ende** | Voraussichtlicher Abschluss der Aenderung |
| **Betroffene Assets** | Verknuepfte CIs aus der CMDB |
| **Betroffene Services** | Impactierte IT-Services |

## Integration mit Change Tickets

Change Tickets (`CHG`) haben zusaetzliche Felder gegenueber Incidents und Problems:

- `cab_required` (Boolean) -- Bestimmt, ob ein CAB-Review erforderlich ist
- `risk_level` -- Risikostufe (low, medium, high, critical)
- `risk_likelihood` -- Eintrittswahrscheinlichkeit
- `risk_impact` -- Auswirkung bei Eintritt
- `justification` -- Begruendung fuer die Aenderung
- `implementation_plan` -- Umsetzungsplan
- `rollback_plan` -- Rueckfallplan
- `planned_start` -- Geplanter Beginn
- `planned_end` -- Geplantes Ende

### Change-Subtypen

| Subtyp | CAB erforderlich | Beschreibung |
|--------|-----------------|--------------|
| **Standard** | Nein | Vorab genehmigte, risikoarme Aenderung |
| **Normal** | Ja | Standard-Change mit CAB-Bewertung |
| **Emergency** | Nachtraeglich | Notfall-Aenderung, CAB-Review nach Umsetzung |

## REST API

```
GET    /api/v1/tickets?ticket_type=change&status=cab_review   # Ausstehende CAB-Reviews
GET    /api/v1/tickets?ticket_type=change                      # Alle Changes
GET    /api/v1/tickets/:id                                     # Change-Detail mit RFC-Feldern
PUT    /api/v1/tickets/:id                                     # Change aktualisieren
PATCH  /api/v1/tickets/:id/status                              # CAB-Entscheidung (Status aendern)
GET    /api/v1/tickets/:id/history                             # Verlauf inkl. CAB-Entscheidungen
```
