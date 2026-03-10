# Monitoring & Event Management

OpsWeave integriert externe Monitoring-Systeme und verarbeitet deren Events automatisch. Unterstuetzt werden **Check_MK** (v1 Livestatus + v2 REST API) sowie beliebige Systeme ueber Webhook-Inbound.

## Monitoring Sources

Monitoring-Quellen werden zentral verwaltet. Jede Quelle definiert den Typ, die Verbindungsdaten und optionale Webhook-Secrets.

**Unterstuetzte Typen:**

| Typ | Beschreibung |
|-----|--------------|
| `checkmk_v1` | Check_MK 1.x via Livestatus-Protokoll |
| `checkmk_v2` | Check_MK 2.x via REST API |
| `zabbix` | Zabbix API |
| `prometheus` | Prometheus Alertmanager |
| `generic_webhook` | Beliebiges System via Webhook |

### Quellen verwalten

- **Hinzufuegen** -- Name, Typ, Verbindungskonfiguration (JSON), Webhook-Secret
- **Bearbeiten** -- Konfiguration anpassen, aktivieren/deaktivieren
- **Loeschen** -- Quelle entfernen (bestehende Events bleiben erhalten)
- **Verbindungstest** -- Erreichbarkeit und Authentifizierung pruefen

## Check_MK Integration

### Version 1.x (Livestatus)

Die Anbindung erfolgt ueber das Livestatus-Protokoll (TCP/Unix-Socket). OpsWeave fragt regelmaessig Host- und Service-Status ab und erstellt bei Statusaenderungen Events.

Konfiguration:
```json
{
  "host": "checkmk.example.com",
  "port": 6557,
  "protocol": "tcp",
  "poll_interval_seconds": 60
}
```

### Version 2.x (REST API)

Die Anbindung erfolgt ueber die offizielle Check_MK REST API mit Automation-User und Secret.

Konfiguration:
```json
{
  "base_url": "https://checkmk.example.com/mysite/check_mk/api/1.0",
  "username": "automation",
  "secret": "...",
  "poll_interval_seconds": 60
}
```

Beide Versionen werden durch einen abstrahierten Adapter unterstuetzt -- die interne Verarbeitung ist identisch.

## Event Dashboard

Das Event Dashboard zeigt alle eingehenden Monitoring-Events mit Statuskarten:

| Karte | Farbe | Bedeutung |
|-------|-------|-----------|
| **OK** | Gruen | Service laeuft normal |
| **Warning** | Gelb | Schwellenwert ueberschritten |
| **Critical** | Rot | Service ausgefallen oder kritisch |
| **Unknown** | Grau | Status unbekannt |

### Filterung und Paginierung

Events koennen gefiltert werden nach:
- **Status** (OK, Warning, Critical, Unknown)
- **Hostname**
- **Service-Name**
- **Quelle** (Monitoring Source)
- **Verarbeitungsstatus** (verarbeitet / unverarbeitet)
- **Zeitraum**

Die Ergebnisliste ist paginiert (Standard: 25 pro Seite).

## Webhook Inbound

Externe Systeme koennen Events per HTTP POST an OpsWeave senden:

```
POST /api/v1/monitoring/events
Content-Type: application/json
X-Webhook-Secret: <secret>
```

Der Tenant wird automatisch aus der Webhook-Source-Konfiguration ermittelt. Das Webhook-Secret wird gegen die hinterlegte Monitoring Source validiert.

**Payload-Felder:**

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `source_id` | UUID | Monitoring Source ID |
| `external_id` | String | Event-ID im Quellsystem |
| `hostname` | String | Betroffener Host |
| `service_name` | String | Betroffener Service |
| `state` | String | OK, Warning, Critical, Unknown |
| `output` | String | Plugin-Ausgabe / Beschreibung |

## Asset-Matching

Eingehende Events werden automatisch mit Assets in der CMDB abgeglichen. Der Matching-Algorithmus vergleicht den `hostname` des Events mit:

1. **Asset-Name** (exakter Match)
2. **Asset Display-Name** (exakter Match)
3. **IP-Adresse** (falls im Event enthalten)

Bei erfolgreichem Match wird das Event mit dem Asset verknuepft (`matched_asset_id`).

## Auto-Incident-Erstellung

Bei Events mit Status **Critical** oder **Warning** kann OpsWeave automatisch Incidents erstellen:

1. Event trifft ein mit State `critical`
2. Asset-Matching findet das betroffene Asset
3. Deduplizierung: Existiert bereits ein offenes Ticket fuer dieses Asset + Service?
   - **Ja** -- Event wird dem bestehenden Ticket zugeordnet
   - **Nein** -- Neues Incident-Ticket wird erstellt
4. Das Ticket erhaelt `source: 'monitoring'` und referenziert das Event

Bei Rueckkehr zum Status **OK** kann das zugehoerige Ticket automatisch als geloest markiert werden (Auto-Acknowledgment).

## Auto-Acknowledgment

Wenn ein Monitoring-Event mit Status **OK** eintrifft und ein offenes Incident-Ticket fuer denselben Host/Service existiert:

- Das Event wird als verarbeitet markiert
- Optional: Das Ticket wird automatisch auf Status "Geloest" gesetzt
- Ein System-Kommentar dokumentiert die automatische Aenderung

Dieses Verhalten ist pro Monitoring Source konfigurierbar.

## REST API

```
GET    /api/v1/monitoring/sources          # Alle Quellen auflisten
POST   /api/v1/monitoring/sources          # Quelle hinzufuegen
PUT    /api/v1/monitoring/sources/:id      # Quelle bearbeiten
POST   /api/v1/monitoring/events           # Event empfangen (Webhook)
GET    /api/v1/monitoring/events            # Events auflisten (paginiert, filterbar)
```
