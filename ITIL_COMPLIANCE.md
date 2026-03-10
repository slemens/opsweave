# OpsWeave — ITIL 4 Compliance Matrix

> **Version:** 0.2.8 | **Audit-Datum:** 2026-03-10 | **Assessor:** Claude Code (Automated)
> **Bewertungsskala:** ✅ Implementiert | ⚠️ Teilweise | ❌ Fehlend | 🔲 N/A

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [ITIL 4 Service Value Chain](#2-itil-4-service-value-chain)
3. [General Management Practices](#3-general-management-practices)
4. [Service Management Practices](#4-service-management-practices)
5. [Gap-Summary & User Stories](#5-gap-summary--user-stories)
6. [Priorisierter Umsetzungsplan](#6-priorisierter-umsetzungsplan)

---

## 1. Executive Summary

### Gesamtbewertung: 2.8 / 5.0 (Managed)

| Bereich | Score | Bewertung |
|---------|-------|-----------|
| Incident Management | 3.5/5 | Solide Basis, Eskalation fehlt |
| Problem Management | 1.5/5 | Ticket-Typ existiert, keine ITIL-Felder |
| Change Enablement | 2.0/5 | Workflow-Engine vorhanden, kein RFC/CAB |
| Service Request Management | 1.0/5 | Nicht als eigener Prozess implementiert |
| Service Configuration Mgmt (CMDB) | 4.0/5 | Stärkster Bereich — DAG, SLA-Vererbung |
| Service Level Management | 3.5/5 | SLA-Definitionen & Assignments stark |
| Knowledge Management | 3.5/5 | Gut strukturiert, Analytics fehlt |
| Service Desk | 3.0/5 | E-Mail + Portal, Chat/Phone fehlt |
| Monitoring & Event Management | 1.0/5 | Nur Schema, keine Implementierung |
| IT Asset Management | 2.0/5 | CMDB-Basis, kein Lifecycle/Financial |
| Continual Improvement | 1.0/5 | Dashboard-KPIs, kein CSI-Register |
| Information Security Mgmt | 2.5/5 | RBAC + Audit, keine Verschlüsselung |
| Release Management | 0.5/5 | Change-Tickets, kein Release-Prozess |
| Availability Management | 0.5/5 | Keine Implementierung |
| Capacity & Performance Mgmt | 0.0/5 | Keine Implementierung |

### Stärken
- Asset-zentriertes Datenmodell mit DAG-Relationen und SLA-Vererbung
- ITIL-konforme Priority-Matrix (Impact × Urgency)
- Mehrstufiges SLA-Assignment (Asset → Kunde+Service → Kunde → Service → Default)
- Vollständiger Audit-Trail auf Ticket-Ebene
- Multi-Tenant-Isolation auf allen Entitäten
- Workflow-Engine mit 5 Step-Types und Auto-Trigger

### Kritische Lücken
- Kein Service-Request-Management (kein Ticket-Typ `request`)
- Kein Problem-Management (keine Root-Cause, Known-Error, Workaround-Felder)
- Monitoring-Modul nur als Schema, nicht operationalisiert
- Keine automatische Eskalation (zeit- oder regelbasiert)
- Kein Release-Management-Prozess

---

## 2. ITIL 4 Service Value Chain

Die ITIL 4 Service Value Chain besteht aus 6 Aktivitäten. Hier die Abdeckung durch OpsWeave:

| Value Chain Activity | Status | OpsWeave-Abdeckung |
|---------------------|--------|-------------------|
| **Plan** | ⚠️ Teilweise | Dashboard-KPIs, Compliance-Matrix. Kein strategisches Portfolio-Management, keine Kapazitätsplanung. |
| **Improve** | ❌ Fehlend | Kein Improvement-Register, keine CSI-Initiativen, keine Feedback-Loops, keine Trend-Analyse. |
| **Engage** | ⚠️ Teilweise | Kundenportal (Ticket-Einsicht + Kommentare), Service Catalog (Horizontal + Vertikal). Kein Self-Service-Request-Ordering, keine Satisfaction-Surveys. |
| **Design & Transition** | ⚠️ Teilweise | Service Catalog mit Scope-Definition, Compliance-Mapping. Kein Release-Management, keine Deployment-Orchestrierung. |
| **Obtain/Build** | ❌ Fehlend | Kein Vendor-Management, kein Procurement-Tracking, keine Build-/Deploy-Pipeline-Integration. |
| **Deliver & Support** | ✅ Stark | Incident/Change/Problem-Tickets, SLA-Tracking, E-Mail-Inbound, Knowledge Base, Workflow-Engine, CMDB. Kernstärke von OpsWeave. |

---

## 3. General Management Practices

### 3.1 Service Level Management

**Status: ⚠️ Teilweise implementiert (Score: 3.5/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| SLA-Definitionen | `packages/backend/src/db/schema/sla.ts:11-39` | Response-/Resolution-Time, Business Hours (24/7, business, extended), Business Days |
| Priority-Overrides | `sla.ts:30` | JSON-Feld für priority-spezifische Zeiten (z.B. Critical: 15min Response) |
| SLA-Assignments (5-stufig) | `sla.ts:44-77` | Asset (P100) → Kunde+Service (P75) → Kunde (P50) → Service (P25) → Default |
| SLA-Resolution-Engine | `sla.service.ts:323-411` | `resolveEffectiveSla()` — hierarchische Auflösung |
| SLA-Vererbung (DAG) | `lib/db-specific/sqlite.ts:27-109` | Multi-Hop-Traversal (max 5 Ebenen) über Asset-Hierarchie |
| Ticket-SLA-Tracking | `db/schema/tickets.ts:59-62` | `sla_response_due`, `sla_resolve_due`, `sla_breached` |
| SLA-Management-UI | `SettingsPage.tsx` (SLA-Tab) | Definitionen + Zuweisungen CRUD |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| SLA-Breach-Worker | **Must** | Kein Background-Worker der SLA-Verletzungen automatisch erkennt und `sla_breached` setzt |
| SLA-Reporting | **Must** | Keine SLA-Performance-Reports (%-Einhaltung pro Zeitraum, pro Kunde, pro Service) |
| SLA-Review-Meetings | **Should** | Kein Workflow für periodische SLA-Reviews mit Kunden |
| OLA/UC-Support | **Should** | Keine Operational Level Agreements oder Underpinning Contracts |
| SLA-Pause bei Pending | **Should** | SLA-Timer läuft weiter wenn Ticket auf `pending` steht (Warten auf Kundenantwort) |
| Business-Hours-Kalender | **Could** | Keine Feiertags-Definition, kein Kalender-Import |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| SLA-Definitionen | ✅ | ✅ | ✅ | ✅ |
| Priority-basierte SLA | ✅ | ✅ | ✅ | ⚠️ |
| SLA-Vererbung (Asset-DAG) | ✅ | ❌ | ❌ | ❌ |
| Automatische Breach-Detection | ❌ | ✅ | ✅ | ✅ |
| SLA-Pause (Pending) | ❌ | ✅ | ✅ | ✅ |
| Business-Hours-Kalender | ⚠️ | ✅ | ✅ | ✅ |
| SLA-Reports/Dashboard | ❌ | ✅ | ✅ | ✅ |
| OLA/UC | ❌ | ✅ | ❌ | ⚠️ |
| Kunden-spezifische SLA | ✅ | ✅ | ✅ | ✅ |

> **OpsWeave-Alleinstellung:** SLA-Vererbung über die Asset-Hierarchie (DAG-Traversal). Kein Wettbewerber bietet das nativ.

---

### 3.2 Information Security Management

**Status: ⚠️ Teilweise implementiert (Score: 2.5/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Authentifizierung (Local) | `auth.service.ts:18` | bcrypt mit 12 Salt-Rounds |
| OIDC (Enterprise) | `users.ts:13-14` | `auth_provider: 'oidc'`, `external_id` |
| RBAC (Tenant-scoped) | `users.ts:26-43` | 4 Rollen: admin, manager, agent, viewer |
| Multi-Tenant-Isolation | Alle Schema-Dateien | `tenant_id` auf jeder Entitätstabelle, Middleware-Filter |
| Audit-Trail (Tickets) | `tickets.ts:119-139` | Field-Level-History mit Actor + Timestamp |
| Portal-User-Isolation | `users.ts:78-93` | Separate Tabelle `customerPortalUsers`, sieht nur eigene Tickets |
| Super-Admin | `users.ts:17` | `is_superadmin` für Cross-Tenant-Zugriff |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| 2FA/MFA | **Must** | Kein TOTP oder FIDO2 Support |
| Passwort-Policy | **Must** | Keine Mindestlänge, Komplexität, Ablauf, History |
| Security-Incident-Typ | **Should** | Kein dedizierter `security_incident` Ticket-Typ |
| Systemweites Audit-Log | **Must** | Nur Ticket-History, keine Login/Logout/Permission-Change-Logs |
| Feldverschlüsselung | **Should** | E-Mail-Config-Credentials als Plaintext-JSON gespeichert |
| Session-Management | **Should** | Kein Refresh-Token-Rotation, keine Session-Revocation |
| IP-Whitelisting | **Could** | Kein IP-basierter Zugriffsschutz |
| Data Classification | **Could** | Keine Vertraulichkeitsstufen auf Tickets |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| RBAC | ✅ | ✅ | ✅ | ✅ |
| Multi-Tenant-Isolation | ✅ | ✅ | ⚠️ | ❌ |
| 2FA/MFA | ❌ | ✅ | ✅ | ⚠️ |
| OIDC/SAML | ✅ (Enterprise) | ✅ | ✅ | ✅ |
| Audit-Trail | ⚠️ | ✅ | ✅ | ⚠️ |
| Feldverschlüsselung | ❌ | ✅ | ✅ | ❌ |
| Passwort-Policy | ❌ | ✅ | ✅ | ✅ |
| Security-Incidents | ❌ | ✅ | ⚠️ | ❌ |

---

### 3.3 Knowledge Management

**Status: ⚠️ Teilweise implementiert (Score: 3.5/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Artikel-CRUD | `kb.service.ts:40-150` | Erstellen, Bearbeiten, Löschen mit Markdown-Content |
| Artikel-Lifecycle | `knowledge-base.ts:23` | `draft` → `published` → `archived` |
| Visibility-Control | `knowledge-base.ts:22` | `internal` (nur Agenten) vs. `public` (Portal) |
| Kategorien & Tags | `knowledge-base.ts:20-21` | Kategorie-Feld + JSON-Tag-Array |
| Slug-Management | `kb.service.ts:40-96` | URL-safe Auto-Slugs mit Uniqueness |
| Ticket-Verlinkung | `knowledge-base.ts:44-63` | Junction-Table `kb_article_links` (Artikel ↔ Ticket) |
| Portal-Zugang | Portal-Routes | Nur `visibility='public'` Artikel sichtbar |
| Suche | `kb.service.ts` | Filter nach Titel, Kategorie, Tags |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Artikel-Bewertung | **Should** | Keine Helpfulness-Ratings (Daumen hoch/runter) |
| Nutzungsanalytics | **Should** | Kein View-Count, keine "meistgelesene Artikel"-Ansicht |
| KCS-Automation | **Should** | Kein automatischer Artikelvorschlag bei Ticket-Erstellung |
| Volltext-Suche | **Must** | Keine gewichtete Volltextsuche (nur LIKE-basiert) |
| Review-Workflow | **Could** | Kein 4-Augen-Prinzip für Artikel-Veröffentlichung |
| Versionierung | **Could** | Keine Artikel-History, kein Diff zwischen Versionen |
| Wissens-Gaps | **Could** | Keine Analyse: "Häufige Tickets ohne KB-Artikel" |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Artikel-CRUD | ✅ | ✅ | ✅ | ✅ |
| Visibility Control | ✅ | ✅ | ✅ | ⚠️ |
| Ticket-Verlinkung | ✅ | ✅ | ✅ | ⚠️ |
| Portal-Zugang | ✅ | ✅ | ✅ | ✅ |
| KCS-Workflow | ❌ | ✅ | ⚠️ | ❌ |
| Artikelbewertung | ❌ | ✅ | ✅ | ❌ |
| Volltextsuche | ❌ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ⚠️ | ❌ |

---

### 3.4 Continual Improvement

**Status: ❌ Fehlend (Score: 1.0/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Dashboard-KPIs | `DashboardPage.tsx` | Offene Tickets, SLA-Breaches, Timeline-Chart, Top-5-Kunden |
| Ticket-Timeline | `GET /tickets/stats/timeline` | 30-Tage-Trend-Chart |
| Ticket-by-Customer | `GET /tickets/stats/by-customer` | Horizontales Bar-Chart |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Improvement-Register | **Must** | Tabelle für Verbesserungsinitiativen (proposed → approved → in_progress → done) |
| CSI-Metriken | **Must** | Konfigurierbare KPIs mit Zielwerten und Trend-Tracking |
| Post-Incident-Review | **Should** | Kein PIR-Workflow nach Major Incidents |
| Kundenzufriedenheit | **Should** | Keine Surveys, kein CSAT/NPS |
| Trend-Analyse | **Should** | Keine Anomalie-Erkennung, keine Saisonalität |
| Lessons Learned | **Could** | Kein Repository für gewonnene Erkenntnisse |
| Automatische Reports | **Could** | Keine zeitgesteuerten Report-Generierung (PDF/E-Mail) |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Dashboard-KPIs | ⚠️ | ✅ | ✅ | ⚠️ |
| Improvement-Register | ❌ | ✅ | ❌ | ❌ |
| CSAT-Surveys | ❌ | ✅ | ✅ | ❌ |
| Trend-Analyse | ❌ | ✅ | ⚠️ | ❌ |
| Automatische Reports | ❌ | ✅ | ✅ | ✅ |
| Post-Incident-Review | ❌ | ✅ | ⚠️ | ❌ |

---

## 4. Service Management Practices

### 4.1 Incident Management

**Status: ⚠️ Teilweise implementiert (Score: 3.5/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Incident-Lifecycle | `tickets.ts:45` | `open` → `in_progress` → `pending` → `resolved` → `closed` |
| Priority-Matrix (ITIL) | `shared/constants/index.ts:42-55` | Impact × Urgency = Priority (4×4 Matrix) |
| Auto-Priority-Berechnung | `tickets.service.ts:403-408` | Automatisch bei Create/Update wenn Impact + Urgency gesetzt |
| SLA-Tracking | `tickets.ts:59-62` | Response-Due, Resolve-Due, Breached-Flag |
| Zuweisungen | `tickets.ts:53-55` | Einzelperson (assignee_id) + Gruppe (assignee_group_id) |
| Kommentare | `tickets.ts:91-113` | Intern/Extern, Source-Tracking (agent/customer/email/system) |
| Audit-Trail | `tickets.ts:119-139` | Field-Level-History aller Änderungen |
| Source-Tracking | `tickets.ts:64` | manual, email, monitoring, api, portal |
| Asset-Verknüpfung | `tickets.ts:52` | `asset_id` FK zu CMDB |
| Kunden-Zuordnung | `tickets.ts:56` | `customer_id` FK zu Customers |
| Ticket-Nummern | `tickets.service.ts` | INC-YYYY-NNNNN (automatisch, typ-abhängig) |
| Parent-Child-Tickets | `tickets.ts:63` | `parent_ticket_id` für Verknüpfungen |
| Board-Ansicht | `TicketBoardPage.tsx` | Kanban mit 5 Spalten, Drag & Drop |
| Workflow-Auto-Trigger | `tickets.service.ts:462-465` | Workflow-Instanz bei Ticket-Erstellung |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Automatische Eskalation | **Must** | Keine zeit- oder regelbasierte Eskalation (z.B. nach 80% SLA-Zeit → Eskalation an nächste Gruppe) |
| Major-Incident-Prozess | **Must** | Subtype `major` existiert, aber keine spezielle Behandlung (Bridge-Call, Stakeholder-Benachrichtigung, dedizierter Incident-Manager) |
| Status-State-Machine | **Should** | Jeder Statusübergang erlaubt — keine erzwungene Reihenfolge (z.B. `open` → `closed` direkt möglich) |
| Kategorisierung (mehrstufig) | **Should** | Nur eine Kategorie-Ebene, kein hierarchisches Kategorieschema (Kategorie → Subkategorie → Item) |
| Benachrichtigungen | **Must** | Keine E-Mail/Push-Notifications bei Statusänderungen, Zuweisung, Kommentaren |
| Incident-Matching | **Should** | Keine Erkennung ähnlicher/doppelter Incidents |
| Re-Open-Tracking | **Could** | Kein Zähler für Wiedereröffnungen |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Incident-Lifecycle | ✅ | ✅ | ✅ | ✅ |
| Priority-Matrix (ITIL) | ✅ | ✅ | ⚠️ | ✅ |
| Auto-Eskalation | ❌ | ✅ | ✅ | ✅ |
| Major-Incident-Prozess | ❌ | ✅ | ⚠️ | ❌ |
| SLA-Tracking | ✅ | ✅ | ✅ | ✅ |
| Notifications | ❌ | ✅ | ✅ | ✅ |
| Kanban-Board | ✅ | ✅ | ✅ | ❌ |
| Parent-Child | ✅ | ✅ | ✅ | ✅ |
| Duplicate Detection | ❌ | ✅ | ⚠️ | ❌ |
| Omnichannel-Intake | ⚠️ | ✅ | ⚠️ | ⚠️ |

---

### 4.2 Problem Management

**Status: ❌ Fehlend (Score: 1.5/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Problem-Ticket-Typ | `shared/constants/index.ts:11` | `ticket_type: 'problem'` existiert |
| Problem-Lifecycle | `tickets.ts:45` | Gleicher Status-Flow wie Incidents |
| Parent-Child-Verknüpfung | `tickets.ts:63` | Incidents können via `parent_ticket_id` an Problems gehängt werden |
| Audit-Trail | `tickets.ts:119-139` | Änderungshistorie wie bei Incidents |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Root-Cause-Analyse-Feld | **Must** | Kein `root_cause` Textfeld auf Problem-Tickets |
| Known-Error-Database (KEDB) | **Must** | Keine Tabelle `known_errors` (Problem-ID + Symptom + Workaround + Status) |
| Workaround-Feld | **Must** | Kein `workaround` Textfeld, das bei Incidents angezeigt wird |
| Problem-Kategorisierung | **Should** | Keine problem-spezifischen Kategorien (z.B. Infrastruktur, Software, Prozess) |
| Proaktives Problem-Mgmt | **Should** | Keine Trend-Analyse zur Erkennung wiederkehrender Incidents |
| Problem-Incident-Linking | **Should** | Parent-Child existiert, aber kein dedizierter "Related Incidents"-View auf Problem-Tickets |
| Known-Error-im-Incident | **Must** | Kein Feld `known_error_id` auf Incidents, das auf den bekannten Fehler verweist |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Problem-Ticket-Typ | ✅ | ✅ | ✅ | ✅ |
| Root-Cause-Analyse | ❌ | ✅ | ⚠️ | ⚠️ |
| Known-Error-DB | ❌ | ✅ | ❌ | ❌ |
| Workaround-Tracking | ❌ | ✅ | ⚠️ | ⚠️ |
| Incident-Problem-Linking | ⚠️ | ✅ | ✅ | ✅ |
| Proaktives Problem-Mgmt | ❌ | ✅ | ❌ | ❌ |
| Problem-Review-Board | ❌ | ✅ | ❌ | ❌ |

---

### 4.3 Change Enablement

**Status: ⚠️ Teilweise implementiert (Score: 2.0/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Change-Ticket-Typ | `shared/constants/index.ts:11` | `ticket_type: 'change'` |
| Change-Subtypes | `shared/constants/index.ts:57-63` | `standard`, `normal`, `emergency` (als Subtypes) |
| Workflow-Engine | `db/schema/workflows.ts` | Templates mit Approval/Form/Routing/Condition/Automatic Steps |
| Auto-Trigger | `tickets.service.ts:462-465` | Workflow-Instanziierung bei Change-Erstellung |
| Change-Lifecycle | `tickets.ts:45` | open → in_progress → pending → resolved → closed |
| Audit-Trail | `tickets.ts:119-139` | Vollständige Änderungshistorie |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| RFC-Formular | **Must** | Kein formalisiertes Request-for-Change-Formular (Begründung, Risiko, Zeitplan, Rollback-Plan) |
| CAB-Prozess | **Must** | Kein Change Advisory Board — Approval-Step existiert in Workflow, aber kein CAB-Gremium-Konzept |
| Risikobewerung | **Must** | Keine Risiko-Matrix (Wahrscheinlichkeit × Impact) für Changes |
| Rollback-Plan | **Must** | Kein `rollback_plan` Feld, keine Rollback-Dokumentation |
| Change-Kalender | **Should** | Keine Kalender-Ansicht geplanter Changes (Blackout-Windows, Maintenance-Fenster) |
| Impact-Analyse (CMDB) | **Should** | CMDB-Graph existiert, wird aber nicht automatisch zur Change-Impact-Analyse genutzt |
| Standard-Change-Katalog | **Should** | Keine vorgenehmigten Standard-Changes die ohne CAB durchlaufen |
| Post-Implementation-Review | **Should** | Kein PIR-Workflow nach Change-Abschluss |
| Change-Success-Rate | **Could** | Keine Metrik "erfolgreiche vs. gescheiterte Changes" |
| Emergency-Change-Prozess | **Should** | Subtype `emergency` existiert, aber kein beschleunigter Genehmigungsprozess |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Change-Ticket-Typ | ✅ | ✅ | ✅ | ✅ |
| Change-Types (Std/Norm/Emerg) | ⚠️ | ✅ | ✅ | ⚠️ |
| Workflow-Engine | ✅ | ✅ | ✅ | ⚠️ |
| CAB-Prozess | ❌ | ✅ | ⚠️ | ❌ |
| Risikobewertung | ❌ | ✅ | ⚠️ | ❌ |
| Change-Kalender | ❌ | ✅ | ⚠️ | ❌ |
| CMDB-Impact-Analyse | ❌ | ✅ | ❌ | ⚠️ |
| Rollback-Plan | ❌ | ✅ | ⚠️ | ❌ |
| Standard-Change-Katalog | ❌ | ✅ | ❌ | ❌ |
| PIR | ❌ | ✅ | ⚠️ | ❌ |

---

### 4.4 Service Request Management

**Status: ❌ Fehlend (Score: 1.0/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Service Catalog (3-Tier) | `db/schema/services.ts` | Service Descriptions, Horizontal + Vertical Catalogs |
| Kundenportal | `portal/` Module | Kunden können Tickets erstellen und einsehen |
| Workflow-Engine | `db/schema/workflows.ts` | Könnte für Request-Fulfillment genutzt werden |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Request-Ticket-Typ | **Must** | Kein `ticket_type: 'request'` — Service Requests werden als Incidents behandelt |
| Self-Service-Portal | **Must** | Portal erlaubt Ticket-Erstellung, aber kein "Service bestellen"-Flow aus dem Katalog |
| Request-Katalog-UI | **Must** | Kein "Warenkorb"-Konzept, kein Request-Item-Auswahl |
| Fulfillment-Workflows | **Must** | Kein Mapping: Katalog-Item → Fulfillment-Workflow |
| Request-spezifische SLAs | **Should** | Keine separaten SLA-Definitionen für Service Requests |
| Approval-Workflows | **Should** | Workflow-Engine vorhanden, aber nicht an Katalog-Items gebunden |
| Request-Formulare | **Should** | Keine dynamischen Formulare pro Service-Item |
| Delegation | **Could** | Keine "Bestellen für andere"-Funktion |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Service Request Typ | ❌ | ✅ | ✅ | ✅ |
| Self-Service-Portal | ❌ | ✅ | ✅ | ⚠️ |
| Request-Katalog | ❌ | ✅ | ✅ | ⚠️ |
| Fulfillment-Workflow | ❌ | ✅ | ✅ | ⚠️ |
| Approval-Chains | ❌ | ✅ | ✅ | ⚠️ |
| Dynamische Formulare | ❌ | ✅ | ✅ | ❌ |

---

### 4.5 Service Configuration Management (CMDB)

**Status: ✅ Implementiert (Score: 4.0/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| CI-Typen (24 Typen, 7 Kategorien) | `shared/constants/index.ts:70-103` | Compute, Network, Storage, Infrastructure, Software, End User, Other |
| CI-Lifecycle | `shared/constants/index.ts:106-112` | `active`, `inactive`, `maintenance`, `decommissioned` |
| Beziehungstypen (7) | `shared/constants/index.ts:114+` | `runs_on`, `connected_to`, `stored_on`, `powered_by`, `member_of`, `depends_on`, `backup_of` |
| DAG-Modell | `db/schema/assets.ts:45-69` | Gerichteter azyklischer Graph mit Zyklusprüfung |
| Graph-Traversal (BFS) | `assets.service.ts:602-662` | Connected-Component-Analyse |
| Topology-Visualisierung | `assets.service.ts:667-694` | React Flow Graph-Ansicht |
| SLA-Vererbung via DAG | `lib/db-specific/sqlite.ts:27-109` | Multi-Hop-Traversal (max 5 Ebenen) |
| Asset-Suche & Filter | `assets.service.ts:28-130` | Typ, Status, SLA, Environment, Owner, Customer, IP |
| Asset-Ticket-Verknüpfung | `tickets.ts:52` | `asset_id` auf Tickets |
| Asset-Service-Links | `services.ts:139-154` | Assets mit Service-Katalog-Einträgen verknüpft |
| Asset-Compliance-Flags | `compliance.ts:84-106` | Assets als in-scope für Frameworks markieren |
| Kategorie-Filter (UI) | `AssetsPage.tsx` | Buttons: Alle, Compute, Netzwerk, Storage, etc. |
| Custom Attributes | `assets.ts:27` | JSON-Feld `attributes` für typ-spezifische Daten |
| Community-Limit | `shared/constants` | Max 50 Assets (Community Edition) |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Configuration Baselines | **Should** | Keine Snapshots/Versionen von CI-Konfigurationen |
| CI-Änderungshistory | **Should** | Kein Audit-Trail für Asset-Feldänderungen (nur Ticket-History existiert) |
| Auto-Discovery | **Should** | Schema für Monitoring-Sources existiert, aber kein Discovery-Worker |
| Reconciliation | **Could** | Kein Abgleich: Discovery-Daten vs. CMDB-Daten |
| Configuration-Verification | **Could** | Keine automatische Prüfung ob CI-Konfiguration dem Soll entspricht |
| CI-Type-spezifische Pflichtfelder | **Could** | Attributes ist ein freies JSON-Feld, keine erzwungene Struktur pro Typ |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| CI-Typen-Hierarchie | ✅ | ✅ | ⚠️ | ✅ |
| Beziehungen (DAG) | ✅ | ✅ | ❌ | ⚠️ |
| Graph-Visualisierung | ✅ | ✅ | ❌ | ⚠️ |
| SLA-Vererbung (DAG) | ✅ | ❌ | ❌ | ❌ |
| Auto-Discovery | ❌ | ✅ | ❌ | ✅ |
| Configuration Baselines | ❌ | ✅ | ❌ | ❌ |
| CI-Audit-Trail | ❌ | ✅ | ⚠️ | ✅ |
| Custom Attributes | ✅ | ✅ | ⚠️ | ✅ |
| Compliance-Flags | ✅ | ✅ | ❌ | ❌ |

> **OpsWeave-Alleinstellung:** DAG-basierte SLA-Vererbung + Asset-Compliance-Flags in einem integrierten System.

---

### 4.6 Service Desk

**Status: ⚠️ Teilweise implementiert (Score: 3.0/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| E-Mail-Inbound (IMAP) | `modules/email-inbound/` | IMAP-Poller mit Thread-Matching (In-Reply-To, Subject-Pattern) |
| E-Mail-Webhook | `email.service.ts` | Mailgun + SendGrid Webhook-Provider |
| Kundenportal | `modules/portal/` | Login, Ticket-Einsicht, Kommentare, Ticket-Erstellung |
| API-Intake | `modules/tickets/` | REST API für programmtische Ticket-Erstellung |
| Manuelle Erstellung | `TicketBoardPage.tsx` | Create-Dialog mit allen Feldern |
| Source-Tracking | `tickets.ts:64` | Kanal-Tracking: manual, email, monitoring, api, portal |
| Kategorisierung | `tickets.ts:56` | Kategorie-Zuordnung, Gruppen-Zuweisung |
| Auto-Routing (E-Mail) | `email.ts:20` | `target_group_id` für automatische Zuweisung |
| Thread-Matching | `email.service.ts:73-102` | Bestehende Tickets via Message-ID/Subject erkennen |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Benachrichtigungen | **Must** | Keine E-Mail-Notifications bei Ticket-Änderungen |
| Live-Chat | **Should** | Kein Chat-Widget (Socket.IO vorhanden aber nicht für Chat genutzt) |
| Telefon-Integration | **Could** | Keine CTI/IVR-Anbindung |
| First-Contact-Resolution | **Should** | Kein FCR-Tracking (sofort gelöst bei Erstmeldung?) |
| Hierarchische Kategorien | **Should** | Nur eine Ebene — kein Kategorie → Subkategorie → Item |
| Automatische Kategorisierung | **Could** | Keine KI/Regel-basierte Kategorisierung eingehender Tickets |
| Canned Responses | **Should** | Keine Textbausteine/Vorlagen für häufige Antworten |
| Warteschlangen-Management | **Should** | Kein Queue-Dashboard (Tickets pro Agent, Auslastung) |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| E-Mail-Inbound | ✅ | ✅ | ✅ | ✅ |
| Kundenportal | ✅ | ✅ | ✅ | ✅ |
| API-Intake | ✅ | ✅ | ✅ | ✅ |
| Live-Chat | ❌ | ✅ | ⚠️ | ❌ |
| Telefon/CTI | ❌ | ✅ | ⚠️ | ❌ |
| Notifications | ❌ | ✅ | ✅ | ✅ |
| FCR-Tracking | ❌ | ✅ | ⚠️ | ❌ |
| Kategorien (hierarchisch) | ❌ | ✅ | ✅ | ✅ |
| Canned Responses | ❌ | ✅ | ✅ | ⚠️ |
| Queue-Dashboard | ❌ | ✅ | ✅ | ⚠️ |

---

### 4.7 IT Asset Management

**Status: ⚠️ Teilweise implementiert (Score: 2.0/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Asset-CRUD | `assets.service.ts:28-130` | Erstellen, Lesen, Aktualisieren, Löschen |
| Lifecycle-Status | `shared/constants` | active, inactive, maintenance, decommissioned |
| Typen-Klassifikation | `shared/constants:70-103` | 24 CI-Typen in 7 Kategorien |
| Suchbare Attributes | `assets.ts:27` | JSON-Feld für typ-spezifische Daten |
| Kunden-Zuordnung | `assets.ts:26` | `customer_id` FK |
| Owner-Gruppe | `assets.ts:25` | `owner_group_id` FK |
| Environment | `assets.ts:24` | production, staging, development, test |
| Community-Limit | `shared/constants` | Max 50 Assets |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Financial Tracking | **Should** | Keine Felder: Anschaffungskosten, Abschreibung, Restwert |
| Procurement-Lifecycle | **Should** | Kein Workflow: Bestellung → Lieferung → Installation → Betrieb → Entsorgung |
| Warranty-Tracking | **Should** | Kein Garantie-Ablaufdatum, keine Garantie-Benachrichtigung |
| Software-Lizenz-Management | **Should** | Keine Lizenz-Inventarisierung (installierte Software vs. Lizenzen) |
| Asset-Discovery | **Should** | Kein Netzwerk-Scan oder Agent-basierte Erfassung |
| Standort-Management | **Could** | `location` ist Freitext, keine strukturierte Standort-Hierarchie |
| Asset-Import/Export | **Should** | Kein CSV/Excel-Import, kein Bulk-Update |
| Vertragsverknüpfung | **Could** | Kein `contract_id` Feld, keine Vertragstabelle |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Asset-CRUD | ✅ | ✅ | ⚠️ | ✅ |
| Lifecycle-Status | ✅ | ✅ | ⚠️ | ✅ |
| Financial Tracking | ❌ | ✅ | ❌ | ✅ |
| Software-Lizenzen | ❌ | ✅ | ❌ | ✅ |
| Auto-Discovery | ❌ | ✅ | ❌ | ✅ |
| Asset-Import | ❌ | ✅ | ⚠️ | ✅ |
| Warranty-Tracking | ❌ | ✅ | ❌ | ✅ |
| Vertragsverknüpfung | ❌ | ✅ | ❌ | ✅ |

> **Hinweis:** GLPI ist traditionell stärker im IT Asset Management (Inventarisierung, Finanzen) als im ITSM.

---

### 4.8 Monitoring and Event Management

**Status: ❌ Fehlend (Score: 1.0/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Event-Schema | `db/schema/monitoring.ts:34-62` | `monitoringEvents`: source_id, hostname, service_name, state, output, matched_asset_id, ticket_id |
| Source-Schema | `db/schema/monitoring.ts:10-28` | `monitoringSources`: type (checkmk_v1/v2, zabbix, prometheus, nagios), config, webhook_secret |
| Event-States | `monitoring.ts:37` | ok, warning, critical, unknown |
| Source-Types | `shared/constants:239-246` | checkmk_v1, checkmk_v2, zabbix, prometheus, nagios, other |
| Lizenz-Limit | `shared/constants` | Community: max 1 Monitoring-Source |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Check_MK-Adapter | **Must** | Kein Livestatus (v1) oder REST API (v2) Client implementiert |
| Event-Ingestion-Worker | **Must** | Kein Background-Worker der Events von Quellen abholt/empfängt |
| Event-to-Incident | **Must** | Keine automatische Ticket-Erstellung aus kritischen Events |
| Event-Asset-Matching | **Must** | `matched_asset_id` Feld existiert, aber keine Matching-Logik |
| Event-Korrelation | **Should** | Keine Deduplizierung, kein Flapping-Schutz |
| Event-Lifecycle | **Should** | Kein Acknowledge/Downtime-Handling |
| Alerting-Rules | **Should** | Keine konfigurierbaren Schwellenwerte oder Benachrichtigungsregeln |
| Monitoring-Dashboard | **Should** | Keine Event-Übersicht, kein Status-Dashboard |
| API-Routes | **Must** | `// TODO: mount remaining module routes` in `routes/index.ts:60-61` |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Event-Ingestion | ❌ | ✅ | ⚠️ | ⚠️ |
| Auto-Incident | ❌ | ✅ | ⚠️ | ⚠️ |
| Event-Korrelation | ❌ | ✅ | ❌ | ❌ |
| Check_MK-Integration | ❌ | ❌ | ❌ | ⚠️ |
| Multi-Source | ⚠️ (Schema) | ✅ | ⚠️ | ⚠️ |
| Event-Dashboard | ❌ | ✅ | ⚠️ | ⚠️ |

---

### 4.9 Release Management

**Status: ❌ Fehlend (Score: 0.5/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| Change-Tickets | `tickets.ts` | `ticket_type: 'change'` als Basis |
| Workflow-Engine | `workflows.ts` | Könnte für Release-Approval genutzt werden |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Release-Entität | **Should** | Keine `releases`-Tabelle (Release bündelt mehrere Changes) |
| Release-Planung | **Should** | Kein Release-Kalender, keine Zeitplanung |
| Deployment-Tracking | **Should** | Kein Tracking: welcher Change auf welchem Asset deployed |
| Rollback-Prozedur | **Should** | Keine Rollback-Dokumentation und -Auslösung |
| Release-Types | **Could** | Keine Unterscheidung: Major/Minor/Patch/Emergency Release |
| Release-Gates | **Could** | Keine Quality-Gates (Test → Staging → Production) |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Release-Entität | ❌ | ✅ | ⚠️ | ❌ |
| Release-Kalender | ❌ | ✅ | ⚠️ | ❌ |
| Deployment-Tracking | ❌ | ✅ | ⚠️ | ❌ |
| Rollback | ❌ | ✅ | ⚠️ | ❌ |
| CI/CD-Integration | ❌ | ✅ | ✅ | ❌ |

---

### 4.10 Availability Management

**Status: ❌ Fehlend (Score: 0.5/5)**

#### Implementiert
| Feature | Code-Referenz | Details |
|---------|---------------|---------|
| SLA-Definitionen | `sla.ts` | Response-/Resolution-Zeiten (aber keine Verfügbarkeits-%) |

#### Fehlend für ITIL-Konformität
| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Verfügbarkeits-Ziele | **Should** | Keine Uptime-%-Ziele pro Service/Asset (z.B. 99.9%) |
| Uptime-Tracking | **Should** | Keine Berechnung der tatsächlichen Verfügbarkeit aus Incidents |
| MTBF/MTRS | **Should** | Keine Mean Time Between Failures / Mean Time to Restore |
| Availability-Reports | **Could** | Keine Verfügbarkeitsberichte pro Zeitraum |
| Dependency-Impact | **Could** | CMDB-Graph vorhanden, aber keine Berechnung: "Ausfall Asset X → Welche Services betroffen?" |

#### Vergleich mit Wettbewerbern

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Verfügbarkeits-Ziele | ❌ | ✅ | ❌ | ❌ |
| Uptime-Berechnung | ❌ | ✅ | ❌ | ❌ |
| MTBF/MTRS | ❌ | ✅ | ❌ | ❌ |
| Availability-Reports | ❌ | ✅ | ❌ | ❌ |

> **Hinweis:** Availability Management ist auch bei JSM und GLPI kaum implementiert. Dies ist eine ServiceNow-Domäne.

---

### 4.11 Capacity and Performance Management

**Status: ❌ Fehlend (Score: 0.0/5)**

Keine Implementierung vorhanden. Seed-Daten enthalten informelle Kapazitätswerte (z.B. `capacity_tb: 96` in Asset-Attributes), diese sind aber nicht querybar oder auswertbar.

| Gap | Priorität | Beschreibung |
|-----|-----------|-------------|
| Performance-Metriken | **Could** | Keine Metrik-Erfassung (CPU, RAM, Disk, Netzwerk) |
| Kapazitätsplanung | **Could** | Keine Trend-Analyse, kein Forecasting |
| Schwellenwerte | **Could** | Keine Schwellenwert-Definition und -Überwachung |
| Utilization-Reports | **Could** | Keine Ressourcenauslastungsberichte |

> **Hinweis:** Dies wird typischerweise von Monitoring-Tools (Check_MK, Zabbix, Prometheus) abgedeckt, nicht vom ITSM-Tool selbst. OpsWeave plant Integration, nicht Eigenentwicklung.

---

## 5. Gap-Summary & User Stories

### Must-Have (25 User Stories)

#### Incident Management
```
US-INC-01: Als Agent möchte ich automatische Eskalation nach 80% SLA-Zeit,
           damit kritische Tickets nicht unbemerkt verfallen.
           Akzeptanz: Hintergrund-Worker prüft alle 60s, eskaliert an
           nächste Gruppe + Benachrichtigung.

US-INC-02: Als Incident-Manager möchte ich einen Major-Incident-Prozess,
           damit P1-Incidents koordiniert bearbeitet werden.
           Akzeptanz: Subtype "major" triggert separaten Workflow
           (Bridge-Call, Stakeholder-Notification, dedizierter Manager).

US-INC-03: Als Agent möchte ich E-Mail-Benachrichtigungen bei
           Ticket-Änderungen erhalten, damit ich keine Updates verpasse.
           Akzeptanz: Konfigurierbarer Notification-Service
           (Zuweisung, Status, Kommentar).
```

#### Problem Management
```
US-PRB-01: Als Problem-Manager möchte ich Root-Cause auf Problem-Tickets
           dokumentieren, damit die Ursache für wiederkehrende Incidents
           nachvollziehbar ist.
           Akzeptanz: Textfeld "root_cause" auf Problem-Tickets,
           in Detail-Ansicht sichtbar.

US-PRB-02: Als Agent möchte ich Known Errors mit Workarounds pflegen,
           damit Incidents schneller gelöst werden können.
           Akzeptanz: KEDB-Tabelle (known_errors) mit Symptom +
           Workaround + Status, verlinkt mit Problem-Tickets.
           Workaround wird bei verknüpften Incidents angezeigt.

US-PRB-03: Als Agent möchte ich beim Erstellen eines Incidents bekannte
           Fehler vorgeschlagen bekommen, damit ich schneller zur Lösung komme.
           Akzeptanz: Feld "known_error_id" auf Incident-Tickets,
           Dropdown mit KEDB-Einträgen, Workaround automatisch angezeigt.
```

#### Change Enablement
```
US-CHG-01: Als Change-Manager möchte ich ein RFC-Formular mit Pflichtfeldern
           (Begründung, Risiko, Zeitplan, Rollback), damit Changes strukturiert
           beantragt werden.
           Akzeptanz: Erweiterte Felder auf Change-Tickets: justification,
           risk_level, implementation_plan, rollback_plan, planned_start,
           planned_end.

US-CHG-02: Als Change-Manager möchte ich eine Risikobewertung pro Change,
           damit das CAB fundierte Entscheidungen treffen kann.
           Akzeptanz: Risiko-Matrix (likelihood × impact) mit automatischer
           Risikostufe (low/medium/high/critical).

US-CHG-03: Als CAB-Mitglied möchte ich Changes in einem Approval-Board
           sehen und genehmigen/ablehnen, damit der Change-Prozess
           transparent ist.
           Akzeptanz: CAB-Dashboard mit ausstehenden Changes,
           Abstimmungsmöglichkeit, Kommentare.
```

#### Service Request Management
```
US-SRQ-01: Als Endbenutzer möchte ich Services aus dem Katalog bestellen,
           damit ich Standard-Services (z.B. neuer Laptop, Zugang beantragen)
           selbst anfordern kann.
           Akzeptanz: Neuer Ticket-Typ "request", Portal zeigt Katalog-Items
           zum Bestellen, Formulare pro Item.

US-SRQ-02: Als Service-Manager möchte ich Fulfillment-Workflows pro
           Katalog-Item definieren, damit Bestellungen automatisch
           den richtigen Prozess durchlaufen.
           Akzeptanz: Mapping: Service-Description → Workflow-Template,
           automatische Instanziierung bei Request-Erstellung.
```

#### SLA Management
```
US-SLA-01: Als SLA-Manager möchte ich automatische SLA-Breach-Erkennung,
           damit Verletzungen sofort sichtbar sind.
           Akzeptanz: Background-Worker prüft alle 60s, setzt sla_breached=1,
           sendet Benachrichtigung.

US-SLA-02: Als Agent möchte ich SLA-Timer-Pause bei "pending"-Status,
           damit Wartezeiten auf Kundenantworten nicht die SLA belasten.
           Akzeptanz: SLA-Timer stoppt bei Status "pending",
           läuft weiter bei Statuswechsel zurück.

US-SLA-03: Als Manager möchte ich SLA-Performance-Reports,
           damit ich die Einhaltung pro Kunde/Service/Zeitraum sehen kann.
           Akzeptanz: Report-Endpoint + Dashboard-Widget
           (%-Einhaltung, durchschnittliche Response/Resolve-Zeit).
```

#### Information Security
```
US-SEC-01: Als Admin möchte ich Passwort-Policies konfigurieren (Mindestlänge,
           Komplexität, Ablauf), damit Zugangsdaten sicher sind.
           Akzeptanz: Settings-Konfiguration für Passwort-Regeln,
           Enforcement bei Registrierung und Passwort-Änderung.

US-SEC-02: Als Admin möchte ich ein systemweites Audit-Log, damit
           sicherheitsrelevante Aktionen nachvollziehbar sind.
           Akzeptanz: Tabelle "audit_log" mit Login/Logout,
           Berechtigungsänderungen, Daten-Exports, API-Zugriffe.
```

#### Monitoring & Events
```
US-MON-01: Als Admin möchte ich Check_MK-Instanzen als Monitoring-Quellen
           anbinden, damit Events automatisch erfasst werden.
           Akzeptanz: Check_MK v2 REST API Client, konfigurierbar
           pro Monitoring-Source, Polling-Intervall einstellbar.

US-MON-02: Als System möchte ich aus kritischen Monitoring-Events automatisch
           Incidents erstellen, damit keine Ausfälle unbemerkt bleiben.
           Akzeptanz: Event-Worker matched Events zu Assets (Hostname/IP),
           erstellt Incident mit Source="monitoring", dedupliziert.

US-MON-03: Als Admin möchte ich die Monitoring-API-Routes nutzen können,
           damit Events per Webhook eingehen können.
           Akzeptanz: Routes /monitoring/sources und /monitoring/events
           implementiert und gemountet.
```

#### Knowledge Management
```
US-KB-01:  Als Agent möchte ich eine Volltextsuche über KB-Artikel,
           damit ich relevante Artikel schnell finde.
           Akzeptanz: Gewichtete Suche über Titel, Content, Tags
           (nicht nur LIKE-basiert).
```

### Should-Have (18 User Stories)

#### Change Enablement
```
US-CHG-04: Als Change-Manager möchte ich einen Change-Kalender,
           damit geplante Wartungen und Blackout-Windows sichtbar sind.

US-CHG-05: Als Change-Manager möchte ich CMDB-basierte Impact-Analyse,
           damit ich vor einem Change sehe welche Services betroffen sind.

US-CHG-06: Als Change-Manager möchte ich Standard-Changes vordefinieren,
           die ohne CAB-Genehmigung durchlaufen können.

US-CHG-07: Als Change-Manager möchte ich Post-Implementation-Reviews,
           damit der Erfolg jedes Changes bewertet wird.
```

#### Incident Management
```
US-INC-04: Als Agent möchte ich mehrstufige Kategorisierung
           (Kategorie → Subkategorie → Item), damit Incidents
           präziser klassifiziert werden.

US-INC-05: Als Agent möchte ich Textbausteine/Templates für
           häufige Ticket-Antworten, damit ich schneller reagieren kann.
```

#### Problem Management
```
US-PRB-04: Als Problem-Manager möchte ich Trend-Analyse für
           wiederkehrende Incidents, damit Probleme proaktiv erkannt werden.
```

#### Service Desk
```
US-SD-01:  Als Agent möchte ich FCR-Tracking (First Contact Resolution),
           damit die Service-Desk-Effizienz messbar ist.

US-SD-02:  Als Agent möchte ich ein Queue-Dashboard (Tickets pro Agent,
           Auslastung, Wartezeit), damit die Workload-Verteilung sichtbar ist.
```

#### CMDB
```
US-CMDB-01: Als Admin möchte ich CI-Änderungshistorie, damit
            Konfigurationsänderungen nachvollziehbar sind.

US-CMDB-02: Als Admin möchte ich Auto-Discovery über Monitoring-Sources,
            damit neue Assets automatisch in die CMDB übernommen werden.
```

#### IT Asset Management
```
US-ITAM-01: Als Asset-Manager möchte ich finanzielle Tracking-Felder
            (Anschaffungskosten, Abschreibung, Garantie), damit
            der Asset-Wert nachvollziehbar ist.

US-ITAM-02: Als Asset-Manager möchte ich CSV/Excel-Import und -Export,
            damit Massendaten effizient gepflegt werden können.
```

#### SLA Management
```
US-SLA-04: Als SLA-Manager möchte ich Feiertags-Kalender definieren,
           damit Business-Hours-SLAs Feiertage korrekt berücksichtigen.
```

#### Continual Improvement
```
US-CSI-01: Als Manager möchte ich ein Improvement-Register,
           damit Verbesserungsvorschläge getrackt werden.

US-CSI-02: Als Manager möchte ich Post-Ticket-Zufriedenheitsumfragen
           (CSAT), damit Kundenfeedback systematisch erfasst wird.

US-CSI-03: Als Manager möchte ich automatische Trend-Reports
           (wöchentlich/monatlich), damit Entwicklungen sichtbar sind.
```

#### Information Security
```
US-SEC-03: Als Admin möchte ich 2FA/MFA für alle Benutzer erzwingen
           können, damit der Zugang sicherer ist.
```

### Could-Have (12 User Stories)

```
US-REL-01: Als Release-Manager möchte ich Releases planen (mehrere Changes
           bündeln), damit koordinierte Deployments möglich sind.

US-REL-02: Als Release-Manager möchte ich Quality-Gates (Test → Staging → Prod),
           damit Releases kontrolliert durchlaufen.

US-AVL-01: Als Service-Manager möchte ich Verfügbarkeits-Ziele pro
           Service definieren (z.B. 99.9%), damit Availability-Management möglich ist.

US-AVL-02: Als Service-Manager möchte ich MTBF/MTRS-Metriken,
           damit die Service-Reliability messbar ist.

US-CMDB-03: Als Admin möchte ich Configuration Baselines/Snapshots,
            damit CI-Konfigurationen versioniert werden.

US-KB-02:  Als Agent möchte ich Artikel-Bewertungen (Daumen hoch/runter),
           damit die Qualität der Wissensdatenbank messbar ist.

US-KB-03:  Als Agent möchte ich beim Ticket-Erstellen automatisch
           passende KB-Artikel vorgeschlagen bekommen (KCS).

US-ITAM-03: Als Asset-Manager möchte ich Software-Lizenz-Management,
            damit installierte Software gegen verfügbare Lizenzen
            abgeglichen werden kann.

US-SD-03:  Als Endbenutzer möchte ich einen Live-Chat im Portal,
           damit ich sofort Hilfe bekomme.

US-SEC-04: Als Admin möchte ich IP-Whitelisting für API-Zugriffe,
           damit nur autorisierte Systeme zugreifen können.

US-MON-04: Als Admin möchte ich Event-Korrelation und Deduplizierung,
           damit Flapping nicht zu Ticket-Fluten führt.

US-CAP-01: Als Admin möchte ich Performance-Metriken (CPU, RAM, Disk)
           aus Monitoring-Quellen importieren, damit Kapazitätsplanung
           möglich ist.
```

---

## 6. Priorisierter Umsetzungsplan

### Phase A — ITIL Core Compliance (Must-Have)

**Ziel:** Incident, Problem, Change und SLA auf ITIL-Niveau bringen.

| # | User Story | Aufwand | Modul |
|---|-----------|---------|-------|
| 1 | US-INC-03 | M | Notification-Service (E-Mail bei Ticket-Änderungen) |
| 2 | US-SLA-01 | S | SLA-Breach-Worker (Background-Job) |
| 3 | US-SLA-02 | S | SLA-Pause bei Pending-Status |
| 4 | US-PRB-01 | S | Root-Cause-Feld auf Problem-Tickets |
| 5 | US-PRB-02 | M | Known-Error-Database + Workaround-Anzeige |
| 6 | US-PRB-03 | S | Known-Error-Vorschlag bei Incidents |
| 7 | US-CHG-01 | M | RFC-Felder auf Change-Tickets |
| 8 | US-CHG-02 | S | Risikobewertung (likelihood × impact) |
| 9 | US-INC-01 | M | Auto-Eskalation-Worker |
| 10 | US-INC-02 | M | Major-Incident-Prozess |
| 11 | US-SEC-01 | S | Passwort-Policy |
| 12 | US-SEC-02 | M | Systemweites Audit-Log |

**Geschätzter Gesamtaufwand Phase A:** ~6-8 Feature-Blöcke

### Phase B — Service Operations (Must + Should)

**Ziel:** Monitoring, Service Requests und SLA-Reporting.

| # | User Story | Aufwand | Modul |
|---|-----------|---------|-------|
| 13 | US-MON-03 | S | Monitoring API-Routes mounten |
| 14 | US-MON-01 | L | Check_MK v2 REST API Client |
| 15 | US-MON-02 | M | Event-to-Incident Worker |
| 16 | US-SRQ-01 | L | Service Request Typ + Portal-Ordering |
| 17 | US-SRQ-02 | M | Fulfillment-Workflow-Mapping |
| 18 | US-SLA-03 | M | SLA-Performance-Reports |
| 19 | US-KB-01 | S | Volltextsuche (KB) |
| 20 | US-CHG-03 | M | CAB-Board |

**Geschätzter Gesamtaufwand Phase B:** ~8-10 Feature-Blöcke

### Phase C — Enterprise & Maturity (Should + Could)

**Ziel:** Reporting, CSI, erweiterte Asset-Management, Release-Management.

| # | User Story | Aufwand | Modul |
|---|-----------|---------|-------|
| 21-24 | US-CHG-04 bis 07 | M-L | Change-Kalender, Impact-Analyse, Standard-Changes, PIR |
| 25-26 | US-INC-04, 05 | S-M | Hierarchische Kategorien, Textbausteine |
| 27-28 | US-CMDB-01, 02 | M | CI-History, Auto-Discovery |
| 29-30 | US-ITAM-01, 02 | M | Financial Tracking, CSV-Import |
| 31-33 | US-CSI-01-03 | M-L | Improvement-Register, CSAT, Trend-Reports |
| 34 | US-SEC-03 | M | 2FA/MFA |
| 35-36 | US-REL-01, 02 | L | Release-Planung, Quality-Gates |
| 37-38 | US-AVL-01, 02 | M | Availability-Ziele, MTBF/MTRS |

**Geschätzter Gesamtaufwand Phase C:** ~15-20 Feature-Blöcke

---

## Anhang: ITIL 4 Practice Score Summary

```
Practice                          Score   Status
──────────────────────────────────────────────────
Incident Management               3.5/5   ⚠️
Problem Management                1.5/5   ❌
Change Enablement                 2.0/5   ⚠️
Service Request Management        1.0/5   ❌
Service Configuration Mgmt        4.0/5   ✅
Service Level Management          3.5/5   ⚠️
Knowledge Management              3.5/5   ⚠️
Service Desk                      3.0/5   ⚠️
IT Asset Management               2.0/5   ⚠️
Monitoring & Event Management     1.0/5   ❌
Continual Improvement             1.0/5   ❌
Information Security Mgmt         2.5/5   ⚠️
Release Management                0.5/5   ❌
Availability Management           0.5/5   ❌
Capacity & Performance Mgmt       0.0/5   ❌
──────────────────────────────────────────────────
Durchschnitt                      1.9/5
Gewichteter Durchschnitt*         2.8/5

* Gewichtet nach Relevanz für ein asset-zentrisches ITSM:
  CMDB, Incident, SLA, Knowledge, Service Desk = 2x Gewicht
```

---

*Generiert am 2026-03-10 | OpsWeave v0.2.8 | Automatisiertes ITIL 4 Compliance Assessment*
