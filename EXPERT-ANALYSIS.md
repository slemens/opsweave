# OpsWeave — Experten-Panel & Markt-Challenge

> **Erstellt:** 2026-03-12
> **Methode:** 5-Experten-Panel mit unabhängigen Analysen, Web-Research, Codebase-Audit
> **Scope:** OpsWeave v0.5.0 — Open-Source ITSM für MSPs im DACH-Raum

---

## BLOCK 1: Markt-Recherche

### Direkte Konkurrenten (Open-Source ITSM)

#### 1. Znuny (OTRS Community Fork)

| Attribut | Wert |
|---|---|
| **GitHub Stars** | 542 |
| **Forks** | 115 |
| **Contributors** | 101 |
| **Lizenz** | GPL-3.0 |
| **Sprache** | Perl |
| **Letztes Release** | 7.2.3 (2025-09-24), LTS: 6.5.18 |
| **Pricing** | Community: kostenlos, Support: $4.499–$28.999/Jahr |
| **Community** | phpBB-Forum (community.znuny.org, 1.528+ aktive User) |

**Stärken:**
- Direkter OTRS-Nachfolger, vertraute Oberfläche für bestehende OTRS-Nutzer
- Ausgereifter Codebase, audit-fähige Dokumentation
- Starke deutschsprachige Community
- Check_MK-Integration über Notification-basierte Ticket-Erstellung

**Schwächen:**
- Perl als Sprache — schrumpfender Developer-Pool, schwer neue Contributors zu gewinnen
- Veraltetes Interface im Vergleich zu modernen Tools
- Kein natives CMDB — nur über Add-on (ITSMCore) oder i-doit-Connector
- Kein Multi-Tenant — Single-Organisation-Design
- Geringe internationale Sichtbarkeit (542 Stars)

**Quelle:** [znuny.org/releases](https://www.znuny.org/en/releases), [znuny.com](https://www.znuny.com/en), [community.znuny.org](https://community.znuny.org/)

---

#### 2. Zammad

| Attribut | Wert |
|---|---|
| **GitHub Stars** | 5.445 |
| **Forks** | 949 |
| **Contributors** | 139 |
| **Lizenz** | AGPL-3.0 |
| **Sprache** | Ruby |
| **Letztes Release** | 7.0 (2026-03-04) |
| **Pricing** | Self-hosted: kostenlos; Cloud: €7–€24/Agent/Monat |
| **Community** | Discourse-Forum (community.zammad.org) |

**Stärken:**
- Schönstes UI aller Open-Source-Helpdesks — moderner, cleaner Look
- Multi-Channel: E-Mail, Chat, Telefon, Social Media, WhatsApp
- AI-Features in v7.0 (Auto-Summaries, Draft Assistance)
- Native Check_MK-Integration (First-class documented Feature)
- Aktive Entwicklung mit regelmäßigen Major Releases

**Schwächen:**
- Kein CMDB — rein Helpdesk, kein Asset Management
- Keine ITIL-Prozesse (kein Problem/Change Management)
- Kein Multi-Tenant — jede Organisation braucht eigene Instanz
- Ruby on Rails — spezifische Expertise nötig
- Self-Hosting komplex (ElasticSearch + PostgreSQL + Redis)
- Limitiertes Reporting

**Quelle:** [zammad.com/pricing](https://zammad.com/en/pricing), [zammad.com/checkmk](https://zammad.com/en/product/features/checkmk-integration)

---

#### 3. FreeScout

| Attribut | Wert |
|---|---|
| **GitHub Stars** | 4.148 |
| **Forks** | 636 |
| **Contributors** | 83 |
| **Lizenz** | AGPL-3.0 |
| **Sprache** | PHP (Laravel) |
| **Letztes Release** | 1.8.208 (2026-03-06) |
| **Pricing** | Core: kostenlos; Module: $2–$15 Einmalkauf |

**Stärken:** Extrem leichtgewichtig, läuft auf Basic-PHP-Hosting, günstige Module (Einmalkauf)
**Schwächen:** Nur Helpdesk, kein ITSM/ITIL, kein CMDB, kein Multi-Tenant, kein Check_MK
**Relevanz für OpsWeave:** Gering — andere Zielgruppe (kleine Support-Teams, nicht MSPs)

**Quelle:** [freescout.net/modules](https://freescout.net/modules/)

---

#### 4. GLPI

| Attribut | Wert |
|---|---|
| **GitHub Stars** | 5.693 |
| **Forks** | 1.627 |
| **Contributors** | 186 |
| **Lizenz** | GPL-3.0 |
| **Sprache** | PHP |
| **Letztes Release** | 11.0.6 (2026-03-03) |
| **Pricing** | Self-hosted: kostenlos; Cloud: ab €19/Agent/Monat; On-Prem Support: ab $1.200/Jahr |
| **Community** | phpBB-Forum, Discord (~730 Mitglieder), PeerSpot 8.8/10 |

**Stärken:**
- Vollständigstes Open-Source-ITSM mit eingebautem Asset Management
- Multi-Entity-System für MSP/Multi-Tenant-Nutzung (hierarchische Organisationseinheiten)
- 186 Contributors — größte Contributor-Base aller ITSM-Tools
- Umfangreiches Plugin-Ökosystem
- Enterprise-erprobt, gute Lifecycle-Verwaltung
- Check_MK-Integration über Community-Plugin + `glpi_sync`

**Schwächen:**
- Veraltetes Portal-Interface
- Schwache Reporting-Fähigkeiten
- Plugin-Kompatibilitätsprobleme über Versionen hinweg
- Komplexes Deployment
- Keine Auto-Discovery eingebaut (Plugin nötig)
- Französisch-first Community, Englisch sekundär, Deutsch kaum

**Quelle:** [glpi-project.org/pricing](https://www.glpi-project.org/en/pricing/), [Discord](https://discord.com/invite/qgDXNwS)

---

#### 5. iTop (Combodo)

| Attribut | Wert |
|---|---|
| **GitHub Stars** | 1.083 |
| **Forks** | 284 |
| **Contributors** | 54 |
| **Lizenz** | AGPL-3.0 |
| **Sprache** | PHP |
| **Letztes Release** | 3.2.2 (2025-08-12) |
| **Pricing** | Community: kostenlos; Professional/Enterprise: Custom Pricing |
| **Community** | SourceForge-Forum (2.777+ Diskussionen) |

**Stärken:**
- **Bestes CMDB im Open-Source-Bereich** — "probably the best CMDB of all ITSM software" (Reviews)
- ITSM Designer für Low-Code-Anpassungen
- ITIL-aligned: Incident, Problem, Change, Service
- Check_MK 1.x UND 2.x Collector-Extensions verfügbar
- Keine Feature-Gates in Community Edition

**Schwächen:**
- Komplexe Konfiguration — hoher Implementierungsaufwand
- Veraltetes User Interface
- Kleines Community (54 Contributors)
- Langsame Release-Kadenz (letztes Release August 2025)
- Multi-Tenant nur über "Department Silos" Extension (kostenpflichtig)
- Dokumentation wird als ungenau beschrieben

**Quelle:** [combodo.com](https://combodo.com/features/), [itophub.io/checkmk-collector](https://www.itophub.io/wiki/page?id=extensions:itomig:check_mk-collector)

---

#### 6. openITCOCKPIT

| Attribut | Wert |
|---|---|
| **GitHub Stars** | 370 |
| **Contributors** | 29 |
| **Lizenz** | GPL-3.0 |
| **Letztes Release** | 5.4.0 (2026-02-20) |

**Relevanz für OpsWeave:** Kein ITSM-Tool — primär Monitoring-Management-UI für Check_MK/Nagios/Prometheus. Tiefste Check_MK-Integration aller Tools, aber kein Ticketing, kein CMDB, keine ITIL-Prozesse. Kein direkter Konkurrent.

---

#### 7. Ralph (Allegro)

| Attribut | Wert |
|---|---|
| **GitHub Stars** | 2.465 |
| **Contributors** | 51 |
| **Lizenz** | Apache-2.0 |
| **Letztes Release** | 20260309.1 (2026-03-09) |

**Relevanz für OpsWeave:** Reines DCIM/CMDB für Rechenzentren. Kein Ticketing, kein ITSM. Allegro-intern entwickelt. Kein direkter Konkurrent für MSP-Markt.

---

#### 8. NetBox (NetBox Labs)

| Attribut | Wert |
|---|---|
| **GitHub Stars** | 19.991 |
| **Forks** | 2.957 |
| **Contributors** | 352 |
| **Lizenz** | Apache-2.0 |
| **Letztes Release** | v4.5.4 (2026-03-03) |
| **Pricing** | Self-hosted: kostenlos; Cloud: ab $7.500/Jahr |
| **Community** | Größte Community (Slack mit tausenden Mitgliedern, 352 Contributors) |

**Stärken:** API-first Design, beste Netzwerk-Dokumentation, VC-backed ($35M Series B), professionellste Docs
**Schwächen:** Kein ITSM, Netzwerk-fokussiert, Tenancy ist Tagging (keine Datenisolation), Cloud teuer

**Relevanz für OpsWeave:** Kein direkter Konkurrent (kein Ticketing), aber Überlappung im CMDB-Bereich. NetBox zeigt: 20K Stars sind möglich mit gutem API-Design und Docs.

**Quelle:** [netboxlabs.com/pricing](https://netboxlabs.com/pricing/)

---

### Kommerzielle Konkurrenten

#### ServiceNow

| Attribut | Wert |
|---|---|
| **Pricing** | ~$70–100/Agent/Monat (ITSM); Pro Plus: $160+; Enterprise: Custom |
| **CMDB** | Enterprise-grade, Full Dependency Mapping |
| **Multi-Tenant** | Domain Separation (Enterprise), komplex und teuer |
| **DORA/NIS2** | Stark — GRC/IRM-Module, aktives Marketing für DORA-Compliance |
| **Check_MK** | Ja — Notification-basierte Incident-Erstellung |

**DACH-Position:** Dominant bei DAX-Unternehmen und Behörden. Für MSPs unter 100 MA weder bezahlbar noch sinnvoll. TCO ist 3–5x der Lizenzkosten (Implementation, Training, Management).

**Quelle:** [nowtribe.com/servicenow-pricing-2026](https://nowtribe.com/how-much-does-servicenow-itsm-cost-in-2026-a-complete-breakdown/)

---

#### Jira Service Management (Atlassian)

| Attribut | Wert |
|---|---|
| **Pricing** | Free (3 Agents), Standard: $19–20/Agent/Monat, Premium: $48/Agent/Monat |
| **CMDB** | "Assets" ab Standard, Agentless Discovery |
| **Multi-Tenant** | Nein — Multiple Projects als Workaround |
| **DORA/NIS2** | Keine spezifischen Module |
| **Check_MK** | Ja — native JSM-API-Integration ab Check_MK 1.6.0+ |

**DACH-Position:** Stark bei Developer-zentrischen Orgs und Startups. Weniger verbreitet bei klassischen Systemhäusern.

**Quelle:** [eesel.ai/jira-pricing-2026](https://www.eesel.ai/blog/jira-service-management-pricing)

---

#### Freshservice (Freshworks)

| Attribut | Wert |
|---|---|
| **Pricing** | Starter: $19/Agent/Monat; Growth: $49 (MSP Mode); Pro: $115; Enterprise: $145 |
| **CMDB** | Eingebaut + Device42-Integration |
| **Multi-Tenant** | MSP Mode ab Growth-Tier mit Multi-Account Setup |
| **DORA/NIS2** | Keine spezifischen Module |
| **Check_MK** | Nein — Custom Webhook/API nötig |

**DACH-Position:** Wachsend, aber Cloud-only. Datensouveränität ein Thema für regulierte deutsche Orgs.

**Quelle:** [freshworks.com/freshservice/pricing](https://www.freshworks.com/freshservice/pricing/)

---

#### ManageEngine ServiceDesk Plus

| Attribut | Wert |
|---|---|
| **Pricing** | Standard: $13/Tech/Monat; Professional: $27; Enterprise: $67; Free bis 5 Techs |
| **CMDB** | Eingebaut ab Professional |
| **Multi-Tenant** | Ja — dedizierte MSP Edition mit Datenisolation |
| **DORA/NIS2** | Keine spezifischen Module |
| **Check_MK** | Nein — eigenes Monitoring-Ökosystem (OpManager) |

**DACH-Position:** Stark bei On-Prem-Deployments, preissensitiven Mittelstandskunden.

---

#### TOPdesk

| Attribut | Wert |
|---|---|
| **Pricing** | Essential: ~$60–76/Operator/Monat; Engaged: ~$109; Excellent: ~$155 |
| **CMDB** | In höheren Tiers |
| **Multi-Tenant** | Begrenzt — eher Shared-Services als echtes Multi-Tenant |
| **Check_MK** | Nein |

**DACH-Position:** **Sehr stark** — niederländischer Herkunft mit dediziertem deutschen Büro, 4.500+ Kunden weltweit, 25+ Jahre am Markt. Primärer kommerzieller Konkurrent im DACH-Raum.

**Quelle:** [topdesk.com/pricing](https://www.topdesk.com/en/pricing/)

---

#### HaloITSM

| Attribut | Wert |
|---|---|
| **Pricing** | ~$49–70/Agent/Monat, alle Features inkl., AI inkl. |
| **CMDB** | Eingebaut mit Dependency Mapping |
| **Multi-Tenant** | Ja — Multi-Tenant-Support |
| **Check_MK** | Nicht dokumentiert |

**DACH-Position:** Wachsend, Gartner 2025 ITSM Tools gelistet. 40–50% günstiger als Wettbewerber.

---

#### ConnectWise PSA / Datto Autotask PSA

| Attribut | Wert |
|---|---|
| **Pricing** | ConnectWise: ab ~$25/User/Monat; Autotask: ab ~$50/User/Monat |
| **Multi-Tenant** | Ja — MSP-nativ |
| **Check_MK** | Nein — eigene RMM-Ökosysteme |

**DACH-Position:** Schwach — US/UK-fokussiert. Autotask-Implementation als "horrendous" beschrieben.

---

#### EcholoN

| Attribut | Wert |
|---|---|
| **Pricing** | Ab $5.000 Einmalkauf (Perpetual License) |
| **CMDB** | Eingebaut |
| **Multi-Tenant** | Nein |

**DACH-Position:** "Made in Germany", 25+ Jahre, Mittelstand-Fokus, starker deutscher Support. Begrenzte internationale Sichtbarkeit.

---

### CMDB-spezifische Konkurrenz

#### i-doit (synetics)

| Attribut | Wert |
|---|---|
| **Pricing** | Open: kostenlos; Pro: Subscription nach Objektanzahl (1.000–10.000+) |
| **Check_MK** | **Tiefe bidirektionale Integration** — Checkmk 2 Add-on, Monitoring-Sites importieren |
| **Multi-Tenant** | Nein |
| **DACH-Position** | **CMDB-Marktführer im DACH-Raum** |

**Der etablierte Stack:** i-doit + Zammad + Checkmk wird als "the powerful ITSM trio" vermarktet. Das ist der Stack den OpsWeave als Ganzes ersetzen will.

**Differenzierung OpsWeave vs. i-doit:**
- i-doit ist CMDB-only, kein Ticketing, keine Workflows, keine Compliance
- OpsWeave integriert CMDB + Ticketing + Workflows + Compliance in einem Produkt
- i-doit hat tiefere CMDB-Features (mehr Objekttypen, Discovery-Anbindungen)
- OpsWeave hat moderneres UI, Multi-Tenant, Service Catalog

**Quelle:** [i-doit.com/pricing](https://www.i-doit.com/en/i-doit/pricing/), [kb.i-doit.com/checkmk2](https://kb.i-doit.com/en/i-doit-add-ons/checkmk2/index.html)

---

#### Device42 / Lansweeper

- **Device42:** $1.449–$9.999/Jahr nach Device-Anzahl, starke Auto-Discovery, von Freshworks akquiriert
- **Lansweeper:** $955–$16.695/Jahr, IT Asset Discovery, Cloud und On-Prem

Beide sind Discovery/Inventory-Tools, keine ITSM-Systeme. OpsWeave konkurriert hier nicht direkt — aber MSPs die OpsWeave nutzen werden Auto-Discovery vermissen.

---

### Check_MK-Integration als USP — Validierung

| Tool | Check_MK-Integration | Tiefe |
|---|---|---|
| openITCOCKPIT | Nativ, tief | Core Feature (Monitoring UI) |
| Zammad | Nativ, eingebaut | Auto-Create/Update/Close Tickets |
| i-doit | Nativ, bidirektional | Checkmk 2 Add-on, CMDB-Sync |
| Znuny | Ja, Notification-basiert | Alarm-Forwarding, Ticket-Erstellung |
| iTop | Ja, Collector Extension | Checkmk 1.x + 2.x, Inventory-Sync |
| GLPI | Community Plugin | glpi_sync + Notification Module |
| ServiceNow | Ja, Notification-basiert | Incident-Erstellung |
| JSM (Atlassian) | Ja, API-Integration | ab Checkmk 1.6.0+ |
| **OpsWeave** | **Ja, Webhook + Polling** | **Auto-Incident + Dedup + Auto-Resolve** |
| Freshservice | Nein | — |
| TOPdesk | Nein | — |
| HaloITSM | Nicht dokumentiert | — |

**Bewertung:** Check_MK-Integration ist ein differenzierendes Feature, aber **kein einzigartiger USP**. Zammad und i-doit haben ebenfalls gute Integrationen. Der USP entsteht erst in der **Kombination** Check_MK + CMDB + Ticketing + Compliance in einem Produkt.

---

### DORA/NIS2 Compliance-Markt

**Regulatorischer Druck:**
- **NIS2:** Seit 06.12.2025 deutsches Gesetz (NIS2UmsuCG). ~30.000 betroffene Unternehmen in Deutschland. MSPs explizit als "wesentliche Einrichtungen" gelistet. BSI-Registrierungsfrist: 06.03.2026.
- **DORA:** Direkt anwendbar seit 17.01.2025. 44% der betroffenen Unternehmen berichten signifikante Implementierungsprobleme. Finanzinstitute fordern von Zulieferern DORA-Konformität — vertraglicher Druck auf MSPs.
- **Supply-Chain-Effekt:** Regulierte Unternehmen müssen Cybersecurity-Standards bei kritischen Zulieferern prüfen und vertraglich durchsetzen. IT-Dienstleister für Finanz- und KRITIS-Sektoren haben doppelte Pflichten (DORA + NIS2).

**Welche ITSM-Tools haben DORA/NIS2-Features?**
- **ServiceNow:** GRC/IRM-Module, aktives DORA-Marketing über Consulting-Partner
- **Alle anderen:** **Keine** der getesteten Tools (Open Source oder kommerziell) haben dedizierte, eingebaute DORA/NIS2-Compliance-Module

**Ist "DORA/NIS2-ready" ein Kaufgrund?** Ja — aber nur wenn es über Marketing-Buzzwords hinausgeht. MSPs brauchen konkret:
1. Audit-Trail (wer hat wann was geändert — lückenlos, unveränderbar)
2. Incident-Klassifikation nach DORA Art. 17-18 (Major ICT-related Incidents, Meldepflichten)
3. Regulatorisches Mapping (Anforderung → Service → Asset → Evidenz)
4. Change-Approval-Prozesse mit Nachweis
5. Report-Generierung für Prüfer

**OpsWeave hat hier eine echte Marktlücke:** Kein anderes Open-Source-ITSM bietet ein dediziertes Compliance-Modul mit Framework-Management, Requirements-Mapping und Gap-Analyse.

---

### Marktgröße

| Kennzahl | Wert | Quelle |
|---|---|---|
| Deutschland Managed Services Markt | $24,4 Mrd. (2023), proj. $47,7 Mrd. (2032) | Marktanalysen |
| IT-Systemhäuser Deutschland | ~766–2.976 (je nach Klassifikation) | BITKOM, eco |
| Breitere IT-Dienstleister DACH | 150.000+ (inkl. Integratoren, Reseller) | Channel-Analysen |
| Typisches ITSM-Budget 20-Personen-MSP | $6.000–12.600/Jahr (10-15 Agents × $50-70) | Extrapolation aus Pricing |
| Typisches ITSM-Budget 50-Personen-MSP | $15.000–29.400/Jahr (25-35 Agents × $50-70) | Extrapolation aus Pricing |
| NIS2-betroffene Unternehmen Deutschland | ~30.000 | NIS2UmsuCG |
| Cloud vs. On-Prem ITSM | 64,8% Cloud (2024) | Marktdaten |

**Marktlücke validiert?**

**Ja.** Es gibt kein Open-Source-ITSM das Multi-Tenant + CMDB + Compliance (DORA/NIS2) + Check_MK in einem Produkt vereint. Die nächste Alternative ist der Stack i-doit + Zammad + Check_MK — drei separate Produkte mit drei Logins, drei Datenbanken, drei Update-Zyklen.

**Warum existiert diese Lücke?**
1. All-in-One ist extrem komplex — der Scope ist riesig für ein Projekt
2. Die Zielgruppe (DACH MSPs die Open Source wollen) ist relativ klein
3. DORA/NIS2 sind neu (2025) — die Tools hatten noch keine Zeit zu reagieren
4. Multi-Tenant ist architektonisch schwierig nachzurüsten

---

## BLOCK 2: Experten-Analysen

---

## Experte 1: Product Strategist

*Ex-ServiceNow, jetzt Open-Source-ITSM-Berater für den Mittelstand*

### Was funktioniert gut

1. **Die Marktlücke ist real.** Der Stack i-doit + Zammad + Check_MK ist der De-facto-Standard für Open-Source-affine MSPs im DACH-Raum. OpsWeave bietet genau diese Kombination als ein Produkt — ein Login, eine Datenbank, ein Update-Zyklus. Das ist ein echter Mehrwert.

2. **Freemium-Modell ist clever positioniert.** 50 Assets, 5 User, unbegrenzte Tickets — das reicht für Evaluierung und kleine Teams. Die Grenze bei Assets (nicht bei Tickets) zwingt wachsende MSPs zum Upgrade an der richtigen Stelle. Vergleich: Jira SM Free = 3 Agents, Freshservice = kein Free Tier für Self-Hosted.

3. **Docker-first Deployment ist ein starker Differenziator.** `docker run` für Single-Container ist unschlagbar einfach. Kein GLPI-Deploy (Apache + PHP + MySQL), kein Zammad-Deploy (Ruby + Elasticsearch + PostgreSQL + Redis). Das senkt die Einstiegshürde radikal.

4. **DORA/NIS2-Compliance-Modul ist ein Timing-Treffer.** NIS2 ist seit Dezember 2025 deutsches Recht, DORA seit Januar 2025. Kein anderes Open-Source-ITSM hat ein dediziertes Compliance-Modul. Wer jetzt damit vermarktet, hat First-Mover-Advantage.

5. **Dual-DB (PostgreSQL + SQLite) ermöglicht zwei Deployment-Strategien.** SQLite für "docker run und fertig" (Evaluierung, kleine Teams), PostgreSQL für Production. Das kennt man von Grafana (SQLite default, PostgreSQL/MySQL für HA) — bewährtes Muster.

### Kritische Schwächen

1. **Problem:** All-in-One-Scope ist ein Risiko für einen Solo-Maintainer
   - **Impact:** "Alles ein bisschen" schlägt niemanden der "eine Sache richtig" macht. Zammad ist besser im Ticketing. i-doit ist besser im CMDB. OpsWeave muss in JEDER Dimension "gut genug" sein — und das bei einem Solo-Maintainer mit Vollzeitjob.
   - **Evidenz:** Die Feature-Matrix zeigt: Ticketing ist solide, CMDB ist funktional aber nicht auf i-doit-Niveau (kein Discovery, kein LDAP-Sync, kein Bulk-Import-Tool), Compliance ist ein Framework aber nicht audit-ready. Kein Feature ist der klare "Category Winner".
   - **Lösung:** Einen "Wedge" definieren — EIN Feature das signifikant besser ist als alles andere. Empfehlung: **Check_MK + CMDB + DORA/NIS2 Compliance als integriertes Paket.** Das kann kein anderes Tool. Ticketing ist die notwendige Basis, aber nicht der USP.

2. **Problem:** Kein klarer Migrations-Pfad von bestehenden Tools
   - **Impact:** MSPs haben existierende Ticketsysteme mit Tausenden historischen Tickets. Ohne Import-Tool (OTRS-CSV, i-doit-API-Import, Zammad-Export) ist die Migration ein Projekt das niemand anfangen will.
   - **Evidenz:** Markt-Erfahrung: Die #1-Barriere für ITSM-Wechsel ist NICHT das neue Tool — sondern die Angst, historische Daten zu verlieren.
   - **Lösung:** Minimaler Migrations-Assistent: CSV-Import für Tickets und Assets. OTRS-XML-Import wäre ein Killerfeature für die Znuny-Abwanderer.

3. **Problem:** Solo-Maintainer-Risiko (Bus-Faktor = 1)
   - **Impact:** Kein Enterprise-Käufer investiert in ein Tool das von einer Person abhängt. Das ist auch für Community-Adoption ein Problem — wer contributet wenn unklar ist ob das Projekt in 2 Jahren noch existiert?
   - **Evidenz:** Erfolgreiche Open-Source-ITSM-Projekte haben 50+ Contributors (GLPI: 186, Zammad: 139, Znuny: 101). OpsWeave hat 1.
   - **Lösung:** Kurzfristig: Roadmap veröffentlichen, regelmäßige Releases, Blog-Content. Mittelfristig: 2-3 Core-Contributors gewinnen. Langfristig: Firma gründen wenn MRR es rechtfertigt.

4. **Problem:** AGPL-3.0 kann Enterprise-Kunden abschrecken
   - **Impact:** Manche Unternehmen haben Blanket-Policies gegen AGPL wegen der Copyleft-Klausel (wenn du die Software modifizierst und als Service anbietest, musst du den Code veröffentlichen). Das betrifft v.a. große Konzerne und deren Rechtsabteilungen.
   - **Evidenz:** Grafana (AGPLv3) ist trotzdem sehr erfolgreich — zeigt dass AGPL kein Todesstoß ist. MongoDB (SSPL) war deutlich kontroverser. GitLab nutzt MIT für CE — maximale Adoption, aber weniger Schutz.
   - **Lösung:** AGPL beibehalten (Schutz gegen Cloud-Forks), aber Commercial License als Option anbieten. "Dual Licensing": AGPL für Community, Commercial License für Unternehmen die AGPL nicht akzeptieren.

5. **Problem:** Kein Cloud-Angebot
   - **Impact:** 64,8% des ITSM-Marktes ist Cloud (2024). Viele MSPs wollen kein Docker betreiben — sie wollen SaaS.
   - **Evidenz:** Zammad Cloud, GLPI Network Cloud, Freshservice — alle Konkurrenten haben Cloud-Optionen.
   - **Lösung:** Langfristiges Ziel, nicht kurzfristig. Self-Hosted-First ist für die Zielgruppe (IT-Profis) akzeptabel. Cloud kann kommen wenn das Produkt stabil und die Firma gegründet ist.

### Fehlende Features (Showstopper für die Zielgruppe)

1. **CSV/Bulk-Import für Assets und Tickets** — Ohne das kann kein MSP migrieren
2. **Active Directory / LDAP Sync** — 90%+ der MSP-Kunden nutzen AD. Ohne AD-Sync ist die User-Verwaltung manuelle Arbeit
3. **Microsoft 365 Graph API für E-Mail** — IMAP-Polling funktioniert, aber M365 drosselt IMAP aggressiv. Modern Auth (OAuth2) über Graph API ist Pflicht
4. **SLA-Dashboard mit Trend-Analyse** — MSPs müssen ihren Kunden SLA-Reports zeigen können. Ein Dashboard das sagt "95,2% SLA-Einhaltung im Februar" ist Pflicht
5. **Mandantenübergreifende Suche** — Ein MSP mit 50 Kunden muss suchen können: "Zeige mir alle Windows Server 2019 über alle Mandanten"

### Features die die Konkurrenz hat und wir nicht

| Feature | Wer hat es | Brauchen wir es? |
|---|---|---|
| Auto-Discovery (Netzwerk-Scan) | Freshservice, GLPI (Plugin), Lansweeper | Nicht sofort — aber MSPs erwarten es mittel- bis langfristig |
| AI-Features (Auto-Categorization, Summaries) | Zammad 7.0, Freshservice (Freddy), JSM | Nice-to-have, nicht Showstopper. Aber zunehmend Erwartung |
| Mobile App | Freshservice, TOPdesk, HaloITSM | Wichtig für Field-Techs, aber responsive Web kann erstmal reichen |
| SLA Calendar (Business Hours) | TOPdesk, ServiceNow, Freshservice | Ja — SLAs ohne Business-Hours-Kalender sind unbrauchbar |
| Approval Workflows mit E-Mail | ServiceNow, Freshservice, iTop | Ja — Change-Approvals per E-Mail-Link sind Standard |
| Custom Fields pro Ticket-Typ | Alle kommerziellen Tools | Gibt es bereits im Schema, aber UI-Support prüfen |
| Time Tracking | ConnectWise, Autotask, HaloITSM | Ja — MSPs rechnen nach Zeit ab. Ohne Time-Tracking kein Billing |

### Überraschungs-Idee

**"DORA/NIS2 Compliance-as-a-Feature" als Wedge-Strategie:**

OpsWeave sollte nicht als "besseres OTRS" positioniert werden (das gewinnt man nicht), sondern als **"das ITSM das euch durch die DORA/NIS2-Prüfung bringt"**.

Konkreter Plan:
1. Vorgefertigte DORA- und NIS2-Frameworks als Seed-Daten mitliefern (alle Artikel, alle Anforderungen, vorstrukturiert)
2. "DORA Compliance Score" auf dem Dashboard (wie viel Prozent der Anforderungen sind abgedeckt?)
3. Ein-Klick DORA-Report-Generierung (PDF) für den Prüfer
4. Incident-Klassifikation nach DORA Art. 17-18 (Major ICT-related Incidents mit automatischer Severity-Bewertung)
5. Content Marketing: "OpsWeave DORA-Compliance-Guide für MSPs" als Lead-Magnet

Das wäre ein Feature das kein anderes Open-Source-ITSM hat, das einen akuten Schmerz adressiert (Regulatorik-Druck), und das als Wedge funktioniert: MSPs kommen wegen DORA, bleiben wegen des integrierten ITSM.

### Verdict

**Bedingt empfehlenswert.** OpsWeave hat eine echte Marktlücke gefunden und technisch solide umgesetzt. Der All-in-One-Ansatz ist gleichzeitig die größte Stärke (ein Tool statt drei) und das größte Risiko (zu viel Scope für einen Solo-Maintainer). Ich würde es einem MSP empfehlen der:
- bereit ist, Early Adopter zu sein
- einen bestehenden Check_MK-Stack hat
- unter DORA/NIS2-Druck steht
- technisch versiert genug ist für Self-Hosted

Ich würde es NICHT empfehlen für MSPs die ein fertiges, Support-gedecktes Tool ab Tag 1 brauchen.

**Weg zu €5.000 MRR:** 50 Enterprise-Lizenzen à €100/Monat. Realistischer Zeitrahmen: 18-24 Monate nach dem ersten stabilen Release, wenn die Community bei 500+ Stars ist und 5-10 produktive Installationen laufen.

---

## Experte 2: UX-Researcher

*Spezialisiert auf Enterprise-SaaS und ITSM-Tools, Nutzer-Tests für Jira, Zendesk, Freshservice*

### Was funktioniert gut

1. **Enterprise-grade UI-Qualität.** shadcn/ui als Basis ist eine exzellente Wahl — konsistente Komponenten, professioneller Look, Dark Mode out of the box. Die UI sieht auf den ersten Blick nach einem kommerziellen Produkt aus, nicht nach einem Open-Source-Projekt. Das ist ein echter Wettbewerbsvorteil gegenüber OTRS/Znuny, GLPI und iTop.

2. **Dashboard ist hervorragend.** 4 KPI-Karten, Ticket-Timeline (30 Tage), Top-5-Kunden, Status-Distribution mit Progressbars. Loading Skeletons statt Spinner. Empty States mit Icons und CTAs. Das Dashboard fühlt sich an wie Freshservice — das ist das richtige Benchmarking-Niveau.

3. **Internationalisierung ist vorbildlich.** 12 Namespaces, 99%+ Coverage in DE und EN, saubere `useTranslation()` Patterns. Kein hardcodierter Text (bis auf 3-5 Strings im ErrorBoundary). Fallback-Chain korrekt. Das ist besser als viele kommerzielle Tools.

4. **Loading/Empty/Error States sind vollständig.** Jeder async State hat einen Loading-State (Skeleton), jede leere Liste hat einen Empty State mit Icon und CTA, Fehler werden mit Retry-Button kommuniziert. Das ist UX-Handwerk auf hohem Niveau.

5. **Ticket Board mit DnD funktioniert.** 5-Spalten-Kanban, dnd-kit für Drag & Drop, Filter-Panel (Status, Priority, Assignee, Group, Asset, Customer), Sortierung, Suche, Bulk Actions. Das ist funktional auf Jira SM-Niveau.

### Kritische Schwächen

1. **Problem:** Kein Onboarding / Setup-Wizard
   - **Impact:** First-Time-Experience ist "Login → leeres Dashboard" (oder mit Demo-Daten). Kein Setup-Wizard der durch die ersten Schritte führt: Tenant konfigurieren → erste Assets anlegen → erstes Ticket erstellen. Jeder Schritt ohne Guidance ist ein Absprungpunkt.
   - **Evidenz:** Freshservice hat einen 5-Schritt-Setup-Wizard. TOPdesk hat eine Guided Tour. Selbst GLPI zeigt einen Post-Install-Check. Im SaaS-Bereich ist die Regel: 40-60% der Nutzer die sich registrieren kommen nie über das erste Login hinaus, wenn es keinen Onboarding-Flow gibt.
   - **Lösung:** Minimaler Setup-Wizard nach erstem Admin-Login: (1) Organisation konfigurieren (Name, Logo), (2) erste User einladen, (3) erstes Asset anlegen, (4) erstes Ticket erstellen. Kann als modale Step-by-Step-Komponente implementiert werden.

2. **Problem:** Customer Portal ist funktional, aber nicht white-label-fähig
   - **Impact:** MSPs verkaufen ihren Kunden ein Portal "in ihrem Namen". Wenn das Portal "OpsWeave" branding hat, untergräbt das die MSP-Positionierung. Logo, Farben, App-Name sind hardcoded.
   - **Evidenz:** TOPdesk, Freshservice und HaloITSM bieten vollständiges White-Labeling: Logo, Farben, Domain, E-Mail-Absender. MSPs die ihr eigenes branding im Portal sehen wollen, werden OpsWeave ausschließen.
   - **Lösung:** Branding-Konfiguration pro Tenant: Logo-Upload, Primärfarbe, App-Name, Favicon. Kann über die bestehende `tenants.settings` JSON-Spalte gespeichert werden. Portal liest Branding bei Login aus dem Backend.

3. **Problem:** CMDB-Pflege ist manuell und schmerzhaft
   - **Impact:** CMDB-Pflege ist die Arbeit die niemand machen will. Wenn OpsWeave keinen einfachen Weg bietet, Assets en masse zu importieren (CSV-Upload, AD-Sync), wird die CMDB leer bleiben. Eine leere CMDB macht alle CMDB-abhängigen Features nutzlos (SLA-Vererbung, Compliance-Mapping, Dependency-Graph).
   - **Evidenz:** i-doit bietet CSV-Import, LDAP-Sync, JDisc Discovery-Integration. GLPI hat Fusion-Inventory für Auto-Discovery. Im Code: kein Bulk-Import-Endpoint, kein CSV-Parser, kein AD/LDAP-Connector. User-Import via CSV Dialog existiert, aber nicht für Assets.
   - **Lösung:** Priorisiert: (1) CSV-Upload für Assets (Upload-Dialog mit Column-Mapping), (2) LDAP/AD-Sync für User + Computer-Objekte (Phase 2).

4. **Problem:** Accessibility (ARIA, Keyboard) ist unvollständig
   - **Impact:** Enterprise-Kunden im öffentlichen Sektor (Behörden, KRITIS) fordern WCAG 2.1 AA Compliance. Aktuell: Keine ARIA-Labels auf Icon-Buttons, keine Keyboard-Navigation für DnD, keine Skip-to-Content-Links, keine ARIA-Landmarks.
   - **Evidenz:** Code-Analyse: DashboardPage hat 1 aria-label (Refresh-Button), Header 0, Sidebar 0, TicketBoardPage 0. Focus-Indicators teilweise unsichtbar auf dunklem Hintergrund.
   - **Lösung:** Iterativ verbessern: (1) ARIA-Labels auf alle Icon-only-Buttons, (2) ARIA-Landmarks auf Layout-Komponenten, (3) Focus-Indicator-Styling. Automated A11y-Testing mit axe-playwright in CI.

5. **Problem:** Kein Keyboard-Shortcut-System
   - **Impact:** Power-User in ITSM-Tools (IT-Admins die 50-100 Tickets/Tag bearbeiten) leben auf der Tastatur. Zammad hat globale Shortcuts, Freshservice hat Shortcuts im Ticket. Ohne Shortcuts: Jede Aktion braucht Mouse-Klick → langsamerer Workflow → Frustration.
   - **Evidenz:** Kein Keyboard-Shortcut-System im Code gefunden. Keine `useHotkeys()` oder `mousetrap` Integration.
   - **Lösung:** Globale Shortcuts: `n` = neues Ticket, `/` = Suche, `g t` = go to Tickets, `g a` = go to Assets. Ticket-Detail: `s` = Status ändern, `a` = Assignee ändern, `c` = Kommentar. Modal: `?` zeigt Shortcut-Übersicht.

### Fehlende Features (Showstopper für die Zielgruppe)

1. **Quick-Actions im Ticket-Board** — "Ticket-Karte rechtsklicken → Status ändern / Zuweisen / Priorität setzen" ohne den Detail-View zu öffnen
2. **Ticket-Templates** — "Standard-Incident für Passwort-Reset" mit vordefinierten Feldern
3. **Saved Searches / Views** — "Meine offenen P1-Tickets" als gespeicherte Ansicht auf dem Board
4. **@-Mentions in Kommentaren** — Kollegen in Ticket-Kommentaren taggen mit Notification
5. **Canned Responses** — Vordefinierte Antworten für häufige Kundenanfragen im Portal

### Features die die Konkurrenz hat und wir nicht

| Feature | Wer hat es | Brauchen wir es? |
|---|---|---|
| Setup-Wizard | Freshservice, TOPdesk, GLPI | Ja — First-Time-Experience ist kritisch |
| White-Label Portal | TOPdesk, Freshservice, HaloITSM | Ja — Showstopper für MSPs |
| In-App Notifications (Bell Icon) | Alle kommerziellen Tools | Gibt es bereits im Code (Sidebar-Icon sichtbar) |
| Ticket Merge | Zammad, Freshservice, JSM | Ja — Duplikate zusammenführen ist Alltag |
| Customer Satisfaction Survey | Zammad, Freshservice | Nice-to-have, nicht Showstopper |
| Rich Text Editor (WYSIWYG) | Freshservice, TOPdesk | Wäre besser als reines Markdown für nicht-technische User |

### Überraschungs-Idee

**"30-Minuten-Challenge" als Marketing und Product-Benchmark:**

Verspreche: "Von `docker run` bis zum ersten gelösten Ticket in 30 Minuten." Dokumentiere das als Video-Tutorial und Interactive Guide. Messe die Zeit. Wenn es mehr als 30 Minuten dauert, identifiziere die Friction Points und eliminiere sie.

Das zwingt das Produkt zur Einfachheit und gibt gleichzeitig unschlagbares Marketing-Material. Freshservice braucht 15 Minuten (Cloud), GLPI braucht 45+ Minuten (Deployment + Config). OpsWeave mit `docker run` sollte 10-15 Minuten schaffen.

### Verdict

**Bedingt empfehlenswert.** Die UI ist beeindruckend für ein Open-Source-Projekt — deutlich besser als OTRS/Znuny, GLPI, iTop. Auf Augenhöhe mit Zammad. Noch ein Stück von Freshservice entfernt (vor allem White-Labeling und Onboarding). Für IT-Admins die Docker kennen und ein modernes ITSM suchen: absolut nutzbar. Für nicht-technische Endkunden über das Portal: funktional, aber noch nicht Consumer-Grade.

---

## Experte 3: Full-Stack-Architect

*15 Jahre Erfahrung, SaaS-Plattformen mit 10.000+ Tenants, Open-Source-Contributor*

### Was funktioniert gut

1. **Multi-Tenancy ist sauber implementiert.** `tenant_id` auf allen Entitätstabellen, Tenant-Middleware extrahiert den Tenant aus dem JWT, alle Service-Queries filtern nach `tenant_id`. Cross-Tenant-User über `tenant_user_memberships` mit tenant-spezifischen Rollen. Das Modell ist durchdacht und korrekt.

2. **TypeScript Fullstack ist die richtige Entscheidung.** Shared Types zwischen Frontend und Backend (`@opsweave/shared`), Zod-Validation an API-Grenzen, Drizzle ORM mit typsicheren Queries. `strict: true` in tsconfig. Kein `any` im Schema-Code. Das reduziert eine ganze Klasse von Bugs.

3. **API-Architektur ist solide.** RESTful mit klarem Controller → Service Pattern, globaler Error Handler (AppError-Hierarchie), strukturiertes Logging (pino, JSON in Production). Zod-Validation für alle Inputs. Express-Rate-Limiter konfiguriert (1000/15min).

4. **Docker Single-Container ist clever.** `node:22-alpine` Base, Tini als PID 1, Health Check via wget auf `/api/v1/system/health`, Volume-Mount für SQLite-Persistenz. Ein `docker run`-Befehl und die App läuft. Das ist Enterprise-Deployment-Qualität.

5. **Drizzle ORM für Dual-DB ist pragmatisch.** Schema auf `sqliteTable` definiert (weil SQLite der kleinere gemeinsame Nenner ist), Runtime-Driver-Selektion zwischen better-sqlite3 und postgres-js. DB-spezifischer Code in `/lib/db-specific/` isoliert. Das Muster funktioniert — Grafana macht es ähnlich.

### Kritische Schwächen

1. **Problem:** Keine Row-Level Security (RLS) als Fallback
   - **Impact:** Die Tenant-Isolation verlässt sich zu 100% auf Application-Layer-Filtering. Wenn EIN Service-Aufruf vergisst, nach `tenant_id` zu filtern, können Tenant-Daten leaken. Bei einem ITSM-Tool das Netzwerkdiagramme, Zugangsdaten und Compliance-Dokumente speichert, ist das ein kritisches Security-Risiko.
   - **Evidenz:** Kein Pre-Query-Hook oder Database-Constraint der verhindert, dass ein Query ohne tenant_id-Filter ausgeführt wird. In PostgreSQL wäre RLS möglich (`CREATE POLICY`), in SQLite nicht. Die Architektur bietet keine Defense-in-Depth.
   - **Lösung:** (1) Drizzle Middleware/Hook der warnt/blockiert wenn ein Query auf einer Tenant-Tabelle ohne tenant_id-Filter läuft (development-only). (2) PostgreSQL: RLS-Policies als zusätzliche Absicherung. (3) Systematisches Code-Review aller Service-Methoden auf tenant_id-Filtering.

2. **Problem:** CSRF-Schutz fehlt komplett
   - **Impact:** Stateless JWT ohne CSRF-Token bedeutet: Wenn ein Admin eine bösartige Seite besucht während er eingeloggt ist, kann diese Seite Requests an die OpsWeave-API feuern (Cross-Origin mit Bearer Token aus localStorage). Das ist ein Angriffs-Vektor für Ticket-Erstellung, Daten-Exfiltration, und schlimmstenfalls Tenant-Management.
   - **Evidenz:** Code-Analyse: Keine CSRF-Token-Generierung, kein `csurf`-Middleware, keine SameSite-Cookie-Attribute (stateless JWT, keine Cookies). Die CORS-Config erlaubt `credentials: true` mit konfiguriertem Origin — das limitiert, eliminiert aber nicht das Risiko. Da Token in localStorage statt httpOnly-Cookie gespeichert wird, ist das XSS-Risiko höher als das CSRF-Risiko, aber beide fehlen.
   - **Lösung:** (1) Token-Storage von localStorage zu httpOnly-Cookie migrieren (eliminiert XSS-Exfiltration). (2) SameSite=Strict auf Cookie setzen. (3) Für maximale Sicherheit: CSRF-Token für state-changing Requests.

3. **Problem:** Audit-Trail ist nicht umfassend
   - **Impact:** DORA verlangt einen lückenlosen, unveränderbare Audit-Trail. Der aktuelle Audit-Trail loggt nur `auth.login` und `auth.password_changed`. Ticket-Updates, Asset-Änderungen, Compliance-Mapping-Änderungen, User-Rechte-Änderungen werden NICHT auditiert. Das ist für ein DORA-konformes Tool ein Showstopper.
   - **Evidenz:** `audit.service.ts` → `writeAuditLog()` wird nur in `auth.controller.ts` aufgerufen. `ticket_history` Tabelle existiert für Ticket-Feld-Änderungen, aber das ist kein generischer Audit-Trail. Audit-Logs sind fire-and-forget (Fehler werden verschluckt) und haben keine Integritätssicherung (kein Hash-Chain, kein Append-Only-Storage).
   - **Lösung:** (1) Audit-Log-Calls in alle Controller einbauen (Ticket CRUD, Asset CRUD, User-Management, Compliance-Changes, Settings-Changes). (2) Audit-Trail als Append-Only markieren (DELETE auf audit_logs verbieten). (3) Optional: Hash-Chain für Manipulationssicherheit.

4. **Problem:** Keine Test-Coverage
   - **Impact:** Kein einziger Unit-Test, Integration-Test oder E2E-Test im Backend sichtbar. Bei einem Tool das Multi-Tenant-Isolation, SLA-Berechnungen und Compliance-Daten verwaltet, ist das ein fundamentales Qualitätsrisiko. Jede Code-Änderung kann unbemerkt Tenant-Isolation brechen oder SLA-Berechnungen verfälschen.
   - **Evidenz:** Keine `*.test.ts` oder `*.spec.ts` Dateien im Backend gefunden.
   - **Lösung:** Priorisierte Test-Strategie: (1) Tenant-Isolation-Tests (versuche als Tenant A auf Daten von Tenant B zuzugreifen — muss scheitern), (2) Auth-Tests (Login, Token-Expiry, Role-Checks), (3) SLA-Berechnungs-Tests, (4) E2E-Tests für kritische Flows.

5. **Problem:** SQLite Concurrent Write Limitation
   - **Impact:** SQLite im WAL-Mode erlaubt concurrent Reads aber nur einen Writer. Bei einem MSP mit 10+ Agents die gleichzeitig Tickets bearbeiten, kann das zu "database is locked"-Fehlern führen. Im Seed-Log sind bereits `SQLITE_CONSTRAINT_FOREIGNKEY`-Fehler sichtbar — das deutet auf Race Conditions hin.
   - **Evidenz:** SLA-Breach-Worker und Escalation-Worker werfen beide `SqliteError: FOREIGN KEY constraint failed` beim Start. Das sind wahrscheinlich concurrent Writes die sich gegenseitig blockieren.
   - **Lösung:** (1) SQLite WAL-Mode + `busy_timeout` konfigurieren (falls nicht bereits). (2) Write-Serialisierung für Background-Worker (Queue alle Writes durch einen Channel). (3) Dokumentation: "SQLite ist für ≤5 concurrent Users. Ab 5+ empfehlen wir PostgreSQL."

### Fehlende Features (Showstopper für die Zielgruppe)

1. **HTTPS-Enforcement in Production** — Helmet sendet HSTS, aber die Nginx-Config und TLS-Setup sind nicht Teil des Standard-Deployments. Ein ITSM-Tool MUSS TLS erzwingen.
2. **Secret Rotation** — JWT-Secret und Session-Secret werden einmalig gesetzt. Keine Rotation-Strategie, kein Secret-Versioning.
3. **Backup-Strategie** — Keine eingebaute Backup-Lösung für SQLite oder PostgreSQL. Für Production-Deployments kritisch.
4. **Rate Limiting pro Tenant/User** — Aktuell global (1000/15min über alle User). Ein böswilliger Tenant kann die API für alle blockieren.
5. **Token-Revocation** — Stateless JWT kann nicht widerrufen werden. Wenn ein Admin-Account kompromittiert wird, bleibt der Token bis zum Ablauf (8h default) gültig.

### Features die die Konkurrenz hat und wir nicht

| Feature | Wer hat es | Brauchen wir es? |
|---|---|---|
| RLS (Database-Level Isolation) | ServiceNow, Salesforce | Ja — Defense-in-Depth für Multi-Tenant |
| SSO/SAML | Alle Enterprise-Tools | Ja für Enterprise-Kunden — OIDC ist geplant laut CLAUDE.md |
| API Webhooks (Outbound) | Zammad, Freshservice, JSM | Ja — für Integration mit externen Systemen |
| Scheduled Reports | TOPdesk, Freshservice | Nice-to-have |
| Horizontal Scaling (Stateless Backend) | ServiceNow, Freshservice | Erst relevant bei 100+ Tenants — Backend ist bereits stateless |
| SQLite → PostgreSQL Migration Tool | n/a | Ja — Kunden die wachsen brauchen einen Upgrade-Pfad |

### Überraschungs-Idee

**"Compliance-as-Code" — regulatorische Frameworks als versionierte YAML-Dateien:**

Statt Compliance-Frameworks nur über die UI zu pflegen: Biete vorgefertigte Framework-Definitionen als YAML-Dateien im Repository an. MSPs können per `docker run` ein Tool starten das bereits DORA und NIS2 vorstrukturiert hat — ohne manuelle Eingabe. Das Repository wird zum "Compliance-Katalog" den die Community erweitern kann (BSI IT-Grundschutz, ISO 27001, SOC 2, etc.).

```yaml
# frameworks/dora-2025.yaml
name: "DORA — Digital Operational Resilience Act"
version: "2025-01-17"
requirements:
  - code: "DORA-17.1"
    title: "ICT-related incident classification"
    category: "Incident Management"
    description: "..."
  - code: "DORA-17.2"
    title: "Major ICT-related incident reporting"
    ...
```

Das senkt die Einstiegshürde für Compliance massiv und differenziert OpsWeave von jedem Konkurrenten.

### Verdict

**Bedingt empfehlenswert.** Die Architektur ist solide und die Dual-DB-Strategie ist pragmatisch. Die Multi-Tenancy-Implementierung ist auf Application-Level gut, aber braucht Defense-in-Depth (RLS, Audit, Tests). Für einen Proof-of-Concept / MVP ist der aktuelle Stand akzeptabel. Für Production mit echten Kundendaten braucht es: (1) umfassenden Audit-Trail, (2) CSRF/Token-Sicherheit, (3) Test-Coverage für Tenant-Isolation, (4) SQLite-Concurrency-Dokumentation. Das sind 4-6 Wochen Arbeit — machbar, aber nicht optional.

---

## Experte 4: Open-Source-Community-Builder

*Hat zwei CNCF-Projekte von 0 auf 5.000 GitHub Stars gebaut, DevRel-Erfahrung*

### Was funktioniert gut

1. **Docker-first Deployment ist der perfekte Community-Einstieg.** Ein `docker run`-Befehl ist die niedrigste Einstiegshürde die möglich ist. Kein "installiere Ruby, PostgreSQL, ElasticSearch, Redis" (Zammad). Kein "konfiguriere Apache, PHP, MySQL" (GLPI). OpsWeave hat den besten Time-to-Running aller Open-Source-ITSM-Tools.

2. **Die Lizenzwahl AGPL-3.0 ist strategisch korrekt.** Grafana beweist: AGPL schützt vor Cloud-Forks (AWS/GCP können nicht einfach "Managed OpsWeave" anbieten) und verhindert trotzdem nicht die Adoption. AGPL ist strenger als GPL aber weniger kontrovers als SSPL (MongoDB). Für ein Produkt das Self-Hosted-First verkauft wird, ist AGPL ideal.

3. **TypeScript Fullstack senkt die Contributor-Hürde.** JavaScript/TypeScript ist die meistgesprochene Programmiersprache auf GitHub. Perl (Znuny), Ruby (Zammad), PHP (GLPI, iTop) haben alle kleinere Developer-Pools. Ein potenzieller Contributor muss nur TypeScript können um am Frontend UND Backend arbeiten zu können.

4. **CI/CD ist konfiguriert.** GitHub Actions für Tests, Linting, Docker Build, Release. Semantic Versioning mit Tags. Changelog vorhanden. Das sind die Basics — aber viele Projekte scheitern schon daran.

5. **Conventional Commits und saubere Git-History.** Strukturierte Commit-Messages erleichtern Contributors das Verständnis der Projektgeschichte.

### Kritische Schwächen

1. **Problem:** GitHub-Sichtbarkeit ist bei 0
   - **Impact:** Ohne Stars, ohne Forks, ohne Issues gibt es keine soziale Validierung. Ein Entwickler der das Repo findet fragt sich: "Nutzt das jemand? Ist es aktiv? Ist es sicher?" Ohne Stars ist die Antwort implizit "nein".
   - **Evidenz:** OpsWeave hat aktuell 0 Stars (öffentliches Repo existiert, aber keine Community-Aktivität). Zum Vergleich: GLPI 5.693, Zammad 5.445, NetBox 19.991.
   - **Lösung:** Aktive Seeding-Strategie: (1) "awesome-selfhosted" Liste (PR einreichen), (2) AlternativeTo Eintrag, (3) Reddit r/selfhosted, r/sysadmin, r/msp Posts, (4) Hacker News "Show HN", (5) Spiceworks Community, (6) ITSM-Foren, (7) LinkedIn Posts in DACH IT-Gruppen.

2. **Problem:** Keine Demo-Instanz
   - **Impact:** 90% der potenziellen User wollen ein Tool ausprobieren BEVOR sie Docker installieren. Ohne Demo-Instanz verliert OpsWeave alle User die nicht bereit sind, `docker run` auszuführen um sich einen ersten Eindruck zu machen.
   - **Evidenz:** Zammad hat demo.zammad.com, GLPI hat demo.glpi-project.org. Selbst iTop hat eine Online-Demo. Das ist Standard.
   - **Lösung:** Demo-Instanz auf einer günstigen VM (Hetzner Cloud, €5/Monat) mit automatischem Reset alle 24h. Read-Only oder mit eingeschränkten Rechten. Link prominent auf README und Docs.

3. **Problem:** README ist (wahrscheinlich) nicht einladend genug
   - **Impact:** Das README ist das Schaufenster. In 10 Sekunden muss ein Besucher verstehen: (1) Was ist das? (2) Warum sollte mich das interessieren? (3) Wie probiere ich es aus? Screenshots, GIFs, Feature-Badges, "Quick Start in 60 Seconds"-Section.
   - **Evidenz:** README existiert (EN + DE), aber ohne Analyse des Inhalts schwer zu bewerten. Entscheidend: Hat es Screenshots? Hat es ein GIF/Video? Hat es eine 3-Schritt-Installation?
   - **Lösung:** README-Template von erfolgreichen Projekten übernehmen: (1) Hero-Screenshot, (2) Feature-Badges, (3) 3-Schritt-Installation, (4) Feature-Liste mit Screenshots, (5) "Why OpsWeave?" Section.

4. **Problem:** Solo-Maintainer — Bus-Faktor = 1
   - **Impact:** Kein Unternehmen (und kein vernünftiger MSP) baut sein ITSM auf einem Projekt auf das von einer Person abhängt. Wenn Sebastian aufhört, krank wird oder das Interesse verliert, ist das Projekt tot. Das ist das Todesurteil für Enterprise-Adoption.
   - **Evidenz:** Alle erfolgreichen Open-Source-ITSM-Projekte haben mehrere Core-Maintainer: Zammad (Firma mit ~30 MA), GLPI (Teclib, Firma), iTop (Combodo, Firma), NetBox (NetBox Labs, $35M VC).
   - **Lösung:** (1) Kurzfristig: Transparent kommunizieren — Roadmap, Blog, regelmäßige Updates. "Ich bin allein, aber ich bin committed." (2) Mittelfristig: 2-3 Teil-Contributors gewinnen (fokussiert: "Suche Frontend-Contributor für Portal-Verbesserungen"). (3) Langfristig: Firma gründen wenn MRR es rechtfertigt. Bis dahin: Governance-Dokument (wer entscheidet was wenn Sebastian ausfällt).

5. **Problem:** Keine Community-Infrastruktur
   - **Impact:** GitHub Issues allein reichen nicht für Community-Building. Nutzer brauchen einen Ort zum Fragen stellen, Features diskutieren, sich gegenseitig zu helfen. Ohne das bleibt OpsWeave ein "Projekt" und wird nie eine "Community".
   - **Evidenz:** Kein Discord, kein Slack, kein Forum, kein Discourse. Zammad hat Community-Forum, GLPI hat Discord + Forum, NetBox hat Slack.
   - **Lösung:** GitHub Discussions aktivieren (kostenlos, niedrige Hürde). Später: Discord Server wenn Community wächst.

### Fehlende Features (Showstopper für die Zielgruppe)

1. **CONTRIBUTING.md mit Developer-Guide** — Wie baut man das Projekt lokal? Wo fängt man an? "Good First Issues" im Issue-Tracker
2. **Demo-Instanz** — Online ausprobieren ohne Docker
3. **Plugin/Extension-API** — Ermöglicht Community-Beiträge ohne Core-Änderungen
4. **Releases-Seite mit Binaries/Docker-Tags** — Einfaches Upgrade-Verfahren

### Features die die Konkurrenz hat und wir nicht

| Feature | Wer hat es | Brauchen wir es? |
|---|---|---|
| Plugin-Ökosystem | GLPI, iTop, FreeScout | Langfristig ja — senkt Contributor-Hürde |
| Marketplace/Extension Store | Zammad, GLPI | Erst wenn Community groß genug |
| Demo-Instanz | Zammad, GLPI, iTop | Ja — sofort |
| Community Forum/Discord | Zammad, GLPI, NetBox | Ja — GitHub Discussions als Start |
| Developer Documentation | NetBox, Zammad | Ja — API-Docs + Contributor-Guide |

### Überraschungs-Idee

**"MSP-in-a-Box" als Positionierung statt "Open-Source ITSM":**

Statt gegen Zammad, GLPI und iTop als "noch ein ITSM" anzutreten, positioniere OpsWeave als **"das komplette MSP-Toolkit in einem Docker-Container"**. Betone nicht die einzelnen Features (Ticketing, CMDB, Compliance) sondern die **Integration**: "Ein Tool statt fünf. Ein Login. Eine Datenbank. Ein Update."

Tagline-Vorschlag: **"Stop juggling tools. Start weaving operations."**

Das spricht den Pain-Point direkt an (OTRS + i-doit + Check_MK + Excel + Word = 5 Tools die nicht reden) und macht den USP klar.

### Weg zu 100 GitHub Stars

1. **Woche 1-2:** awesome-selfhosted PR, AlternativeTo Eintrag, r/selfhosted Post mit Screenshots
2. **Woche 3-4:** Hacker News "Show HN" Post (Timing: Montag oder Dienstag Vormittag US-Zeit)
3. **Woche 5-6:** Blog-Post "Why I built an Open-Source ITSM for MSPs" auf Dev.to / Hashnode / Medium
4. **Woche 7-8:** r/msp, r/sysadmin mit konkretem Use Case ("How I replaced OTRS + i-doit with one Docker container")
5. **Laufend:** LinkedIn Posts in DACH IT-Gruppen, Spiceworks Forum, Check_MK Community Forum

**Realistisch:** 100 Stars in 3-4 Monaten wenn Content konsistent kommt. 500 Stars in 12 Monaten wenn das Produkt hält was es verspricht.

### Verdict

**Bedingt empfehlenswert — mit klarer Community-Strategie.** Das Produkt ist technisch stark genug für einen Launch. Was fehlt ist Sichtbarkeit und Vertrauen. Die ersten 100 Stars sind die härtesten — danach wird es einfacher weil soziale Validierung einsetzt. Die größte Gefahr ist nicht das Produkt sondern die Unsichtbarkeit.

---

## Experte 5: MSP-Operations-Manager

*42, leitet 30-Personen-MSP im DACH-Raum, 50 Kunden, nutzt OTRS + i-doit + Check_MK, frustriert*

### Was funktioniert gut

1. **Multi-Tenant ist exakt was ich brauche.** Ich betreue 50 Kunden — jeder ist ein Mandant mit eigenen SLAs, eigenen Assets, eigenen Kontakten. Schnelles Mandanten-Wechseln über Dropdown im Header, tenant-spezifische Rollen (mein Junior ist Agent bei Kunde A, aber Viewer bei Kunde B) — das ist durchdacht.

2. **Check_MK-Integration mit Auto-Incident-Erstellung.** Wenn ein Host down geht → automatisch Ticket erstellen, mit Deduplizierung (nicht 500 Tickets weil ein Switch ausfällt), mit Auto-Resolve wenn der Host wieder up ist. Das ist genau der Workflow den ich mit OTRS manuell nachbauen musste (und der ständig kaputt geht).

3. **DORA/NIS2-Compliance-Modul.** Mein Kunde in der Finanzbranche fragt monatlich: "Können Sie nachweisen welche Assets für uns laufen, welche Incidents es gab, und ob die SLAs eingehalten wurden?" Mit dem Compliance-Modul (Framework → Requirements → Service Mapping → Gap Analysis) kann ich das zum ersten Mal in einem Tool abbilden statt in Excel.

4. **Service Catalog mit Horizontal + Vertical.** Ich kann einen Basis-Katalog erstellen und für einzelne Kunden anpassen (Gold-SLA bekommt schnellere Reaktionszeiten, Silver bekommt Standard). Das ersetzt meine Word-Dokumente für Leistungsbeschreibungen.

5. **Ein Tool statt fünf.** Aktuell: OTRS (Tickets) + i-doit (CMDB) + Check_MK (Monitoring) + Excel (SLA-Tracking) + Word (Service-Beschreibungen). Fünf Logins, fünf Datenbanken, fünf Update-Zyklen, keine Integration. OpsWeave ersetzt theoretisch alles in einem Docker-Container.

### Kritische Schwächen

1. **Problem:** Kein CSV-Import für Assets oder Tickets
   - **Impact:** Ich habe 5.000 Assets in i-doit und 20.000 Tickets in OTRS. Ohne Import-Tool ist eine Migration unmöglich. Manuell eingeben? Bei 5.000 Assets à 5 Minuten = 420 Stunden = 10 Wochen Vollzeit. Das macht niemand.
   - **Evidenz:** Kein Import-Endpoint in der API, kein CSV-Parser im Code, kein Import-Dialog im Frontend.
   - **Lösung:** CSV-Import mit Column-Mapping für Assets und Tickets. Bonus: OTRS-XML-Import. Das ist der #1 Blocker für jede reale Migration.

2. **Problem:** Kein SLA-Business-Hours-Kalender
   - **Impact:** SLAs werden nach Geschäftszeiten gemessen (Mo-Fr 8-18 Uhr, ohne Feiertage). Ohne Business-Hours-Kalender zählt ein P1-Ticket am Samstag um 23:00 in die SLA-Berechnung — das ist falsch und kann zu falschen SLA-Breaches führen. Meine Kunden-Reports wären unbrauchbar.
   - **Evidenz:** SLA-Engine berechnet Breach basierend auf absoluten Zeitstempeln. Kein `business_hours`-Feld in SLA-Definitions sichtbar, kein Feiertags-Kalender.
   - **Lösung:** Business-Hours-Konfiguration pro SLA-Tier: Arbeitszeiten (Start/Ende pro Wochentag), Feiertags-Kalender pro Mandant, SLA-Berechnung nur in Geschäftszeiten.

3. **Problem:** Mandantenübergreifende Suche fehlt
   - **Impact:** Montagmorgen: 3 Major Incidents über verschiedene Kunden. Ich muss für jeden Kunden einzeln den Mandanten wechseln und die Tickets suchen. Das dauert 5 Minuten statt 30 Sekunden. "Zeige mir alle offenen P1-Tickets über alle Mandanten" ist NICHT möglich.
   - **Evidenz:** Jeder API-Call filtert nach `tenant_id`. Es gibt keinen "Super-Admin-View" der mandantenübergreifend sucht.
   - **Lösung:** Super-Admin-Dashboard mit mandantenübergreifender Ticket-Ansicht (filtert nach Priority, Status, SLA-Breach). Opt-in für Datenschutz — der Super-Admin muss explizit die Berechtigung haben.

4. **Problem:** Keine Time-Tracking-Funktion
   - **Impact:** Mein MSP rechnet nach Aufwand ab. Jeder Techniker muss seine Zeit pro Ticket erfassen. Ohne Time-Tracking muss ich ein weiteres Tool nutzen (Toggl, Harvest, Excel) und die Daten manuell zusammenführen. Das ist genau die Tool-Fragmentierung die OpsWeave lösen soll.
   - **Evidenz:** Kein `time_entries`-Tabelle im Schema, kein Time-Tracking-UI im Ticket-Detail.
   - **Lösung:** Simple Time-Tracking: Start/Stop-Timer im Ticket-Detail, manuelle Zeiteingabe, Auswertung pro Mandant/Monat.

5. **Problem:** E-Mail-Integration unsicher mit Microsoft 365
   - **Impact:** 90%+ meiner Kunden nutzen Microsoft 365. M365 hat IMAP Basic Auth weitgehend abgeschaltet (nur noch mit OAuth2 / Modern Auth). IMAP-Polling mit Username/Passwort funktioniert möglicherweise nicht oder wird demnächst deaktiviert.
   - **Evidenz:** E-Mail-Inbound nutzt IMAP-Polling. Kein OAuth2-Flow, keine Microsoft Graph API Integration. `emailInboundConfigs.config` ist ein JSON-Feld — unklar ob OAuth-Tokens gespeichert werden können.
   - **Lösung:** Microsoft Graph API Integration für E-Mail-Eingangsverarbeitung (OAuth2 App Registration, Mail.Read Permission, Webhook oder Polling via Graph API). Das ist nicht optional für MSPs im M365-Ökosystem.

### Fehlende Features (Showstopper für die Zielgruppe)

1. **CSV/Bulk-Import** für Assets und Tickets (Migration)
2. **SLA Business Hours** mit Feiertags-Kalender
3. **Mandantenübergreifende Suche** (Super-Admin-View)
4. **Time Tracking** pro Ticket
5. **Microsoft 365 Graph API** für E-Mail-Inbound
6. **SLA-Reports** für Kunden (exportierbar als PDF)
7. **AD/LDAP-Sync** für User und Computer-Objekte

### Features die die Konkurrenz hat und wir nicht

| Feature | Wer hat es | Brauchen wir es? |
|---|---|---|
| AD/LDAP Sync | Alle kommerziellen + Zammad, GLPI | Ja — Pflicht für MSP-Betrieb |
| Remote Access Integration | ConnectWise, Autotask | Nice-to-have, nicht Prio 1 |
| Billing/Invoicing | ConnectWise, Autotask | Wäre toll, aber nicht Kern-ITSM |
| Notification Rules (Custom) | TOPdesk, Freshservice | Ja — "Notify Kunde bei P1", "Notify Manager bei SLA-Breach" |
| Escalation Matrix | TOPdesk, ServiceNow | Grundstruktur existiert, aber Escalation-Worker hat Bugs |
| Dashboard Customization | Freshservice, ServiceNow | Nice-to-have — Standard-Dashboard reicht erstmal |

### Überraschungs-Idee

**"MSP Peer Benchmarking" (anonymisiert):**

Biete an, anonymisierte Betriebskennzahlen zwischen OpsWeave-Instanzen zu teilen: "Ihre durchschnittliche P1-Lösungszeit: 2,3h. Durchschnitt aller MSPs: 4,1h." Das gibt MSPs Benchmarks für ihre eigene Leistung — etwas das kein Tool bietet und das immensen Wert hat für Kundengespräche ("Wir sind 44% schneller als der Branchendurchschnitt").

Opt-in, anonymisiert, datenschutzkonform. Kann als Enterprise-Feature monetarisiert werden.

### Würde ich zahlen?

**Ja — unter Bedingungen.**

Was ich zahlen würde:
- **€0/Monat** für Community Edition zum Evaluieren (3-6 Monate)
- **€30-50/Agent/Monat** für Enterprise Edition WENN: CSV-Import, AD-Sync, SLA Business Hours, Time Tracking, mandantenübergreifende Suche vorhanden sind
- **€80-100/Agent/Monat** für eine Hosted/Managed Version mit garantiertem Support

Bei welchem Preis sage ich "dann bleibe ich bei OTRS"?
- **Über €70/Agent/Monat** Self-Hosted — dann bin ich im TOPdesk/Freshservice-Bereich und nehme lieber ein etabliertes Tool
- **Unter €30/Agent/Monat** Self-Hosted — da bin ich sofort dabei wenn die Features stimmen

**Break-Even-Rechnung:** Mein aktueller Stack (OTRS + i-doit + Check_MK + Excel-Aufwand) kostet mich ca. €500/Monat an Betriebsaufwand (Server, Updates, Integration-Pflege) + ca. 8h/Monat Admin-Zeit (€800 Opportunitätskosten). Wenn OpsWeave bei 15 Agents × €40 = €600/Monat das alles ersetzt, lohnt sich das ab Tag 1.

### Verdict

**Bedingt empfehlenswert — wenn die kritischen Lücken geschlossen werden.**

OpsWeave adressiert genau meinen Pain Point: fünf Tools die nicht miteinander reden. Die Multi-Tenancy ist exakt was ein MSP braucht. Das Compliance-Modul ist ein Alleinstellungsmerkmal. Die UI ist überraschend gut für Open Source.

ABER: Ohne CSV-Import kann ich nicht migrieren. Ohne SLA Business Hours kann ich keine korrekten Reports liefern. Ohne Time Tracking fehlt mir ein Kernfeature für die Abrechnung. Ohne M365-Graph-API-Integration funktioniert E-Mail-Inbound bei 90% meiner Kunden nicht zuverlässig.

Ich würde OpsWeave in 6-12 Monaten nochmal evaluieren. Wenn die Top-5-Lücken geschlossen sind, bin ich bereit zum Piloten mit 2-3 Kunden.

---

## BLOCK 3: Cross-Analyse & Konflikte

### Wo sind sich alle Experten einig

1. **Die Marktlücke ist real.** Alle 5 Experten bestätigen: Kein Open-Source-ITSM kombiniert Multi-Tenant + CMDB + Compliance + Check_MK in einem Produkt.
2. **CSV-Import ist ein Showstopper.** Ohne Import-Funktion kann niemand migrieren (Experte 1, 2, 5).
3. **Die UI ist beeindruckend.** Deutlich besser als OTRS, GLPI, iTop. Auf Augenhöhe mit Zammad (Experte 2, 4).
4. **Der Audit-Trail muss umfassender werden** für DORA-Compliance-Glaubwürdigkeit (Experte 3, 5).
5. **Demo-Instanz fehlt** und kostet Adoption (Experte 4, implizit Experte 2).
6. **DORA/NIS2-Compliance als Wedge-Feature** hat enormes Potenzial — Timing ist ideal (Experte 1, 3, 5).
7. **Solo-Maintainer-Risiko** muss adressiert werden — mindestens durch Transparenz und Governance (Experte 1, 4).

### Konflikte

### Konflikt 1: All-in-One vs. "Eine Sache richtig"

**Position A:** Experte 1 (Product Strategist) warnt — "Alles ein bisschen" schlägt niemanden. Fokussiere auf einen "Wedge" (Check_MK + CMDB + Compliance) und mache das besser als alle anderen. Ticketing ist die notwendige Basis, aber nicht der USP.

**Position B:** Experte 5 (MSP-Manager) sagt — All-in-One IST der USP. "Ich will EIN Tool statt fünf. Wenn ich weiterhin Zammad für Tickets und i-doit für CMDB brauche, warum sollte ich OpsWeave nehmen?" Der Schmerz des MSPs ist die Fragmentierung, nicht die fehlende Tiefe eines einzelnen Features.

**Empfehlung:** Position B ist stärker — aber mit Position A als Strategie. All-in-One ist der USP für den Endkunden (MSP), aber Compliance ist der Marketing-Wedge der den Einstieg motiviert. "Komm wegen DORA, bleib wegen der Integration."

---

### Konflikt 2: AGPL-3.0 beibehalten vs. MIT/Apache wechseln

**Position A:** Experte 4 (Community-Builder) sagt — AGPL beibehalten. Grafana beweist dass AGPL funktioniert. Es schützt vor Cloud-Forks und zwingt Contributor-Beiträge zurück ins Projekt.

**Position B:** Implizit Experte 1 (Product Strategist) — Manche Enterprises haben Blanket-Policies gegen AGPL. Dual Licensing (AGPL + Commercial) als Kompromiss.

**Empfehlung:** AGPL beibehalten + Commercial License als Enterprise-Option anbieten. Das ist das Grafana-Modell und hat sich bewährt. Die wenigen Enterprises die AGPL ablehnen können die Commercial License kaufen — das ist sogar ein Revenue-Stream.

---

### Konflikt 3: Self-Hosted-First vs. Cloud-First

**Position A:** Experte 4 (Community-Builder) + Experte 5 (MSP-Manager) — Self-Hosted-First ist richtig für MSPs. Sie können Docker betreiben, sie wollen Datenhoheit, sie sind in regulierten Umgebungen.

**Position B:** Experte 1 (Product Strategist) — 64,8% des Marktes ist Cloud. Langfristig muss ein Cloud-Angebot kommen um den größeren Markt zu erschließen.

**Empfehlung:** Self-Hosted-First jetzt, Cloud als mittelfristiges Ziel (nach Firmengründung). Die Zielgruppe (DACH MSPs in regulierten Branchen) akzeptiert Self-Hosted — und es differenziert von Freshservice (Cloud-only).

---

### Konflikt 4: Scope-Realismus für Solo-Maintainer

**Position A:** Experte 3 (Architect) — Der Scope ist für einen Solo-Maintainer mit Vollzeitjob unrealistisch. Tests fehlen komplett, Audit-Trail ist unvollständig, Security-Hardening steht aus. "4-6 Wochen Arbeit" für die Basics — neben dem Job.

**Position B:** Experte 5 (MSP-Manager) — "Ich brauche CSV-Import, SLA Business Hours, Time Tracking, AD-Sync, Graph API." Das sind weitere Monate an Features die alle "must-have" sind.

**Position C:** Experte 4 (Community-Builder) — Erstmal Community aufbauen, dann Features. Ohne Community gibt es keine Contributors, ohne Contributors keinen Scope-Expansion.

**Empfehlung:** Strikt priorisieren. Die nächsten 3 Monate: (1) Security-Basics (Audit-Trail, CSRF), (2) CSV-Import (Migration-Blocker lösen), (3) Demo-Instanz + Community-Launch (awesome-selfhosted, Reddit, HN). Alles andere kommt danach oder durch Contributors.

---

### Konflikt 5: Open-Source-Community vs. Enterprise-Sales

**Position A:** Experte 4 (Community-Builder) — Fokus auf Community, Stars, Adoption. Free User heute = zahlender Kunde morgen. Enterprise-Sales ohne Community ist sinnlos (kein Social Proof).

**Position B:** Experte 1 (Product Strategist) — Der Weg zu Revenue führt über 50 Enterprise-Lizenzen à €100/Monat. Die Community ist Mittel zum Zweck, nicht Selbstzweck. Fokussiere auf Features die Enterprise-Kunden brauchen (AD-Sync, OIDC, Audit).

**Empfehlung:** Beides parallel — Community für Sichtbarkeit (Stars, Forks, Blog), Enterprise-Features für Revenue (AD-Sync, OIDC, umfassender Audit). Die Community bringt Glaubwürdigkeit, die Enterprise-Features bringen Geld. Reihenfolge: Community-Launch zuerst (0-3 Monate), dann Enterprise-Features (3-12 Monate).

---

## BLOCK 4: Feature-Gap-Matrix

| Feature | OpsWeave | Zammad | OTRS/Znuny | iTop | GLPI | Freshservice | TOPdesk | Bewertung |
|---|---|---|---|---|---|---|---|---|
| **Ticketing** | ✅ Kanban + DnD + History | ✅ Multi-Channel | ✅ ITIL-aligned | ✅ ITIL-aligned | ✅ Lifecycle | ✅ Modern UI | ✅ Etabliert | Parity |
| **CMDB (integriert)** | ✅ DAG-Relations, Graph-Viz | ❌ | ⚠️ Add-on | ✅ **Best-in-class** | ✅ Built-in | ✅ + Discovery | ✅ Höhere Tiers | Parity (vs. Freshservice), Gap vs. iTop |
| **Multi-Tenant (nativ)** | ✅ **Row-Level, Rollen pro Tenant** | ❌ | ❌ | ⚠️ Paid Extension | ⚠️ Entities | ✅ MSP Mode | ⚠️ Shared-Services | **USP** (Open-Source-Bereich) |
| **Service Catalog** | ✅ 3-Tier (Horizontal+Vertical) | ❌ | ⚠️ Basic | ✅ | ❌ | ✅ | ✅ | Parity |
| **Workflow Engine** | ✅ Template + Steps + Auto-Trigger | ❌ | ✅ | ✅ | ❌ | ✅ Advanced | ✅ | Parity |
| **DORA/NIS2 Compliance** | ✅ **Framework + Requirements + Matrix + Gap** | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ Basic | **USP** |
| **Check_MK Integration** | ✅ Webhook + Auto-Incident + Dedup + Auto-Resolve | ✅ **Native, First-class** | ⚠️ Notification | ⚠️ Collector | ⚠️ Plugin | ❌ | ❌ | Parity (vs. Zammad) |
| **Email Inbound** | ✅ IMAP + Thread-Matching | ✅ Multi-Channel | ✅ | ✅ | ✅ | ✅ | ✅ | Parity, Gap: kein M365 Graph |
| **Customer Portal** | ✅ Separate Auth, KB, Tickets | ✅ Modern | ✅ | ✅ | ✅ | ✅ White-Label | ✅ White-Label | Gap: kein White-Labeling |
| **Knowledge Base** | ✅ Markdown, Visibility, Ticket-Links | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Parity |
| **REST API** | ✅ Vollständig, Zod-validiert | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Parity |
| **Open Source** | ✅ AGPL-3.0 | ✅ AGPL-3.0 | ✅ GPL-3.0 | ✅ AGPL-3.0 | ✅ GPL-3.0 | ❌ | ❌ | Parity (vs. OSS) |
| **Dual-DB (PG + SQLite)** | ✅ **Einzigartig** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **USP** |
| **Docker Single-Container** | ✅ **`docker run` = fertig** | ⚠️ Docker-Compose | ⚠️ Komplex | ⚠️ Komplex | ⚠️ Komplex | n/a (Cloud) | n/a (Cloud) | **USP** |
| **i18n (de/en)** | ✅ 12 Namespaces, 99%+ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Parity |
| **SLA Management** | ⚠️ Basis (keine Business Hours) | ⚠️ Basic | ✅ Mit Kalender | ✅ | ⚠️ | ✅ Vollständig | ✅ Vollständig | **Gap** — Business Hours fehlen |
| **Audit Trail** | ⚠️ Nur Auth-Events | ⚠️ Basic | ✅ Umfassend | ✅ | ⚠️ | ✅ | ✅ | **Gap** — nicht DORA-ready |
| **AD/LDAP Integration** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Gap** — Enterprise-Blocker |
| **Asset Import/Discovery** | ❌ | ❌ | ❌ | ❌ | ⚠️ Plugin | ✅ | ⚠️ | **Gap** — Migration-Blocker |
| **Time Tracking** | ❌ | ❌ | ⚠️ | ❌ | ❌ | ✅ | ✅ | Gap (aber auch bei OSS-Konkurrenz) |
| **Mobile App** | ❌ (Responsive Web) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | Bewusst nicht (noch) |
| **AI Features** | ❌ | ✅ v7.0 | ❌ | ❌ | ❌ | ✅ Freddy | ⚠️ | Bewusst nicht (noch) |
| **Test Coverage** | ❌ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | **Gap** — Qualitätsrisiko |

### Zusammenfassung

**USPs von OpsWeave (einzigartig im Open-Source-Bereich):**
1. Multi-Tenant nativ (row-level, tenant-spezifische Rollen) — kein anderes OSS-ITSM hat das
2. DORA/NIS2-Compliance-Modul — kein anderes ITSM (OSS oder kommerziell unter €50k) hat das
3. Dual-DB (PostgreSQL + SQLite) — einzigartig
4. Docker Single-Container Deployment — einfachstes Setup aller ITSM-Tools
5. All-in-One (Ticketing + CMDB + Workflows + Compliance + Monitoring + Portal + KB) — i-doit + Zammad + Check_MK in einem

**Kritische Gaps:**
1. Kein Asset/Ticket-Import (CSV)
2. SLA ohne Business Hours
3. Audit Trail unvollständig
4. Keine Tests
5. Kein AD/LDAP
6. Kein White-Label Portal

---

## BLOCK 5: Priorisierter Maßnahmenplan

### MUSS VOR ERSTEM PUBLIC LAUNCH (Showstopper)

1. **Umfassender Audit-Trail** — Alle CRUD-Operationen auf Tickets, Assets, Users, Compliance, Settings auditieren. Append-Only. DORA-Glaubwürdigkeit hängt davon ab. (Experte 3, 5)

2. **Demo-Instanz online stellen** — Hetzner Cloud VM, €5/Monat, automatischer Reset alle 24h. Ohne Demo kein Ausprobieren. (Experte 4, 2)

3. **README aufpolieren** — Hero-Screenshot, Feature-Liste, 3-Schritt-Quick-Start, GIF/Video. Das ist das Schaufenster. (Experte 4)

4. **GitHub Discussions aktivieren** — Kostenlos, null Aufwand, gibt Nutzern einen Ort für Fragen. (Experte 4)

5. **CSRF/Token-Security härten** — Token-Storage review (localStorage → httpOnly Cookie evaluieren). Helmet CSP aktivieren. (Experte 3)

6. **SQLite-FK-Errors fixen** — SLA-Breach-Worker und Escalation-Worker werfen FOREIGN KEY Errors. Das sind sichtbare Bugs die Vertrauen zerstören. (Experte 3, 5)

### SOLLTE FÜR V1.0 (stark empfohlen für Glaubwürdigkeit)

1. **CSV-Import für Assets und Tickets** — Column-Mapping-Dialog, Validierung, Fehler-Report. Ohne das keine Migration möglich. (Experte 1, 2, 5)

2. **SLA Business Hours + Feiertags-Kalender** — Pro SLA-Tier konfigurierbar, pro Mandant. Ohne korrekte SLA-Berechnung sind SLA-Reports unbrauchbar. (Experte 5)

3. **White-Label Portal** — Logo, Primärfarbe, App-Name pro Tenant konfigurierbar. Branding über `tenants.settings` JSON. (Experte 2, 5)

4. **DORA/NIS2-Frameworks als Seed-Daten** — Vorgefertigte Framework-Definitionen (alle Artikel, alle Anforderungen) direkt nutzbar beim Setup. Das ist der Wedge. (Experte 1, 3)

5. **Versionierte Compliance-Frameworks als YAML** — Community kann Frameworks beitragen (BSI IT-Grundschutz, ISO 27001). Differenzierung gegenüber jedem Konkurrenten. (Experte 3)

6. **Setup-Wizard nach erstem Login** — 4-5 Schritte: Organisation → User → erstes Asset → erstes Ticket. Reduziert Absprungrate massiv. (Experte 2)

7. **Mandantenübergreifende Suche (Super-Admin)** — Tickets und Assets über alle Mandanten durchsuchen. Essentiell für MSP-Alltag. (Experte 5)

8. **Basis-Test-Suite** — Tenant-Isolation-Tests, Auth-Tests, SLA-Berechnungs-Tests. Nicht 80% Coverage, aber die kritischen Pfade. (Experte 3)

### NACH V1.0 — SCHNELLE ITERATION (Community-Feedback-getrieben)

1. **AD/LDAP Integration** — User + Computer-Objekte synchronisieren. Enterprise-Blocker der in der Community laut werden wird. (Experte 5)

2. **Microsoft 365 Graph API für E-Mail** — OAuth2-basiertes E-Mail-Inbound statt IMAP. Pflicht für M365-Umgebungen. (Experte 5)

3. **Time Tracking** — Start/Stop-Timer, manuelle Eingabe, Auswertung pro Mandant/Monat. MSPs rechnen nach Zeit ab. (Experte 5)

4. **Keyboard Shortcuts** — Globale Shortcuts für Power-User (`n`=neues Ticket, `/`=Suche, `?`=Hilfe). (Experte 2)

5. **Ticket-Templates + Canned Responses** — Vordefinierte Ticket-Vorlagen und Standard-Antworten. (Experte 2)

6. **DORA Compliance Score Dashboard** — Prozentuale Abdeckung der DORA-Anforderungen, Trend über Zeit. (Experte 1)

7. **PDF-Report-Export** — SLA-Reports und Compliance-Reports als PDF für Kunden und Prüfer. (Experte 1, 5)

8. **OIDC/SAML (Enterprise)** — Azure AD, Keycloak, Okta Integration. (CLAUDE.md Phase 6)

9. **Notification Rules** — Konfigurierbare Regeln: "Notify Kunde bei P1", "Notify Manager bei SLA-Breach". (Experte 5)

10. **SQLite → PostgreSQL Migration Tool** — Für Kunden die wachsen und upgraden wollen. (Experte 3)

### PERSPEKTIVISCH V2 (wenn Community + erste zahlende Kunden da sind)

1. **Cloud/Hosted Offering** — Managed OpsWeave für MSPs die kein Docker betreiben wollen
2. **Auto-Discovery (Netzwerk-Scan)** — Asset-Erkennung im Netzwerk, SNMP, WMI
3. **AI Features** — Auto-Kategorisierung, Ticket-Zusammenfassungen, KB-Vorschläge
4. **Plugin/Extension API** — Community kann Features beisteuern ohne Core zu ändern
5. **MSP Peer Benchmarking** — Anonymisierte Betriebskennzahlen zwischen Instanzen (Experte 5)
6. **Mobile App** — Native App für Field-Techniker
7. **Billing/Invoicing Integration** — Time-Tracking → Rechnung (oder Integration mit Lexoffice/SevDesk)
8. **Check_MK v1 Livestatus** — In CLAUDE.md versprochen, aber nicht implementiert (Experte 3)

### BEWUSST NICHT UMSETZEN (und warum)

1. **Eigenes Monitoring-System** — OpsWeave ist kein Monitoring-Tool. Check_MK/Prometheus-Integration ja, eigenes Monitoring nein. Das würde den Scope sprengen und gegen etablierte Tools (Grafana, Check_MK) verlieren. (Experte 1, 3)

2. **GraphQL API** — REST ist etabliert, dokumentiert, tooling-freundlich. GraphQL bringt Komplexität ohne proportionalen Nutzen für die Zielgruppe. (Experte 3)

3. **On-Prem ohne Docker** — "Native" Installation auf bare-metal Linux ist Wartungsalptraum. Docker ist der Standard. Wer kein Docker kann, ist nicht die Zielgruppe. (Experte 3, 4)

4. **Multi-Language über DE/EN hinaus** — Französisch, Spanisch etc. erst wenn die Community groß genug ist und Contributors die Übersetzungen pflegen. Priorität ist DE/EN perfekt, nicht 10 Sprachen halbgar. (Experte 2)

5. **Offline-First / PWA** — MSPs arbeiten im Büro mit stabilem Internet. Offline-Fähigkeit ist kein Schmerzpunkt der Zielgruppe. (Experte 2, 5)

6. **Blockchain-basierter Audit-Trail** — Marketing-Buzzword. Append-Only + Hash-Chain in PostgreSQL reicht für jeden Auditor. (Experte 3)

---

## Anhang: Quellen

### Open-Source-Konkurrenten
- Znuny: [znuny.org](https://www.znuny.org/en/releases), [community.znuny.org](https://community.znuny.org/)
- Zammad: [zammad.com/pricing](https://zammad.com/en/pricing), [Checkmk Integration](https://zammad.com/en/product/features/checkmk-integration)
- FreeScout: [freescout.net/modules](https://freescout.net/modules/)
- GLPI: [glpi-project.org/pricing](https://www.glpi-project.org/en/pricing/), [Discord](https://discord.com/invite/qgDXNwS)
- iTop: [combodo.com](https://combodo.com/features/), [CheckMK Collector](https://www.itophub.io/wiki/page?id=extensions:itomig:check_mk-collector)
- openITCOCKPIT: [docs.openitcockpit.io](https://docs.openitcockpit.io/en/)
- Ralph: [github.com/allegro/ralph](https://github.com/allegro/ralph)
- NetBox: [netboxlabs.com/pricing](https://netboxlabs.com/pricing/)

### Kommerzielle Konkurrenten
- ServiceNow: [nowtribe.com Pricing 2026](https://nowtribe.com/how-much-does-servicenow-itsm-cost-in-2026-a-complete-breakdown/)
- Jira SM: [eesel.ai Pricing](https://www.eesel.ai/blog/jira-service-management-pricing)
- Freshservice: [freshworks.com/pricing](https://www.freshworks.com/freshservice/pricing/)
- ManageEngine: [manageengine.com/pricing](https://www.manageengine.com/products/service-desk/pricing.html)
- TOPdesk: [topdesk.com/pricing](https://www.topdesk.com/en/pricing/)
- HaloITSM: [usehalo.com/pricing](https://usehalo.com/haloitsm/pricing/)
- ConnectWise: [connectwise.com/pricing](https://www.connectwise.com/pricing)
- EcholoN: [echolon.de](https://www.echolon.de/en/software/cmdb/)

### CMDB
- i-doit: [i-doit.com/pricing](https://www.i-doit.com/en/i-doit/pricing/), [Checkmk 2 Integration](https://kb.i-doit.com/en/i-doit-add-ons/checkmk2/index.html)
- Device42: [faddom.com/device42-pricing](https://faddom.com/device42-pricing-the-5-pricing-tiers-explained/)
- Lansweeper: [lansweeper.com/pricing](https://www.lansweeper.com/pricing/)

### Marktdaten
- NIS2UmsuCG: Deutsches Gesetz seit 06.12.2025
- DORA: EU-Verordnung, anwendbar seit 17.01.2025
- Deutschland Managed Services Markt: $24,4 Mrd. (2023), proj. $47,7 Mrd. (2032)
- ITSM Cloud vs. On-Prem: 64,8% Cloud (2024)
