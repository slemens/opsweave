# Compliance

The compliance module manages regulatory requirements and their coverage
by IT services.

![Compliance Management](/screenshots/compliance.png)

## Frameworks

Compliance frameworks are regulatory bodies with requirement catalogs:

| Framework | Examples |
|-----------|----------|
| ISO 27001 | Information security |
| GDPR | Data protection |
| BSI IT-Grundschutz | German Federal Office for Information Security |
| SOC 2 | Service Organization Controls |
| HIPAA | Health data (USA) |
| Custom Frameworks | Internally defined |

Each framework has:
- Name and version
- Effective date
- Requirement catalog

## Requirements

Requirements are individual control objectives within a framework:

```
ISO 27001 / A.12.1.1
"Operational procedures shall be documented..."

Category: Operations Security
Coverage level: full
Evidence: "Operations Manual v2.3, Chapter 4"
```

## Compliance Matrix

The matrix shows which services cover which requirements:

```
            Req A.12.1.1  Req A.12.1.2  Req A.12.3.1
Service A      ✅ full      ⚠️ partial    ❌ none
Service B      ✅ full      ✅ full       ⚠️ partial
```

**Coverage levels:**
- `full` — Requirement fully covered
- `partial` — Partially covered, gaps documented
- `none` — Not covered

## Gap Analysis

The gap analysis shows:
- All uncovered requirements
- Requirements with only partial coverage
- Compliance score (% of fully covered requirements)

## Asset Regulatory Flags

Assets can be linked to frameworks to indicate that
specific compliance requirements apply to that asset:

```
Asset "customer-database-01"
  → GDPR (personal data)
  → ISO 27001 (critical data)
```

## REST API

```
GET    /api/v1/compliance/frameworks                          # Frameworks
POST   /api/v1/compliance/frameworks                          # Create
GET    /api/v1/compliance/frameworks/:id/requirements         # Requirements
POST   /api/v1/compliance/frameworks/:id/requirements         # Add
GET    /api/v1/compliance/frameworks/:id/matrix               # Compliance matrix
GET    /api/v1/compliance/frameworks/:id/gaps                 # Gap analysis
POST   /api/v1/compliance/mappings                            # Link service↔requirement
DELETE /api/v1/compliance/mappings                            # Remove link
GET    /api/v1/compliance/assets/:id                          # Asset flags
```

## Community Limit

Community Edition: **1 compliance framework** per tenant.
