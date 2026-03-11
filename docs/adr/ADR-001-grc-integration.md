# ADR-001: GRC Integration Strategy

**Status:** Proposed
**Date:** 2026-03-11
**Context:** Evo-4D — OpsWeave Compliance Evolution

## Context

OpsWeave's compliance module currently supports regulatory frameworks with requirement-to-service mappings. As the platform evolves toward a full GRC (Governance, Risk & Compliance) solution, we need to decide how to integrate with external GRC tools versus building native capabilities.

## Decision Drivers

- German MSP customers in regulated markets (banking, DORA, NIS2, C5) need compliance evidence
- Dedicated GRC tools (ServiceNow GRC, Archer, OneTrust) already exist in enterprise environments
- OpsWeave's strength is asset-centric operations, not full GRC lifecycle
- Community Edition should provide useful compliance features without external dependencies

## Considered Options

### Option A: Native GRC Module
Build comprehensive GRC capabilities directly into OpsWeave.

**Pros:** No external dependencies, single pane of glass
**Cons:** Massive scope (risk registers, policy management, vendor assessment), competing with mature GRC platforms

### Option B: Integration-First (Recommended)
Provide a compliance data layer in OpsWeave that integrates with external GRC tools.

**Pros:** Leverages existing GRC investments, focused scope
**Cons:** Requires integration maintenance

### Option C: Hybrid
Native controls/evidence management with optional GRC integration.

**Pros:** Useful standalone, extensible
**Cons:** More development effort than Option B

## Decision

**Option C: Hybrid approach.**

OpsWeave provides:
1. **Native compliance controls** with cross-framework mapping (Evo-4A — implemented)
2. **Audit tracking** with findings management (Evo-4B — implemented)
3. **Evidence management** linked to controls (Evo-4C — implemented)
4. **Integration API** for external GRC tools (future)

The integration API will expose:
- `GET /api/v1/compliance/export` — Export controls, mappings, evidence as structured data
- `POST /api/v1/compliance/import` — Import framework requirements from external sources
- Webhook notifications for compliance status changes

## Consequences

- OpsWeave becomes a compliance data provider, not a full GRC replacement
- Customers with existing GRC tools can integrate OpsWeave's asset-centric compliance data
- Community Edition users get a functional standalone compliance module
- Enterprise customers can connect to ServiceNow GRC, Archer, etc. via the integration API
