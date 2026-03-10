# Major Incidents & Eskalation

OpsWeave unterstuetzt den vollstaendigen ITIL-konformen Incident-Management-Prozess einschliesslich Major Incidents, Eskalationsstufen, Problem Management und einer Known Error Database (KEDB).

## Major Incidents

Ein Major Incident ist ein Incident mit erheblicher Auswirkung auf geschaeftskritische Services, der eine koordinierte Reaktion erfordert.

### Deklaration

Ein Incident kann als **Major Incident** deklariert werden durch:
- Manuelle Kennzeichnung durch einen Manager oder Admin
- Automatische Erkennung basierend auf Impact + betroffenen Assets

Bei Deklaration werden folgende Felder gesetzt:
- `is_major: true`
- `incident_commander_id` -- Verantwortlicher Incident Commander
- `bridge_call_url` -- URL fuer den Krisen-Call (z.B. Teams/Zoom-Link)

### Incident Commander

Der Incident Commander koordiniert die Behebung des Major Incidents:
- Wird bei Deklaration zugewiesen
- Verantwortlich fuer Kommunikation und Koordination
- Kann Child-Tickets an verschiedene Teams delegieren
- Dokumentiert den Fortschritt im Ticket

### Benachrichtigungen

Bei Deklaration eines Major Incidents werden automatisch benachrichtigt:
- Alle Benutzer mit Rolle **Admin** im Tenant
- Alle Benutzer mit Rolle **Manager** im Tenant
- Der zugewiesene Incident Commander
- Die zugewiesene Gruppe

Benachrichtigungen erfolgen ueber:
- In-App Notifications (Socket.IO Realtime)
- Optional: E-Mail-Benachrichtigung

### Bridge Call

Der Bridge Call URL wird prominent im Ticket-Detail angezeigt und ermoeglicht allen Beteiligten den schnellen Beitritt zum Krisen-Call.

## Eskalation

OpsWeave unterstuetzt ein dreistufiges Eskalationsmodell:

| Stufe | Bezeichnung | Beschreibung |
|-------|------------|--------------|
| **L1** | First Level | Erste Aufnahme und Basisdiagnose |
| **L2** | Second Level | Spezialisierte technische Analyse |
| **L3** | Third Level | Experten, Entwickler, Hersteller-Support |

### Eskalationsprozess

1. Ticket wird erstellt und L1-Gruppe zugewiesen
2. L1 kann nicht loesen -- Eskalation an L2
3. L2 kann nicht loesen -- Eskalation an L3

Bei jeder Eskalation werden erfasst:
- **Zielgruppe** -- An welche Gruppe wird eskaliert
- **Begruendung** -- Warum wird eskaliert
- **Zeitstempel** -- Wann wurde eskaliert
- **Eskaliert durch** -- Wer hat eskaliert

Eskalationen werden im Ticket-Verlauf dokumentiert und koennen auch rueckwaerts erfolgen (De-Eskalation).

## Problem Management

Problem Tickets (`PRB`) dienen der Ursachenanalyse (Root Cause Analysis) wiederkehrender Incidents.

### Root Cause Analysis (RCA)

Auf Problem-Tickets stehen zusaetzliche Felder zur Verfuegung:
- `root_cause` -- Beschreibung der identifizierten Ursache
- `workaround` -- Temporaere Umgehungsloesung
- `permanent_fix` -- Beschreibung der dauerhaften Loesung
- `rca_completed_at` -- Zeitpunkt der abgeschlossenen Analyse

### Parent-Child-Beziehungen

Incidents und Problems koennen hierarchisch verknuepft werden:

```
Problem (PRB-2026-00005) -- Root Cause: Speicherueberlauf
  ├── Incident (INC-2026-00041) -- Web-Portal nicht erreichbar
  ├── Incident (INC-2026-00042) -- API-Timeouts
  └── Incident (INC-2026-00043) -- Batch-Jobs fehlgeschlagen
```

- Ein **Problem** kann mehrere **Child-Incidents** haben
- Ein **Major Incident** kann mehrere **Child-Tasks** haben (Sub-Tickets)
- Child-Tickets werden im Ticket-Detail unter "Child-Tickets" angezeigt
- Wird das Problem geloest, koennen alle Child-Incidents geschlossen werden

## Known Error Database (KEDB)

Die Known Error Database dokumentiert bekannte Fehler und deren Umgehungsloesungen.

### KEDB-Eintraege

Jeder Known Error enthaelt:

| Feld | Beschreibung |
|------|--------------|
| **Titel** | Kurzbeschreibung des bekannten Fehlers |
| **Symptome** | Wie aeussert sich der Fehler? |
| **Ursache** | Was verursacht den Fehler? |
| **Workaround** | Temporaere Umgehungsloesung |
| **Dauerhafte Loesung** | Geplante oder umgesetzte Behebung |
| **Status** | Aktueller Status des Known Errors |
| **Betroffene Assets** | Verknuepfte CIs aus der CMDB |
| **Verknuepfte Tickets** | Zugehoerige Incidents und Problems |

### KEDB-Status

| Status | Beschreibung |
|--------|--------------|
| **Identifiziert** | Fehler ist bekannt, noch keine Loesung |
| **Workaround verfuegbar** | Temporaere Umgehung dokumentiert |
| **Geloest** | Dauerhafte Loesung implementiert |

### KEDB verwalten

- **Erstellen** -- Neuen Known Error anlegen (manuell oder aus Problem-Ticket)
- **Bearbeiten** -- Status aktualisieren, Workaround/Loesung ergaenzen
- **Suchen** -- Volltextsuche ueber Titel, Symptome, Ursache
- **Filtern** -- Nach Status, betroffenen Assets, Erstelldatum
- **Verknuepfen** -- Known Error mit Incidents/Problems verbinden

Bei der Ticket-Bearbeitung werden passende KEDB-Eintraege vorgeschlagen, um wiederkehrende Probleme schneller zu loesen.

## REST API

```
# Tickets (inkl. Major Incident + Eskalation)
GET    /api/v1/tickets                     # Liste (Filter: is_major, ticket_type)
POST   /api/v1/tickets                     # Erstellen (inkl. parent_ticket_id)
GET    /api/v1/tickets/:id                 # Detail (inkl. RCA-Felder, children)
PUT    /api/v1/tickets/:id                 # Aktualisieren (Major-Deklaration, RCA)
PATCH  /api/v1/tickets/:id/status          # Status aendern
PATCH  /api/v1/tickets/:id/assign          # Zuweisen / Eskalieren
GET    /api/v1/tickets/:id/history         # Verlauf (inkl. Eskalationen)
GET    /api/v1/tickets/:id/comments        # Kommentare

# Known Error Database
GET    /api/v1/kedb                        # KEDB-Eintraege auflisten
POST   /api/v1/kedb                        # Known Error erstellen
GET    /api/v1/kedb/:id                    # Known Error Detail
PUT    /api/v1/kedb/:id                    # Known Error aktualisieren
GET    /api/v1/kedb/search?q=term          # KEDB durchsuchen
POST   /api/v1/kedb/:id/link/:ticketId     # Mit Ticket verknuepfen
DELETE /api/v1/kedb/:id/link/:ticketId     # Verknuepfung loesen
```
