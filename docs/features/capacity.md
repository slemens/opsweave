# Kapazitätsplanung

OpsWeave bietet eine integrierte Kapazitätsplanung, die direkt mit der CMDB verknüpft ist. Sie zeigt auf einen Blick, wie stark Ihre Infrastruktur ausgelastet ist und welche Geräte welche Ressourcen verbrauchen.

## Konzept

Jedes Asset kann Kapazität **bereitstellen** (z.B. ein Server stellt CPU-Kerne bereit) oder **verbrauchen** (z.B. eine VM verbraucht CPU-Kerne eines Hosts). Die Verbrauchsbeziehungen werden automatisch über die CMDB-Relationen aufgelöst.

**Beispiel:** Ein DC-Rack stellt 42 Rack Units bereit. Die Server im Rack (`member_of`-Relation) verbrauchen jeweils 2U. OpsWeave berechnet daraus automatisch die Auslastung.

## Kapazitätstypen

Kapazitätstypen definieren, welche Ressourcen verwaltet werden. Standard-Typen:

| Typ | Einheit | Kategorie |
|-----|---------|-----------|
| CPU Cores | cores | Compute |
| RAM | GB | Memory |
| Storage | GB | Storage |
| Rack Units | U | Infrastructure |
| Power | W | Infrastructure |
| Bandwidth | Mbps | Network |
| Ports | Stück | Network |
| IOPS | IOPS | Storage |

Eigene Kapazitätstypen können unter **Einstellungen → Kapazitätstypen** erstellt werden.

## Auslastungsübersicht

Die Hauptansicht unter **Kapazitätsplanung** zeigt alle Assets mit Kapazitäten als Karten-Grid. Jede Karte zeigt:

- Asset-Name und Typ
- Kapazitätsbalken pro Typ (farbcodiert: grün < 70%, gelb < 85%, rot ≥ 85%)
- Zugewiesen / Gesamt und verfügbare Kapazität

Per Klick auf eine Karte öffnet sich die **Detail-Seite** des Assets.

## Detail-Seite

Die Detail-Seite zeigt pro Kapazitätstyp:

- **Summary**: Gesamtkapazität, zugewiesen, verfügbar, Auslastung in Prozent mit Status-Badge
- **Consumer-Tabelle**: Welche Geräte wie viel verbrauchen, mit Relation-Typ, absolutem Verbrauch und prozentualem Anteil
- **Tracked vs. Untracked**: Zusammenfassung des erfassten Verbrauchs vs. manuelle Zuweisungen

## Kompatibilitätsprüfung

Finden Sie den besten Host für eine neue Workload:

1. Wählen Sie die benötigten Ressourcen (z.B. 4 CPU-Kerne + 16 GB RAM)
2. OpsWeave zeigt alle Hosts mit ausreichend freier Kapazität
3. Sortiert nach Fit-Score (wie gut passt die Workload zum Host)

## Migrationsprüfung

Prüfen Sie, ob eine bestehende Workload auf einen anderen Host migriert werden kann:

1. Wählen Sie Quell-Workload und Ziel-Host
2. OpsWeave vergleicht die benötigten Ressourcen mit der verfügbaren Kapazität
3. Ergebnis: machbar/nicht machbar mit detaillierter Aufschlüsselung pro Ressourcentyp

## Überbereitstellung

Erkennen Sie Assets mit zu niedriger Auslastung:

- Konfigurierbarer Schwellwert (Standard: 30%)
- Zeigt alle Assets deren Auslastung unter dem Schwellwert liegt
- Hilft bei der Konsolidierung und Kostensenkung

## Kapazität auf Asset-Ebene

Im **Asset-Detail** unter dem Tab **Kapazität** können Sie:

- Neue Kapazitäten hinzufügen (provides/consumes)
- Bestehende Werte bearbeiten (Gesamt, Zugewiesen, Reserviert)
- Auto-synchronisierte Einträge (aus Relationen) anpassen
- Kapazitäts-Einträge löschen (außer auto-synchronisierte)

## REST API

```
# Kapazitätstypen
GET    /api/v1/capacity/types
POST   /api/v1/capacity/types
PUT    /api/v1/capacity/types/:id
DELETE /api/v1/capacity/types/:id

# Asset-Kapazitäten
GET    /api/v1/capacity/assets/:id
POST   /api/v1/capacity/assets/:id
DELETE /api/v1/capacity/assets/:id/:cid
GET    /api/v1/capacity/assets/:id/utilization
GET    /api/v1/capacity/assets/:id/consumers/:capacityTypeId

# Kapazitätsplanung
GET    /api/v1/capacity/utilization
GET    /api/v1/capacity/compatible?requirements=[...]
GET    /api/v1/capacity/migration-check?workload=:id&target=:id
GET    /api/v1/capacity/overprovisioned?threshold=30
```
