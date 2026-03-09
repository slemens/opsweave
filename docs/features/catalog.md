# Service Katalog

Der Service Katalog verwaltet das Leistungsportfolio deiner IT-Organisation in drei Ebenen.

## Architektur (3-Tier)

```
Leistungsbeschreibungen (Service Descriptions)
        ↓
Horizontaler Katalog (Alle Services)
        ↓
Vertikaler Katalog (Kundenpezifisch) [Enterprise]
```

## Leistungsbeschreibungen

Standardisierte Beschreibungen einzelner IT-Services:

| Feld | Beschreibung |
|------|--------------|
| `code` | Eindeutiger Identifier (z.B. "SVC-001") |
| `title` | Servicetitel |
| `description` | Ausführliche Beschreibung |
| `scope_included` | Was ist inkludiert |
| `scope_excluded` | Was ist explizit ausgeschlossen |
| `compliance_tags` | Compliance-Referenzen (ISO-27001, DSGVO etc.) |
| `version` | Versionsstand |
| `status` | active, inactive, deprecated |

## Horizontaler Katalog

Sammelt Leistungsbeschreibungen in thematischen Gruppen.
Jeder Tenant hat einen Standard-Horizontalkatalog.

Beispiel: "IT-Infrastruktur-Services" enthält:
- Server-Bereitstellung
- Netzwerk-Management
- Backup & Recovery

## Vertikaler Katalog (Enterprise)

Kundenspezifische Sicht auf den Horizontalkatalog:

- Basiert auf einem Horizontalkatalog
- Pro Kunde oder Industrie-Segment konfigurierbar
- Einzelne Services können überschrieben werden (anderer Scope, andere SLA)
- Override-Typen: `scope_change`, `pricing_override`, `custom_description`

## Asset-Service-Verknüpfung

Services können mit Assets verknüpft werden:
```
Asset "web-server-01"
  → Service "Web-Hosting (Standard)"
  → Service "SSL-Zertifikat-Management"
```

Diese Verknüpfung bildet die Basis für Service-Impact-Analysen.

## REST API

```
GET    /api/v1/services/descriptions           # Leistungsbeschreibungen
POST   /api/v1/services/descriptions           # Erstellen
GET    /api/v1/services/descriptions/:id        # Detail
PUT    /api/v1/services/descriptions/:id        # Aktualisieren
GET    /api/v1/services/catalogs/horizontal     # Horizontale Kataloge
POST   /api/v1/services/catalogs/horizontal     # Erstellen
GET    /api/v1/services/catalogs/vertical       # Vertikale Kataloge (Enterprise)
POST   /api/v1/services/catalogs/vertical       # Erstellen
GET    /api/v1/services/catalogs/vertical/:id/effective  # Effektive Services (mit Overrides)
```
