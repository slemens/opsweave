# SLA Management

OpsWeave bietet ein vollstaendiges SLA-Management mit automatischer Fristberechnung, Vererbung ueber die CMDB und visuellen Indikatoren im gesamten System.

## SLA-Stufen

Das SLA-System basiert auf vier Stufen (Tiers):

| Stufe | Reaktionszeit | Loesungszeit | Einsatzbereich |
|-------|--------------|--------------|----------------|
| **Gold** | 1 Stunde | 4 Stunden | Geschaeftskritische Systeme |
| **Silver** | 4 Stunden | 8 Stunden | Wichtige Systeme |
| **Bronze** | 8 Stunden | 24 Stunden | Standard-Systeme |
| **None** | -- | -- | Kein SLA definiert |

Die Zeiten beziehen sich auf Geschaeftszeiten (konfigurierbar in den Einstellungen).

## SLA-Definitionen

SLA-Definitionen legen fest, welche Reaktions- und Loesungszeiten pro Stufe und Prioritaet gelten. Die Standardwerte koennen in den Einstellungen angepasst werden.

**Berechnung der Fristen:**

1. Ticket wird erstellt oder aktualisiert
2. SLA-Stufe wird ermittelt (direkt am Ticket oder via Asset-Vererbung)
3. Prioritaet wird aus Impact x Urgency berechnet
4. Reaktionsfrist = Erstellzeitpunkt + Reaktionszeit der Stufe
5. Loesungsfrist = Erstellzeitpunkt + Loesungszeit der Stufe

## Zuweisung an Assets und Kunden

SLA-Stufen koennen auf zwei Ebenen zugewiesen werden:

- **Asset-Ebene** -- Jedes Asset in der CMDB hat ein optionales Feld `sla_tier` (gold, silver, bronze)
- **Kunden-Ebene** -- Kunden koennen eine Standard-SLA-Stufe haben, die auf alle ihre Assets angewendet wird

Die Prioritaet bei der Ermittlung:
1. Direkt am Ticket gesetzte SLA-Stufe (hoechste Prioritaet)
2. SLA-Stufe des verknuepften Assets
3. SLA-Stufe des Kunden
4. Keine SLA (Standard)

## SLA-Vererbung

SLA-Stufen werden ueber den CMDB-Abhaengigkeitsgraph vererbt. Wenn ein Asset keine eigene SLA-Stufe hat, wird die hoechste Stufe der abhaengigen Assets uebernommen.

**Beispiel:**
```
Business Service (Gold)
  └── depends_on → Web-Server (kein SLA)
       └── runs_on → VM-Host (Silver)
```

Der Web-Server erbt **Gold** vom Business Service (hoechste Stufe in der Kette).

Die Vererbung wird ueber rekursive CTEs in der Datenbank berechnet (db-spezifisch fuer PostgreSQL und SQLite).

## SLA-Breach-Tracking

OpsWeave ueberwacht kontinuierlich alle offenen Tickets mit SLA-Fristen:

| Zustand | Bedingung | Indikator |
|---------|-----------|-----------|
| **Im Rahmen** | Aktuelle Zeit < Frist | Gruen |
| **Warnung** | Aktuelle Zeit > 75% der Frist | Gelb |
| **Ueberschritten** | Aktuelle Zeit > Frist | Rot |

Bei einem SLA-Breach wird:
- Das Feld `sla_breached` auf dem Ticket gesetzt
- Ein Eintrag im Ticket-Verlauf erstellt
- Optional eine Benachrichtigung an den Zugewiesenen und die Gruppe gesendet

## SLA Pause / Resume

Wenn ein Ticket den Status **Ausstehend** (Pending) erhaelt, wird die SLA-Uhr angehalten:

1. Ticket wechselt zu "Ausstehend" -- SLA-Timer wird pausiert
2. Die verbleibende Zeit wird gespeichert
3. Ticket wechselt zurueck zu "In Bearbeitung" -- SLA-Timer laeuft weiter
4. Die Fristen werden entsprechend der Pause-Dauer angepasst

Dies verhindert SLA-Breaches waehrend auf externe Rueckmeldungen gewartet wird.

## Visuelle Indikatoren

SLA-Status wird durchgaengig im System angezeigt:

### Ticket-Board (Kanban)

Jede Ticket-Karte zeigt einen farbigen SLA-Indikator:
- **Gruener Punkt** -- SLA im Rahmen
- **Gelber Punkt** -- SLA-Warnung (>75% der Frist)
- **Roter Punkt** -- SLA ueberschritten

### Ticket-Liste

Die Tabellen-Ansicht zeigt SLA-Spalten:
- Reaktionsfrist (mit Countdown)
- Loesungsfrist (mit Countdown)
- Breach-Status (Badge)

### Ticket-Detail

Im Metadaten-Bereich (rechte Spalte):
- SLA-Stufe (Gold/Silver/Bronze Badge)
- Reaktionsfrist mit Countdown
- Loesungsfrist mit Countdown
- Breach-Indikator mit Zeitstempel

## SLA-Performance-Reports

OpsWeave bietet SLA-Reports mit folgenden Kennzahlen:

| Kennzahl | Beschreibung |
|----------|--------------|
| **Compliance Rate** | Prozentsatz der Tickets innerhalb der SLA-Fristen |
| **MTTR** | Mean Time to Resolve -- durchschnittliche Loesungszeit |
| **Breach Count** | Anzahl der SLA-Breaches im Zeitraum |
| **Breach Rate** | Prozentsatz der Tickets mit SLA-Breach |
| **Response Compliance** | Anteil der Tickets mit rechtzeitiger Reaktion |

Reports koennen gefiltert werden nach:
- Zeitraum
- SLA-Stufe
- Ticket-Typ
- Zugewiesene Gruppe
- Kunde

## REST API

```
GET    /api/v1/tickets              # Tickets mit SLA-Feldern (sla_tier, sla_response_due, sla_resolve_due, sla_breached)
GET    /api/v1/tickets/stats        # KPI-Statistiken inkl. SLA-Metriken
GET    /api/v1/assets/:id/sla-chain # SLA-Vererbungskette des Assets
GET    /api/v1/settings             # SLA-Definitionen in den Einstellungen
PUT    /api/v1/settings/:key        # SLA-Zeiten anpassen
```
