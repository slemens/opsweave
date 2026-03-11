# Compliance

Das Compliance-Modul verwaltet regulatorische Anforderungen und deren Abdeckung
durch IT-Services.

![Compliance Management](/screenshots/compliance.png)

## Frameworks

Compliance-Frameworks sind Regelwerke mit Anforderungskatalogen:

| Framework | Beispiele |
|-----------|----------|
| ISO 27001 | Informationssicherheit |
| DSGVO | Datenschutz |
| BSI IT-Grundschutz | Bundesamt für Sicherheit |
| SOC 2 | Service Organization Controls |
| HIPAA | Gesundheitsdaten (USA) |
| Eigene Frameworks | Intern definiert |

Jedes Framework hat:
- Name und Version
- Inkrafttreten-Datum
- Anforderungskatalog

## Anforderungen

Anforderungen sind einzelne Kontrollziele innerhalb eines Frameworks:

```
ISO 27001 / A.12.1.1
"Operational procedures shall be documented..."

Kategorie: Operations Security
Abdeckungsgrad: vollständig
Nachweis: "Betriebshandbuch v2.3, Kapitel 4"
```

## Compliance-Matrix

Die Matrix zeigt welche Services welche Anforderungen abdecken:

```
            Req A.12.1.1  Req A.12.1.2  Req A.12.3.1
Service A      ✅ voll      ⚠️ teil       ❌ keine
Service B      ✅ voll      ✅ voll       ⚠️ teil
```

**Abdeckungsgrade:**
- `full` — Anforderung vollständig abgedeckt
- `partial` — Teilweise abgedeckt, Lücken dokumentiert
- `none` — Nicht abgedeckt

## Gap-Analyse

Die Gap-Analyse zeigt:
- Alle unabgedeckten Anforderungen
- Anforderungen mit nur partieller Abdeckung
- Compliance-Score (% der vollständig abgedeckten Anforderungen)

## Asset-Regulatory Flags

Assets können mit Frameworks verknüpft werden um anzuzeigen,
dass spezifische Compliance-Anforderungen für dieses Asset gelten:

```
Asset "customer-database-01"
  → DSGVO (personenbezogene Daten)
  → ISO 27001 (kritische Daten)
```

## REST API

```
GET    /api/v1/compliance/frameworks                          # Frameworks
POST   /api/v1/compliance/frameworks                          # Erstellen
GET    /api/v1/compliance/frameworks/:id/requirements         # Anforderungen
POST   /api/v1/compliance/frameworks/:id/requirements         # Hinzufügen
GET    /api/v1/compliance/frameworks/:id/matrix               # Compliance-Matrix
GET    /api/v1/compliance/frameworks/:id/gaps                 # Gap-Analyse
POST   /api/v1/compliance/mappings                            # Service↔Req verknüpfen
DELETE /api/v1/compliance/mappings                            # Verknüpfung entfernen
GET    /api/v1/compliance/assets/:id                          # Asset-Flags
```

## Community-Limit

Community Edition: **1 Compliance-Framework** pro Tenant.
