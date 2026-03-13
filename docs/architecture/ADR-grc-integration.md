# ADR: GRC Tool Integration Strategy

**Status:** Accepted

**Date:** 2026-03-12

**Requirement:** REQ-4.5 — GRC Tool Integration Architecture

---

## Context

OpsWeave includes built-in compliance tracking covering frameworks, requirements, controls, audits, findings, and evidence. This capability serves the majority of small-to-mid-size deployments well, particularly those managing up to five regulatory frameworks.

However, at scale — 5+ frameworks with 100+ requirements each — internal tracking begins to compete with dedicated GRC (Governance, Risk, and Compliance) platforms. Managed service providers operating in regulated markets (DORA, NIS2, C5, ISO 27001) require mature compliance workflows that extend beyond what an ITSM system should reasonably own.

The central question: should OpsWeave build deeper GRC capabilities internally, or integrate with external GRC tools?

---

## Evaluation of Options

### Option 1: eramba Community Edition

- **Type:** Open-source GRC platform
- **Stack:** PHP / MySQL
- **API:** REST API with full CRUD
- **Capabilities:** Controls, risks, policies, compliance packages, audit management
- **Maturity:** Established project with a large user base
- **Drawbacks:** Older technology stack, heavier deployment footprint

### Option 2: CISO Assistant

- **Type:** Open-source GRC platform
- **Stack:** Python / Django
- **API:** Modern REST API with good documentation
- **Capabilities:** Control frameworks, risk assessments, compliance mappings
- **Maturity:** Actively developed, growing community
- **Drawbacks:** Younger project, smaller ecosystem

### Option 3: Build Deeper Internally

- **Approach:** Extend OpsWeave compliance module into a full GRC suite
- **Advantages:** Full control over UX and data model
- **Drawbacks:** Significant engineering effort, high risk of scope creep, dilutes ITSM focus

---

## Decision

Build core compliance tracking internally (Phases 4.1–4.4) to serve the 80% use case. For organizations with 10+ frameworks or advanced GRC needs, provide integration points rather than competing with dedicated platforms.

### Integration Points

1. **REST API** (already implemented) — Full CRUD on all compliance entities: frameworks, requirements, controls, audits, findings, evidence
2. **Webhook Events** — Emit events on key state changes:
   - Control status changed
   - Audit finding created
   - Evidence uploaded
   - Framework mapping updated
3. **CSV/JSON Import/Export** — Bulk data transfer for initial migration and periodic synchronization
4. **Integration Documentation** — Published patterns for eramba and CISO Assistant connectivity

### Explicitly Out of Scope

The following capabilities are GRC platform territory and will **not** be built into OpsWeave:

- Full risk register with quantification (FAIR, Monte Carlo)
- Policy lifecycle management (draft, review, approval, distribution, acknowledgment)
- Vendor/third-party risk management
- Risk appetite and tolerance modeling

---

## Integration Architecture

```
OpsWeave (ITSM + CMDB)              GRC Platform (eramba / CISO Assistant)
┌───────────────────────────┐        ┌──────────────────────────────┐
│ Assets (CMDB)             │◄───────│ Risk Register                │
│ Controls                  │◄──────►│ Controls                     │
│ Compliance Mappings       │◄──────►│ Framework Mappings           │
│ Audit Findings            │───────►│ Audit Management             │
│ Evidence                  │───────►│ Evidence Repository          │
│                           │        │ Policy Lifecycle             │
│ Webhooks ────────────────►│        │ Vendor Management            │
└───────────────────────────┘        └──────────────────────────────┘
```

### Data Flow Patterns

| Direction | Data | Mechanism |
|---|---|---|
| OpsWeave → GRC | Asset inventory, compliance mappings, audit findings, evidence | REST API pull / Webhook push |
| GRC → OpsWeave | Risk-linked controls, framework updates, policy references | REST API push |
| Bidirectional | Control status, requirement coverage levels | REST API sync |

### Sync Strategy

- **Near-real-time:** Webhook events for status changes and new findings
- **Periodic:** Scheduled bulk sync (daily/weekly) for full reconciliation
- **On-demand:** Manual import/export via CSV/JSON for migrations

---

## Consequences

### Positive

- OpsWeave remains focused on operational compliance — asset-centric, service-linked, tenant-scoped
- The integration API surface is already in place; no new development is required for basic synchronization
- Organizations can adopt OpsWeave standalone for simple compliance needs and add a GRC platform when complexity demands it
- Clear separation of concerns reduces maintenance burden and scope creep

### Negative

- Organizations needing advanced GRC capabilities must deploy and maintain a second platform
- Integration setup requires configuration effort on both sides
- Data consistency between systems depends on reliable sync mechanisms

### Future Work

- Implement webhook emission for compliance entity state changes
- Publish integration guides with step-by-step instructions for eramba and CISO Assistant
- Consider a lightweight adapter/connector package for common GRC platforms

---

## References

- eramba Community Edition: https://www.eramba.org/
- CISO Assistant: https://github.com/intuitem/ciso-assistant-community
- OpsWeave Compliance API: `/api/v1/compliance/*`
- OpsWeave CMDB API: `/api/v1/assets/*`
