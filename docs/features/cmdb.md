# CMDB / Assets

Die Configuration Management Database (CMDB) ist das Herzstück von OpsWeave.
Assets (Configuration Items) sind die zentrale Entität — alles andere referenziert sie.

## Asset-Typen

OpsWeave unterstützt 24 Asset-Typen in 7 Kategorien:

| Kategorie | Typen |
|-----------|-------|
| **Compute** | Server, Virtual Machine, Container, Cloud Instance |
| **Network** | Router, Switch, Firewall, Load Balancer, Access Point |
| **Storage** | NAS, SAN, Backup System |
| **Software** | Operating System, Application, Database, Web Service, API |
| **Security** | Certificate, VPN, Identity Provider |
| **Facility** | UPS, PDU, Rack |
| **Service** | Business Service, IT Service |

## Asset-Attribute

Jedes Asset hat folgende Standard-Felder:

| Feld | Beschreibung |
|------|--------------|
| `name` | Technischer Name (z.B. "web-server-01") |
| `display_name` | Anzeigename |
| `asset_type` | Typ aus obiger Liste |
| `status` | active, inactive, maintenance, decommissioned |
| `ip_address` | IPv4/IPv6 (max. 45 Zeichen) |
| `location` | Physischer Standort |
| `sla_tier` | gold, silver, bronze (für SLA-Vererbung) |
| `environment` | production, staging, development, test |
| `customer_id` | Zugehöriger Kunde |
| `attributes` | Beliebige JSON-Attribute (erweiterbar) |

## Relations (DAG)

Assets können in beliebigen Beziehungen zueinander stehen.
Das Beziehungsmodell ist ein **Directed Acyclic Graph (DAG)** — Zyklen werden verhindert.

**Relation-Typen:**

| Typ | Bedeutung |
|-----|-----------|
| `depends_on` | A ist abhängig von B |
| `runs_on` | Software A läuft auf Server B |
| `connects_to` | A ist verbunden mit B |
| `managed_by` | A wird verwaltet von B |
| `part_of` | A ist Bestandteil von B |
| `hosts` | A hostet B |
| `backs_up` | A sichert B |
| `monitors` | A überwacht B |
| `provides` | A stellt Service B bereit |

## SLA-Vererbung

SLA-Stufen werden über den Abhängigkeitsgraph vererbt:
Wenn Asset A von Asset B abhängt, erbt A die SLA-Stufe von B
(falls A selbst keine SLA-Stufe hat).

Die Vererbungstiefe ist unbegrenzt — rekursiver CTE traversiert den DAG.

## Asset-Detail

Die Asset-Detail-Ansicht hat drei Tabs:

**Details:** Alle Attribute, Inline-Bearbeitung, SLA-Kette

**Relations:** Visuelle Graph-Darstellung (React Flow) aller abhängigen/verknüpften Assets

**Tickets:** Alle Tickets die auf dieses Asset verweisen

## REST API

```
GET    /api/v1/assets                    # Liste (filter, search, paginate)
POST   /api/v1/assets                    # Erstellen
GET    /api/v1/assets/:id                # Detail
PUT    /api/v1/assets/:id                # Aktualisieren
DELETE /api/v1/assets/:id                # Löschen
GET    /api/v1/assets/:id/relations      # Relationen
POST   /api/v1/assets/:id/relations      # Relation hinzufügen
DELETE /api/v1/assets/:id/relations/:rid # Relation entfernen
GET    /api/v1/assets/:id/sla-chain      # SLA-Vererbungskette
GET    /api/v1/assets/:id/tickets        # Verknüpfte Tickets
GET    /api/v1/assets/:id/graph          # Graph-Daten (React Flow Format)
GET    /api/v1/assets/stats              # Statistiken (total, by_type, by_status)
GET    /api/v1/assets/types              # Verfügbare Asset-Typen
```

## Community-Limit

Die Community Edition erlaubt bis zu **50 Assets** pro Tenant.
Bei Erreichen des Limits wird eine Warnung angezeigt.
Alle bestehenden Assets bleiben vollständig nutzbar.
