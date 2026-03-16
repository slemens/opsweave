# OpsWeave — Roadmap

> Konsolidierter Backlog aller geplanten Features, Verbesserungen und technischen Schulden.
> Stand: v0.5.8 — März 2026

---

## Legende

| Kürzel | Bedeutung |
|--------|-----------|
| `[FB]` | Aus direktem User-Feedback / Feedbackboard |
| `[CE]` | Community Edition |
| `[EE]` | Enterprise Edition (kostenpflichtig) |

---

## Kurzfristig (Q2 2026)

### File-Attachments (übergreifend) `[FB]`
- File-Upload an Tickets, Assets, Kunden, Projekte, KB-Artikel
- Drag & Drop im Kommentar-Editor
- Inline-Vorschau für Bilder, Download für andere Dateien
- Storage-Backend: Lokales Filesystem oder S3-kompatibel
- Schema: `attachments` Tabelle mit polymorphem FK (entity_type + entity_id)
- *Quelle: Marcus (Projekte, Kunden), Feedbackboard (Attachments an CIs)*

### Zeiterfassung am Ticket `[FB]` `[CE]`
- Zeitbuchungen pro Ticket: Start/Stop oder manuelle Eingabe
- Kategorien: Bearbeitung, Reisezeit, Wartezeit, Extern
- Auswertung pro Agent, Kunde, Zeitraum
- Export (CSV) für Weiterverarbeitung / Abrechnung
- *Quelle: Marcus*

### Mehrere Assets pro Ticket `[FB]`
- 1:n Verknüpfung Ticket ↔ Assets (aktuell 1:1)
- Auswahl-Dialog mit Mehrfachselektion
- Anzeige aller verknüpften Assets im Ticket-Detail
- *Quelle: Feedbackboard*

### Erweiterte Kundeninformationen `[FB]`
- Freitextfeld für Kommentare/Hinweise am Kunden
- Support-/Wartungsverträge am Asset: Art, Lieferant, Umfang, Laufzeit, Kosten, Kündigungsfrist
- Lieferanten/Firmen als eigener Entitätstyp (Umbau "Kunden" → "Organisationen" mit Typ: Kunde, Lieferant, Partner)
- *Quelle: Marcus, Feedbackboard (Support-Vertrag, Lieferanten)*

### SLA-Inline-Anzeige `[FB]`
- SLA-Definitionen als Hover-Info / Tooltip an relevanten Stellen (Ticket-Detail, Asset, Kunden-Übersicht)
- Nicht mehr nur in Einstellungen versteckt
- *Quelle: Marcus*

### Projekte erweitern `[FB]`
- Beschreibungsfeld (Markdown)
- File-Attachments (siehe oben)
- *Quelle: Marcus*

### Bug-Fixes aus Feedback `[FB]`
- ~~Topologie WSOD beim Klick auf Knoten~~ ✅ behoben (v0.5.8)
- ~~Webhook-URL Copy-Button ohne Funktion~~ ✅ behoben (v0.5.8)
- Fehler beim Auswählen von Asset-Typ "Software-Paket" (Feedbackboard)
- Erweiterte Felder für Changes: Anzeige aller Entscheider/Freigebender mit Ergebnis
- *Quelle: Marcus, Feedbackboard*

---

## Mittelfristig (Q3 2026)

### Wissensdatenbank: Solution Tree `[FB]` `[CE]`
- Strukturierter Entscheidungsbaum: Symptom → Diagnose → Lösung
- Visueller Editor (Baumstruktur oder Flowchart)
- Optimiert für Runbook-Support im Service Desk
- Artikel ↔ Kunden Zuordnung ("relevant für Kunde X")
- *Quelle: Marcus*

### Automatisierte Inventarisierung & Konfigurationsvergleich `[FB]`
- API-Endpunkte für Bulk-Import von Scan-Ergebnissen (Discovery-Tools, Agents, Scripts)
- Versionierung von Asset-Konfigurationen (Snapshots)
- Delta-Ansicht: "Was hat sich seit dem letzten Scan geändert?"
- Mehrere Softwarestände einer Komponente anzeigen + vergleichen
- *Quelle: Klaus, Feedbackboard (Softwarestände, Inventarisierung)*

### Zertifikatsmanagement `[FB]` `[CE]`
- Zertifikate als First-Class Assets (bereits als Typ vorhanden)
- Ablaufdatum-Monitoring mit Dashboard-Widget
- Mail-Reminder an Gruppe: dreistufig (z.B. 90/30/7 Tage)
- *Quelle: Feedbackboard*

### Lizenzmanagement `[FB]` `[CE]`
- Lizenz-Metering und Bestandsverwaltung
- Abfrage von Software-Versionen über alle Systeme
- Übersicht: Lizenzen vs. Installationen (Über-/Unterlizenzierung)
- *Quelle: Feedbackboard*

### Impact-Analyse / Ausfallsimulation `[FB]`
- "Als Ausfall markieren" in der Topologie → betroffene Services/Assets per Graphtraversierung anzeigen
- Simulation: "Was passiert wenn Knoten X ausfällt?"
- Visualisierung in der Topologie-Ansicht (rot markierte Pfade)
- *Quelle: Feedbackboard*

### SLA-Reports Baukasten `[FB]` `[EE]`
- Konfigurierbarer Report-Builder mit Filterkriterien
- Individuelle Auswertungen zusammenstellen
- Export: CSV, PDF
- Automatische Report-Generierung (Zeitgesteuert, z.B. monatlich)
- *Quelle: Marcus, Feedbackboard*

### Reporting & Datenqualität `[FB]` `[EE]`
- Governance-Dashboard: Datenqualitäts-Checks (Vollständigkeit, Aktualität, Dubletten)
- Stichproben-Generator für Audits
- Konfigurierbarer Export (Oberfläche + API)
- Anbindung an externe BI-Tools via API
- *Quelle: Klaus, Feedbackboard*

### Services modellieren `[FB]`
- Komplette Services als Verbund aus Assets + Relations modellieren
- Service-Health aus darunterliegenden CIs ableiten
- Service-Level-Ansicht im Dashboard
- *Quelle: Feedbackboard*

### Umgebungen als CI-Typ `[FB]`
- "Umgebung" (DEV, TEST, PROD) als eigenständiges CI, nicht nur als Feld
- Beziehungen: Assets → Umgebung
- Filter und Ansichten pro Umgebung
- *Quelle: Feedbackboard*

### Asset-Status: Einrichtungs-Checkliste `[FB]`
- Zusätzlich zu operativen Status (Aktiv, Wartung, ...) funktionale Checkliste
- Konfigurierbare Schritte pro Asset-Typ (z.B. "Backup konfiguriert", "Monitoring eingerichtet")
- *Quelle: Feedbackboard*

### Verlinkung CIs ↔ Kundenverträge ↔ SLAs `[FB]`
- Service X → Kundenvertrag Y → SLA-Definitionen
- SLAs aus Vertragsinformationen ableiten statt manuell zuweisen
- *Quelle: Feedbackboard*

---

## Langfristig (Q4 2026+)

### Systemanbindungen / Connectoren `[FB]` `[EE]`
- **Kaufmännisch:** SAP, addocuments, CRM-Systeme (bidirektionaler Sync)
- **Technisch:** Monitoring (Check_MK ✅, Zabbix, Prometheus, PRTG), Discovery-Tools
- **Integrationsplattform:** Native Webhook-API + Connector-Framework, kompatibel mit n8n, Zapier
- *Quelle: Klaus*

### OIDC/SAML Authentifizierung `[EE]`
- passport-openidconnect für Azure AD, Keycloak, Okta
- OIDC User+Group Sync
- SCIM Provisioning

### Rackbelegung / Datacenter-Visualisierung `[FB]`
- Grafische Rack-Ansicht mit Slot-Belegung
- Drag & Drop Platzierung von Assets
- Datacenter-Grundriss optional
- *Quelle: Feedbackboard*

### Risikobewertung in Tickets `[FB]`
- Klarere Definition: Ausfallwahrscheinlichkeit × Impact
- Risikomatrix-Visualisierung
- Automatische Berechnung aus Asset-Kritikalität + Impact-Analyse
- *Quelle: Feedbackboard*

### Globale Volltextsuche
- Übergreifende Suche über Tickets, Assets, KB-Artikel, Kunden, Services
- Typeahead mit Ergebnis-Kategorien

### Auto-Assignment-Rules
- Regeln: Kategorie/Asset/SLA-Tier → automatische Gruppenzuweisung
- Konfigurierbar pro Tenant

---

## Technische Schulden

### Sicherheit
- Rate-Limiting auf Login-Endpoints (5 req/min statt global)
- LIKE-Wildcard-Injection escapen (`%`, `_` in Suchfeldern)
- Login-Fehlermeldung vereinheitlichen (kein SSO-Status leaken)
- UNIQUE-Constraint auf Portal-Email (tenant_id, email)

### Datenintegrität
- Race Condition bei Ticket-Nummern (DB-Level Sequence oder Lock)
- Ticket-Nummern-Logik DRY extrahieren

### Performance
- N+1 Query in Asset-Relations → Batch-Query
- React.memo auf Ticket-Board-Cards
- Request-Timeout im API-Client (AbortController, 30s)

### Frontend
- Form-Validation: Zod + react-hook-form für Inline-Fehlermeldungen
- Chart-Farben an Dark Mode anpassen (CSS Variables statt Hex)
- Unit-Tests: Vitest für Backend-Services (Ziel: 80% Coverage)

### Architektur (langfristig)
- Event-Bus für Modul-Kommunikation
- OpenTelemetry Instrumentation
- Redis Cache Layer
- HA-Deployment Dokumentation
- Optimistic Locking (Version-Feld + ETag)

---

## Erledigtes (seit v0.4.6)

- ✅ Comprehensive Seed-Daten + Major Incident Visibility (v0.5.0)
- ✅ 182 E2E-Tests, 100% Pass Rate (v0.5.1)
- ✅ Audit Trail (hash-verkettet, tamper-evident) (v0.5.1)
- ✅ httpOnly Cookie Auth + CSRF-Schutz (v0.5.1)
- ✅ Erweiterbares Asset-Type-System (v0.5.2)
- ✅ Multi-Tenant Asset Assignment (v0.5.2)
- ✅ Erweiterte SLA-Definitionen (v0.5.2)
- ✅ Service Scope Items (v0.5.2)
- ✅ Relation-History + Edge Properties (v0.5.3)
- ✅ Kapazitätsplanung (v0.5.3)
- ✅ Cross-Framework-Mappings + CSV Import/Export (v0.5.4)
- ✅ Compliance-Dashboard + Audit-Export (v0.5.4)
- ✅ Architecture Decision Records (v0.5.4)
- ✅ i18n-Bereinigung + Accessibility (v0.5.5)
- ✅ CI-Pipeline (v0.5.5)
- ✅ HSTS/CSP/Cookie-Fix für HTTP-only Deployments (v0.5.6–v0.5.8)
- ✅ Topologie WSOD Fix + Webhook Copy Fix (v0.5.8)
- ✅ Session-Expiry Auto-Redirect (v0.5.1)
- ✅ Monitoring Integration (Check_MK v1 + v2)
- ✅ System-User für automatische Änderungen
- ✅ Protokollierung/Audit-Log mit Hash-Chain + Export
