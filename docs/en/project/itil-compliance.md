# OpsWeave — ITIL 4 Compliance Matrix

> **Version:** 0.2.8 | **Audit Date:** 2026-03-10 | **Assessor:** Claude Code (Automated)
> **Rating Scale:** ✅ Implemented | ⚠️ Partial | ❌ Missing | 🔲 N/A

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [ITIL 4 Service Value Chain](#2-itil-4-service-value-chain)
3. [General Management Practices](#3-general-management-practices)
4. [Service Management Practices](#4-service-management-practices)
5. [Gap Summary & User Stories](#5-gap-summary--user-stories)
6. [Prioritized Implementation Plan](#6-prioritized-implementation-plan)

---

## 1. Executive Summary

### Overall Rating: 2.8 / 5.0 (Managed)

| Area | Score | Assessment |
|------|-------|------------|
| Incident Management | 3.5/5 | Solid foundation, escalation missing |
| Problem Management | 1.5/5 | Ticket type exists, no ITIL fields |
| Change Enablement | 2.0/5 | Workflow engine available, no RFC/CAB |
| Service Request Management | 1.0/5 | Not implemented as a separate process |
| Service Configuration Mgmt (CMDB) | 4.0/5 | Strongest area — DAG, SLA inheritance |
| Service Level Management | 3.5/5 | SLA definitions & assignments strong |
| Knowledge Management | 3.5/5 | Well structured, analytics missing |
| Service Desk | 3.0/5 | Email + portal, chat/phone missing |
| Monitoring & Event Management | 1.0/5 | Schema only, no implementation |
| IT Asset Management | 2.0/5 | CMDB foundation, no lifecycle/financial |
| Continual Improvement | 1.0/5 | Dashboard KPIs, no CSI register |
| Information Security Mgmt | 2.5/5 | RBAC + audit, no encryption |
| Release Management | 0.5/5 | Change tickets, no release process |
| Availability Management | 0.5/5 | No implementation |
| Capacity & Performance Mgmt | 0.0/5 | No implementation |

### Strengths
- Asset-centric data model with DAG relations and SLA inheritance
- ITIL-compliant priority matrix (Impact x Urgency)
- Multi-level SLA assignment (Asset → Customer+Service → Customer → Service → Default)
- Complete audit trail at ticket level
- Multi-tenant isolation on all entities
- Workflow engine with 5 step types and auto-trigger

### Critical Gaps
- No service request management (no `request` ticket type)
- No problem management (no root cause, known error, workaround fields)
- Monitoring module schema only, not operationalized
- No automatic escalation (time- or rule-based)
- No release management process

---

## 2. ITIL 4 Service Value Chain

The ITIL 4 Service Value Chain consists of 6 activities. Here is the coverage by OpsWeave:

| Value Chain Activity | Status | OpsWeave Coverage |
|---------------------|--------|-------------------|
| **Plan** | ⚠️ Partial | Dashboard KPIs, compliance matrix. No strategic portfolio management, no capacity planning. |
| **Improve** | ❌ Missing | No improvement register, no CSI initiatives, no feedback loops, no trend analysis. |
| **Engage** | ⚠️ Partial | Customer portal (ticket view + comments), service catalog (horizontal + vertical). No self-service request ordering, no satisfaction surveys. |
| **Design & Transition** | ⚠️ Partial | Service catalog with scope definition, compliance mapping. No release management, no deployment orchestration. |
| **Obtain/Build** | ❌ Missing | No vendor management, no procurement tracking, no build/deploy pipeline integration. |
| **Deliver & Support** | ✅ Strong | Incident/change/problem tickets, SLA tracking, email inbound, knowledge base, workflow engine, CMDB. Core strength of OpsWeave. |

---

## 3. General Management Practices

### 3.1 Service Level Management

**Status: ⚠️ Partially implemented (Score: 3.5/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| SLA Definitions | `packages/backend/src/db/schema/sla.ts:11-39` | Response/resolution time, business hours (24/7, business, extended), business days |
| Priority Overrides | `sla.ts:30` | JSON field for priority-specific times (e.g. Critical: 15min response) |
| SLA Assignments (5-level) | `sla.ts:44-77` | Asset (P100) → Customer+Service (P75) → Customer (P50) → Service (P25) → Default |
| SLA Resolution Engine | `sla.service.ts:323-411` | `resolveEffectiveSla()` — hierarchical resolution |
| SLA Inheritance (DAG) | `lib/db-specific/sqlite.ts:27-109` | Multi-hop traversal (max 5 levels) over asset hierarchy |
| Ticket SLA Tracking | `db/schema/tickets.ts:59-62` | `sla_response_due`, `sla_resolve_due`, `sla_breached` |
| SLA Management UI | `SettingsPage.tsx` (SLA tab) | Definitions + assignments CRUD |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| SLA Breach Worker | **Must** | No background worker that automatically detects SLA violations and sets `sla_breached` |
| SLA Reporting | **Must** | No SLA performance reports (% compliance per period, per customer, per service) |
| SLA Review Meetings | **Should** | No workflow for periodic SLA reviews with customers |
| OLA/UC Support | **Should** | No Operational Level Agreements or Underpinning Contracts |
| SLA Pause on Pending | **Should** | SLA timer continues when ticket is set to `pending` (waiting for customer response) |
| Business Hours Calendar | **Could** | No holiday definition, no calendar import |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| SLA Definitions | ✅ | ✅ | ✅ | ✅ |
| Priority-based SLA | ✅ | ✅ | ✅ | ⚠️ |
| SLA Inheritance (Asset DAG) | ✅ | ❌ | ❌ | ❌ |
| Automatic Breach Detection | ❌ | ✅ | ✅ | ✅ |
| SLA Pause (Pending) | ❌ | ✅ | ✅ | ✅ |
| Business Hours Calendar | ⚠️ | ✅ | ✅ | ✅ |
| SLA Reports/Dashboard | ❌ | ✅ | ✅ | ✅ |
| OLA/UC | ❌ | ✅ | ❌ | ⚠️ |
| Customer-specific SLA | ✅ | ✅ | ✅ | ✅ |

> **OpsWeave Differentiator:** SLA inheritance through the asset hierarchy (DAG traversal). No competitor offers this natively.

---

### 3.2 Information Security Management

**Status: ⚠️ Partially implemented (Score: 2.5/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Authentication (Local) | `auth.service.ts:18` | bcrypt with 12 salt rounds |
| OIDC (Enterprise) | `users.ts:13-14` | `auth_provider: 'oidc'`, `external_id` |
| RBAC (Tenant-scoped) | `users.ts:26-43` | 4 roles: admin, manager, agent, viewer |
| Multi-Tenant Isolation | All schema files | `tenant_id` on every entity table, middleware filter |
| Audit Trail (Tickets) | `tickets.ts:119-139` | Field-level history with actor + timestamp |
| Portal User Isolation | `users.ts:78-93` | Separate `customerPortalUsers` table, sees only own tickets |
| Super Admin | `users.ts:17` | `is_superadmin` for cross-tenant access |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| 2FA/MFA | **Must** | No TOTP or FIDO2 support |
| Password Policy | **Must** | No minimum length, complexity, expiration, history |
| Security Incident Type | **Should** | No dedicated `security_incident` ticket type |
| System-wide Audit Log | **Must** | Only ticket history, no login/logout/permission change logs |
| Field Encryption | **Should** | Email config credentials stored as plaintext JSON |
| Session Management | **Should** | No refresh token rotation, no session revocation |
| IP Whitelisting | **Could** | No IP-based access control |
| Data Classification | **Could** | No confidentiality levels on tickets |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| RBAC | ✅ | ✅ | ✅ | ✅ |
| Multi-Tenant Isolation | ✅ | ✅ | ⚠️ | ❌ |
| 2FA/MFA | ❌ | ✅ | ✅ | ⚠️ |
| OIDC/SAML | ✅ (Enterprise) | ✅ | ✅ | ✅ |
| Audit Trail | ⚠️ | ✅ | ✅ | ⚠️ |
| Field Encryption | ❌ | ✅ | ✅ | ❌ |
| Password Policy | ❌ | ✅ | ✅ | ✅ |
| Security Incidents | ❌ | ✅ | ⚠️ | ❌ |

---

### 3.3 Knowledge Management

**Status: ⚠️ Partially implemented (Score: 3.5/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Article CRUD | `kb.service.ts:40-150` | Create, edit, delete with Markdown content |
| Article Lifecycle | `knowledge-base.ts:23` | `draft` → `published` → `archived` |
| Visibility Control | `knowledge-base.ts:22` | `internal` (agents only) vs. `public` (portal) |
| Categories & Tags | `knowledge-base.ts:20-21` | Category field + JSON tag array |
| Slug Management | `kb.service.ts:40-96` | URL-safe auto-slugs with uniqueness |
| Ticket Linking | `knowledge-base.ts:44-63` | Junction table `kb_article_links` (article ↔ ticket) |
| Portal Access | Portal routes | Only `visibility='public'` articles visible |
| Search | `kb.service.ts` | Filter by title, category, tags |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Article Rating | **Should** | No helpfulness ratings (thumbs up/down) |
| Usage Analytics | **Should** | No view count, no "most read articles" view |
| KCS Automation | **Should** | No automatic article suggestion during ticket creation |
| Full-Text Search | **Must** | No weighted full-text search (only LIKE-based) |
| Review Workflow | **Could** | No four-eyes principle for article publication |
| Versioning | **Could** | No article history, no diff between versions |
| Knowledge Gaps | **Could** | No analysis: "Frequent tickets without KB articles" |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Article CRUD | ✅ | ✅ | ✅ | ✅ |
| Visibility Control | ✅ | ✅ | ✅ | ⚠️ |
| Ticket Linking | ✅ | ✅ | ✅ | ⚠️ |
| Portal Access | ✅ | ✅ | ✅ | ✅ |
| KCS Workflow | ❌ | ✅ | ⚠️ | ❌ |
| Article Rating | ❌ | ✅ | ✅ | ❌ |
| Full-Text Search | ❌ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ⚠️ | ❌ |

---

### 3.4 Continual Improvement

**Status: ❌ Missing (Score: 1.0/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Dashboard KPIs | `DashboardPage.tsx` | Open tickets, SLA breaches, timeline chart, top 5 customers |
| Ticket Timeline | `GET /tickets/stats/timeline` | 30-day trend chart |
| Ticket by Customer | `GET /tickets/stats/by-customer` | Horizontal bar chart |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Improvement Register | **Must** | Table for improvement initiatives (proposed → approved → in_progress → done) |
| CSI Metrics | **Must** | Configurable KPIs with target values and trend tracking |
| Post-Incident Review | **Should** | No PIR workflow after major incidents |
| Customer Satisfaction | **Should** | No surveys, no CSAT/NPS |
| Trend Analysis | **Should** | No anomaly detection, no seasonality |
| Lessons Learned | **Could** | No repository for lessons learned |
| Automated Reports | **Could** | No scheduled report generation (PDF/email) |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Dashboard KPIs | ⚠️ | ✅ | ✅ | ⚠️ |
| Improvement Register | ❌ | ✅ | ❌ | ❌ |
| CSAT Surveys | ❌ | ✅ | ✅ | ❌ |
| Trend Analysis | ❌ | ✅ | ⚠️ | ❌ |
| Automated Reports | ❌ | ✅ | ✅ | ✅ |
| Post-Incident Review | ❌ | ✅ | ⚠️ | ❌ |

---

## 4. Service Management Practices

### 4.1 Incident Management

**Status: ⚠️ Partially implemented (Score: 3.5/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Incident Lifecycle | `tickets.ts:45` | `open` → `in_progress` → `pending` → `resolved` → `closed` |
| Priority Matrix (ITIL) | `shared/constants/index.ts:42-55` | Impact x Urgency = Priority (4x4 matrix) |
| Auto-Priority Calculation | `tickets.service.ts:403-408` | Automatic on create/update when impact + urgency set |
| SLA Tracking | `tickets.ts:59-62` | Response due, resolve due, breached flag |
| Assignments | `tickets.ts:53-55` | Individual (assignee_id) + group (assignee_group_id) |
| Comments | `tickets.ts:91-113` | Internal/external, source tracking (agent/customer/email/system) |
| Audit Trail | `tickets.ts:119-139` | Field-level history of all changes |
| Source Tracking | `tickets.ts:64` | manual, email, monitoring, api, portal |
| Asset Linking | `tickets.ts:52` | `asset_id` FK to CMDB |
| Customer Assignment | `tickets.ts:56` | `customer_id` FK to customers |
| Ticket Numbers | `tickets.service.ts` | INC-YYYY-NNNNN (automatic, type-dependent) |
| Parent-Child Tickets | `tickets.ts:63` | `parent_ticket_id` for linking |
| Board View | `TicketBoardPage.tsx` | Kanban with 5 columns, drag & drop |
| Workflow Auto-Trigger | `tickets.service.ts:462-465` | Workflow instance on ticket creation |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Automatic Escalation | **Must** | No time- or rule-based escalation (e.g. after 80% SLA time → escalation to next group) |
| Major Incident Process | **Must** | Subtype `major` exists, but no special handling (bridge call, stakeholder notification, dedicated incident manager) |
| Status State Machine | **Should** | Every status transition allowed — no enforced sequence (e.g. `open` → `closed` directly possible) |
| Multi-Level Categorization | **Should** | Only one category level, no hierarchical category scheme (Category → Subcategory → Item) |
| Notifications | **Must** | No email/push notifications on status changes, assignment, comments |
| Incident Matching | **Should** | No detection of similar/duplicate incidents |
| Re-Open Tracking | **Could** | No counter for reopenings |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Incident Lifecycle | ✅ | ✅ | ✅ | ✅ |
| Priority Matrix (ITIL) | ✅ | ✅ | ⚠️ | ✅ |
| Auto-Escalation | ❌ | ✅ | ✅ | ✅ |
| Major Incident Process | ❌ | ✅ | ⚠️ | ❌ |
| SLA Tracking | ✅ | ✅ | ✅ | ✅ |
| Notifications | ❌ | ✅ | ✅ | ✅ |
| Kanban Board | ✅ | ✅ | ✅ | ❌ |
| Parent-Child | ✅ | ✅ | ✅ | ✅ |
| Duplicate Detection | ❌ | ✅ | ⚠️ | ❌ |
| Omnichannel Intake | ⚠️ | ✅ | ⚠️ | ⚠️ |

---

### 4.2 Problem Management

**Status: ❌ Missing (Score: 1.5/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Problem Ticket Type | `shared/constants/index.ts:11` | `ticket_type: 'problem'` exists |
| Problem Lifecycle | `tickets.ts:45` | Same status flow as incidents |
| Parent-Child Linking | `tickets.ts:63` | Incidents can be attached to problems via `parent_ticket_id` |
| Audit Trail | `tickets.ts:119-139` | Change history like incidents |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Root Cause Analysis Field | **Must** | No `root_cause` text field on problem tickets |
| Known Error Database (KEDB) | **Must** | No `known_errors` table (problem ID + symptom + workaround + status) |
| Workaround Field | **Must** | No `workaround` text field displayed on incidents |
| Problem Categorization | **Should** | No problem-specific categories (e.g. infrastructure, software, process) |
| Proactive Problem Mgmt | **Should** | No trend analysis for detecting recurring incidents |
| Problem-Incident Linking | **Should** | Parent-child exists, but no dedicated "Related Incidents" view on problem tickets |
| Known Error on Incident | **Must** | No `known_error_id` field on incidents referencing the known error |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Problem Ticket Type | ✅ | ✅ | ✅ | ✅ |
| Root Cause Analysis | ❌ | ✅ | ⚠️ | ⚠️ |
| Known Error DB | ❌ | ✅ | ❌ | ❌ |
| Workaround Tracking | ❌ | ✅ | ⚠️ | ⚠️ |
| Incident-Problem Linking | ⚠️ | ✅ | ✅ | ✅ |
| Proactive Problem Mgmt | ❌ | ✅ | ❌ | ❌ |
| Problem Review Board | ❌ | ✅ | ❌ | ❌ |

---

### 4.3 Change Enablement

**Status: ⚠️ Partially implemented (Score: 2.0/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Change Ticket Type | `shared/constants/index.ts:11` | `ticket_type: 'change'` |
| Change Subtypes | `shared/constants/index.ts:57-63` | `standard`, `normal`, `emergency` (as subtypes) |
| Workflow Engine | `db/schema/workflows.ts` | Templates with Approval/Form/Routing/Condition/Automatic steps |
| Auto-Trigger | `tickets.service.ts:462-465` | Workflow instantiation on change creation |
| Change Lifecycle | `tickets.ts:45` | open → in_progress → pending → resolved → closed |
| Audit Trail | `tickets.ts:119-139` | Complete change history |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| RFC Form | **Must** | No formalized request-for-change form (justification, risk, schedule, rollback plan) |
| CAB Process | **Must** | No Change Advisory Board — approval step exists in workflow, but no CAB committee concept |
| Risk Assessment | **Must** | No risk matrix (likelihood x impact) for changes |
| Rollback Plan | **Must** | No `rollback_plan` field, no rollback documentation |
| Change Calendar | **Should** | No calendar view of planned changes (blackout windows, maintenance windows) |
| Impact Analysis (CMDB) | **Should** | CMDB graph exists, but not automatically used for change impact analysis |
| Standard Change Catalog | **Should** | No pre-approved standard changes that bypass CAB |
| Post-Implementation Review | **Should** | No PIR workflow after change completion |
| Change Success Rate | **Could** | No metric "successful vs. failed changes" |
| Emergency Change Process | **Should** | Subtype `emergency` exists, but no accelerated approval process |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Change Ticket Type | ✅ | ✅ | ✅ | ✅ |
| Change Types (Std/Norm/Emerg) | ⚠️ | ✅ | ✅ | ⚠️ |
| Workflow Engine | ✅ | ✅ | ✅ | ⚠️ |
| CAB Process | ❌ | ✅ | ⚠️ | ❌ |
| Risk Assessment | ❌ | ✅ | ⚠️ | ❌ |
| Change Calendar | ❌ | ✅ | ⚠️ | ❌ |
| CMDB Impact Analysis | ❌ | ✅ | ❌ | ⚠️ |
| Rollback Plan | ❌ | ✅ | ⚠️ | ❌ |
| Standard Change Catalog | ❌ | ✅ | ❌ | ❌ |
| PIR | ❌ | ✅ | ⚠️ | ❌ |

---

### 4.4 Service Request Management

**Status: ❌ Missing (Score: 1.0/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Service Catalog (3-Tier) | `db/schema/services.ts` | Service descriptions, horizontal + vertical catalogs |
| Customer Portal | `portal/` module | Customers can create and view tickets |
| Workflow Engine | `db/schema/workflows.ts` | Could be used for request fulfillment |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Request Ticket Type | **Must** | No `ticket_type: 'request'` — service requests are treated as incidents |
| Self-Service Portal | **Must** | Portal allows ticket creation, but no "order service" flow from the catalog |
| Request Catalog UI | **Must** | No "shopping cart" concept, no request item selection |
| Fulfillment Workflows | **Must** | No mapping: catalog item → fulfillment workflow |
| Request-specific SLAs | **Should** | No separate SLA definitions for service requests |
| Approval Workflows | **Should** | Workflow engine available, but not bound to catalog items |
| Request Forms | **Should** | No dynamic forms per service item |
| Delegation | **Could** | No "order for others" function |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Service Request Type | ❌ | ✅ | ✅ | ✅ |
| Self-Service Portal | ❌ | ✅ | ✅ | ⚠️ |
| Request Catalog | ❌ | ✅ | ✅ | ⚠️ |
| Fulfillment Workflow | ❌ | ✅ | ✅ | ⚠️ |
| Approval Chains | ❌ | ✅ | ✅ | ⚠️ |
| Dynamic Forms | ❌ | ✅ | ✅ | ❌ |

---

### 4.5 Service Configuration Management (CMDB)

**Status: ✅ Implemented (Score: 4.0/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| CI Types (24 types, 7 categories) | `shared/constants/index.ts:70-103` | Compute, Network, Storage, Infrastructure, Software, End User, Other |
| CI Lifecycle | `shared/constants/index.ts:106-112` | `active`, `inactive`, `maintenance`, `decommissioned` |
| Relationship Types (7) | `shared/constants/index.ts:114+` | `runs_on`, `connected_to`, `stored_on`, `powered_by`, `member_of`, `depends_on`, `backup_of` |
| DAG Model | `db/schema/assets.ts:45-69` | Directed acyclic graph with cycle detection |
| Graph Traversal (BFS) | `assets.service.ts:602-662` | Connected component analysis |
| Topology Visualization | `assets.service.ts:667-694` | React Flow graph view |
| SLA Inheritance via DAG | `lib/db-specific/sqlite.ts:27-109` | Multi-hop traversal (max 5 levels) |
| Asset Search & Filter | `assets.service.ts:28-130` | Type, status, SLA, environment, owner, customer, IP |
| Asset-Ticket Linking | `tickets.ts:52` | `asset_id` on tickets |
| Asset-Service Links | `services.ts:139-154` | Assets linked with service catalog entries |
| Asset Compliance Flags | `compliance.ts:84-106` | Assets marked as in-scope for frameworks |
| Category Filter (UI) | `AssetsPage.tsx` | Buttons: All, Compute, Network, Storage, etc. |
| Custom Attributes | `assets.ts:27` | JSON `attributes` field for type-specific data |
| Community Limit | `shared/constants` | Max 50 assets (Community Edition) |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Configuration Baselines | **Should** | No snapshots/versions of CI configurations |
| CI Change History | **Should** | No audit trail for asset field changes (only ticket history exists) |
| Auto-Discovery | **Should** | Schema for monitoring sources exists, but no discovery worker |
| Reconciliation | **Could** | No comparison: Discovery data vs. CMDB data |
| Configuration Verification | **Could** | No automatic check if CI configuration matches target state |
| CI-Type-specific Required Fields | **Could** | Attributes is a free JSON field, no enforced structure per type |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| CI Type Hierarchy | ✅ | ✅ | ⚠️ | ✅ |
| Relations (DAG) | ✅ | ✅ | ❌ | ⚠️ |
| Graph Visualization | ✅ | ✅ | ❌ | ⚠️ |
| SLA Inheritance (DAG) | ✅ | ❌ | ❌ | ❌ |
| Auto-Discovery | ❌ | ✅ | ❌ | ✅ |
| Configuration Baselines | ❌ | ✅ | ❌ | ❌ |
| CI Audit Trail | ❌ | ✅ | ⚠️ | ✅ |
| Custom Attributes | ✅ | ✅ | ⚠️ | ✅ |
| Compliance Flags | ✅ | ✅ | ❌ | ❌ |

> **OpsWeave Differentiator:** DAG-based SLA inheritance + asset compliance flags in an integrated system.

---

### 4.6 Service Desk

**Status: ⚠️ Partially implemented (Score: 3.0/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Email Inbound (IMAP) | `modules/email-inbound/` | IMAP poller with thread matching (In-Reply-To, subject pattern) |
| Email Webhook | `email.service.ts` | Mailgun + SendGrid webhook providers |
| Customer Portal | `modules/portal/` | Login, ticket view, comments, ticket creation |
| API Intake | `modules/tickets/` | REST API for programmatic ticket creation |
| Manual Creation | `TicketBoardPage.tsx` | Create dialog with all fields |
| Source Tracking | `tickets.ts:64` | Channel tracking: manual, email, monitoring, api, portal |
| Categorization | `tickets.ts:56` | Category assignment, group assignment |
| Auto-Routing (Email) | `email.ts:20` | `target_group_id` for automatic assignment |
| Thread Matching | `email.service.ts:73-102` | Recognize existing tickets via Message-ID/Subject |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Notifications | **Must** | No email notifications on ticket changes |
| Live Chat | **Should** | No chat widget (Socket.IO available but not used for chat) |
| Phone Integration | **Could** | No CTI/IVR integration |
| First Contact Resolution | **Should** | No FCR tracking (resolved immediately at first contact?) |
| Hierarchical Categories | **Should** | Only one level — no Category → Subcategory → Item |
| Automatic Categorization | **Could** | No AI/rule-based categorization of incoming tickets |
| Canned Responses | **Should** | No text templates for frequent replies |
| Queue Management | **Should** | No queue dashboard (tickets per agent, workload) |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Email Inbound | ✅ | ✅ | ✅ | ✅ |
| Customer Portal | ✅ | ✅ | ✅ | ✅ |
| API Intake | ✅ | ✅ | ✅ | ✅ |
| Live Chat | ❌ | ✅ | ⚠️ | ❌ |
| Phone/CTI | ❌ | ✅ | ⚠️ | ❌ |
| Notifications | ❌ | ✅ | ✅ | ✅ |
| FCR Tracking | ❌ | ✅ | ⚠️ | ❌ |
| Hierarchical Categories | ❌ | ✅ | ✅ | ✅ |
| Canned Responses | ❌ | ✅ | ✅ | ⚠️ |
| Queue Dashboard | ❌ | ✅ | ✅ | ⚠️ |

---

### 4.7 IT Asset Management

**Status: ⚠️ Partially implemented (Score: 2.0/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Asset CRUD | `assets.service.ts:28-130` | Create, read, update, delete |
| Lifecycle Status | `shared/constants` | active, inactive, maintenance, decommissioned |
| Type Classification | `shared/constants:70-103` | 24 CI types in 7 categories |
| Searchable Attributes | `assets.ts:27` | JSON field for type-specific data |
| Customer Assignment | `assets.ts:26` | `customer_id` FK |
| Owner Group | `assets.ts:25` | `owner_group_id` FK |
| Environment | `assets.ts:24` | production, staging, development, test |
| Community Limit | `shared/constants` | Max 50 assets |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Financial Tracking | **Should** | No fields: acquisition cost, depreciation, residual value |
| Procurement Lifecycle | **Should** | No workflow: order → delivery → installation → operation → disposal |
| Warranty Tracking | **Should** | No warranty expiration date, no warranty notification |
| Software License Management | **Should** | No license inventory (installed software vs. licenses) |
| Asset Discovery | **Should** | No network scan or agent-based collection |
| Location Management | **Could** | `location` is free text, no structured location hierarchy |
| Asset Import/Export | **Should** | No CSV/Excel import, no bulk update |
| Contract Linking | **Could** | No `contract_id` field, no contract table |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Asset CRUD | ✅ | ✅ | ⚠️ | ✅ |
| Lifecycle Status | ✅ | ✅ | ⚠️ | ✅ |
| Financial Tracking | ❌ | ✅ | ❌ | ✅ |
| Software Licenses | ❌ | ✅ | ❌ | ✅ |
| Auto-Discovery | ❌ | ✅ | ❌ | ✅ |
| Asset Import | ❌ | ✅ | ⚠️ | ✅ |
| Warranty Tracking | ❌ | ✅ | ❌ | ✅ |
| Contract Linking | ❌ | ✅ | ❌ | ✅ |

> **Note:** GLPI is traditionally stronger in IT asset management (inventory, financials) than in ITSM.

---

### 4.8 Monitoring and Event Management

**Status: ❌ Missing (Score: 1.0/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Event Schema | `db/schema/monitoring.ts:34-62` | `monitoringEvents`: source_id, hostname, service_name, state, output, matched_asset_id, ticket_id |
| Source Schema | `db/schema/monitoring.ts:10-28` | `monitoringSources`: type (checkmk_v1/v2, zabbix, prometheus, nagios), config, webhook_secret |
| Event States | `monitoring.ts:37` | ok, warning, critical, unknown |
| Source Types | `shared/constants:239-246` | checkmk_v1, checkmk_v2, zabbix, prometheus, nagios, other |
| License Limit | `shared/constants` | Community: max 1 monitoring source |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Check_MK Adapter | **Must** | No Livestatus (v1) or REST API (v2) client implemented |
| Event Ingestion Worker | **Must** | No background worker collecting/receiving events from sources |
| Event-to-Incident | **Must** | No automatic ticket creation from critical events |
| Event-Asset Matching | **Must** | `matched_asset_id` field exists, but no matching logic |
| Event Correlation | **Should** | No deduplication, no flapping protection |
| Event Lifecycle | **Should** | No acknowledge/downtime handling |
| Alerting Rules | **Should** | No configurable thresholds or notification rules |
| Monitoring Dashboard | **Should** | No event overview, no status dashboard |
| API Routes | **Must** | `// TODO: mount remaining module routes` in `routes/index.ts:60-61` |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Event Ingestion | ❌ | ✅ | ⚠️ | ⚠️ |
| Auto-Incident | ❌ | ✅ | ⚠️ | ⚠️ |
| Event Correlation | ❌ | ✅ | ❌ | ❌ |
| Check_MK Integration | ❌ | ❌ | ❌ | ⚠️ |
| Multi-Source | ⚠️ (Schema) | ✅ | ⚠️ | ⚠️ |
| Event Dashboard | ❌ | ✅ | ⚠️ | ⚠️ |

---

### 4.9 Release Management

**Status: ❌ Missing (Score: 0.5/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| Change Tickets | `tickets.ts` | `ticket_type: 'change'` as basis |
| Workflow Engine | `workflows.ts` | Could be used for release approval |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Release Entity | **Should** | No `releases` table (release bundles multiple changes) |
| Release Planning | **Should** | No release calendar, no time planning |
| Deployment Tracking | **Should** | No tracking: which change deployed on which asset |
| Rollback Procedure | **Should** | No rollback documentation and triggering |
| Release Types | **Could** | No distinction: major/minor/patch/emergency release |
| Release Gates | **Could** | No quality gates (test → staging → production) |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Release Entity | ❌ | ✅ | ⚠️ | ❌ |
| Release Calendar | ❌ | ✅ | ⚠️ | ❌ |
| Deployment Tracking | ❌ | ✅ | ⚠️ | ❌ |
| Rollback | ❌ | ✅ | ⚠️ | ❌ |
| CI/CD Integration | ❌ | ✅ | ✅ | ❌ |

---

### 4.10 Availability Management

**Status: ❌ Missing (Score: 0.5/5)**

#### Implemented
| Feature | Code Reference | Details |
|---------|---------------|---------|
| SLA Definitions | `sla.ts` | Response/resolution times (but no availability %) |

#### Missing for ITIL Compliance
| Gap | Priority | Description |
|-----|----------|-------------|
| Availability Targets | **Should** | No uptime % targets per service/asset (e.g. 99.9%) |
| Uptime Tracking | **Should** | No calculation of actual availability from incidents |
| MTBF/MTRS | **Should** | No Mean Time Between Failures / Mean Time to Restore |
| Availability Reports | **Could** | No availability reports per time period |
| Dependency Impact | **Could** | CMDB graph available, but no calculation: "Asset X failure → Which services affected?" |

#### Competitor Comparison

| Feature | OpsWeave | ServiceNow | Jira SM | GLPI |
|---------|----------|------------|---------|------|
| Availability Targets | ❌ | ✅ | ❌ | ❌ |
| Uptime Calculation | ❌ | ✅ | ❌ | ❌ |
| MTBF/MTRS | ❌ | ✅ | ❌ | ❌ |
| Availability Reports | ❌ | ✅ | ❌ | ❌ |

> **Note:** Availability Management is barely implemented in JSM and GLPI either. This is a ServiceNow domain.

---

### 4.11 Capacity and Performance Management

**Status: ❌ Missing (Score: 0.0/5)**

No implementation present. Seed data contains informal capacity values (e.g. `capacity_tb: 96` in asset attributes), but these are not queryable or evaluable.

| Gap | Priority | Description |
|-----|----------|-------------|
| Performance Metrics | **Could** | No metric collection (CPU, RAM, disk, network) |
| Capacity Planning | **Could** | No trend analysis, no forecasting |
| Thresholds | **Could** | No threshold definition and monitoring |
| Utilization Reports | **Could** | No resource utilization reports |

> **Note:** This is typically covered by monitoring tools (Check_MK, Zabbix, Prometheus), not by the ITSM tool itself. OpsWeave plans integration, not in-house development.

---

## 5. Gap Summary & User Stories

### Must-Have (25 User Stories)

#### Incident Management
```
US-INC-01: As an agent, I want automatic escalation after 80% SLA time,
           so that critical tickets don't expire unnoticed.
           Acceptance: Background worker checks every 60s, escalates to
           next group + notification.

US-INC-02: As an incident manager, I want a major incident process,
           so that P1 incidents are handled in a coordinated manner.
           Acceptance: Subtype "major" triggers separate workflow
           (bridge call, stakeholder notification, dedicated manager).

US-INC-03: As an agent, I want to receive email notifications on
           ticket changes, so that I don't miss any updates.
           Acceptance: Configurable notification service
           (assignment, status, comment).
```

#### Problem Management
```
US-PRB-01: As a problem manager, I want to document root cause on problem tickets,
           so that the cause of recurring incidents is traceable.
           Acceptance: Text field "root_cause" on problem tickets,
           visible in detail view.

US-PRB-02: As an agent, I want to maintain known errors with workarounds,
           so that incidents can be resolved faster.
           Acceptance: KEDB table (known_errors) with symptom +
           workaround + status, linked with problem tickets.
           Workaround is displayed on linked incidents.

US-PRB-03: As an agent, I want known errors suggested when creating an incident,
           so that I can reach a solution faster.
           Acceptance: Field "known_error_id" on incident tickets,
           dropdown with KEDB entries, workaround automatically displayed.
```

#### Change Enablement
```
US-CHG-01: As a change manager, I want an RFC form with required fields
           (justification, risk, schedule, rollback), so that changes are
           requested in a structured manner.
           Acceptance: Extended fields on change tickets: justification,
           risk_level, implementation_plan, rollback_plan, planned_start,
           planned_end.

US-CHG-02: As a change manager, I want a risk assessment per change,
           so that the CAB can make informed decisions.
           Acceptance: Risk matrix (likelihood x impact) with automatic
           risk level (low/medium/high/critical).

US-CHG-03: As a CAB member, I want to see changes in an approval board
           and approve/reject them, so that the change process is transparent.
           Acceptance: CAB dashboard with pending changes,
           voting capability, comments.
```

#### Service Request Management
```
US-SRQ-01: As an end user, I want to order services from the catalog,
           so that I can request standard services (e.g. new laptop,
           request access) myself.
           Acceptance: New ticket type "request", portal shows catalog items
           for ordering, forms per item.

US-SRQ-02: As a service manager, I want to define fulfillment workflows per
           catalog item, so that orders automatically go through the
           correct process.
           Acceptance: Mapping: Service Description → Workflow Template,
           automatic instantiation on request creation.
```

#### SLA Management
```
US-SLA-01: As an SLA manager, I want automatic SLA breach detection,
           so that violations are immediately visible.
           Acceptance: Background worker checks every 60s, sets sla_breached=1,
           sends notification.

US-SLA-02: As an agent, I want SLA timer pause on "pending" status,
           so that wait times for customer responses don't impact the SLA.
           Acceptance: SLA timer stops on "pending" status,
           resumes on status change back.

US-SLA-03: As a manager, I want SLA performance reports,
           so that I can see compliance per customer/service/period.
           Acceptance: Report endpoint + dashboard widget
           (% compliance, average response/resolve time).
```

#### Information Security
```
US-SEC-01: As an admin, I want to configure password policies (minimum length,
           complexity, expiration), so that credentials are secure.
           Acceptance: Settings configuration for password rules,
           enforcement on registration and password change.

US-SEC-02: As an admin, I want a system-wide audit log, so that
           security-relevant actions are traceable.
           Acceptance: "audit_log" table with login/logout,
           permission changes, data exports, API access.
```

#### Monitoring & Events
```
US-MON-01: As an admin, I want to connect Check_MK instances as monitoring sources,
           so that events are automatically captured.
           Acceptance: Check_MK v2 REST API client, configurable
           per monitoring source, polling interval adjustable.

US-MON-02: As a system, I want to automatically create incidents from critical
           monitoring events, so that no outages go unnoticed.
           Acceptance: Event worker matches events to assets (hostname/IP),
           creates incident with source="monitoring", deduplicates.

US-MON-03: As an admin, I want to use the monitoring API routes,
           so that events can arrive via webhook.
           Acceptance: Routes /monitoring/sources and /monitoring/events
           implemented and mounted.
```

#### Knowledge Management
```
US-KB-01:  As an agent, I want full-text search across KB articles,
           so that I can quickly find relevant articles.
           Acceptance: Weighted search across title, content, tags
           (not just LIKE-based).
```

### Should-Have (18 User Stories)

#### Change Enablement
```
US-CHG-04: As a change manager, I want a change calendar,
           so that planned maintenance and blackout windows are visible.

US-CHG-05: As a change manager, I want CMDB-based impact analysis,
           so that I can see which services are affected before a change.

US-CHG-06: As a change manager, I want to predefine standard changes
           that can proceed without CAB approval.

US-CHG-07: As a change manager, I want post-implementation reviews,
           so that the success of each change is evaluated.
```

#### Incident Management
```
US-INC-04: As an agent, I want multi-level categorization
           (category → subcategory → item), so that incidents
           are classified more precisely.

US-INC-05: As an agent, I want text templates for
           frequent ticket responses, so that I can respond faster.
```

#### Problem Management
```
US-PRB-04: As a problem manager, I want trend analysis for
           recurring incidents, so that problems are proactively detected.
```

#### Service Desk
```
US-SD-01:  As an agent, I want FCR tracking (First Contact Resolution),
           so that service desk efficiency is measurable.

US-SD-02:  As an agent, I want a queue dashboard (tickets per agent,
           workload, wait time), so that workload distribution is visible.
```

#### CMDB
```
US-CMDB-01: As an admin, I want CI change history, so that
            configuration changes are traceable.

US-CMDB-02: As an admin, I want auto-discovery via monitoring sources,
            so that new assets are automatically added to the CMDB.
```

#### IT Asset Management
```
US-ITAM-01: As an asset manager, I want financial tracking fields
            (acquisition cost, depreciation, warranty), so that
            the asset value is traceable.

US-ITAM-02: As an asset manager, I want CSV/Excel import and export,
            so that bulk data can be maintained efficiently.
```

#### SLA Management
```
US-SLA-04: As an SLA manager, I want to define holiday calendars,
           so that business hours SLAs correctly account for holidays.
```

#### Continual Improvement
```
US-CSI-01: As a manager, I want an improvement register,
           so that improvement proposals are tracked.

US-CSI-02: As a manager, I want post-ticket satisfaction surveys
           (CSAT), so that customer feedback is systematically captured.

US-CSI-03: As a manager, I want automated trend reports
           (weekly/monthly), so that trends are visible.
```

#### Information Security
```
US-SEC-03: As an admin, I want to be able to enforce 2FA/MFA for all users,
           so that access is more secure.
```

### Could-Have (12 User Stories)

```
US-REL-01: As a release manager, I want to plan releases (bundle multiple changes),
           so that coordinated deployments are possible.

US-REL-02: As a release manager, I want quality gates (test → staging → prod),
           so that releases are controlled.

US-AVL-01: As a service manager, I want to define availability targets per
           service (e.g. 99.9%), so that availability management is possible.

US-AVL-02: As a service manager, I want MTBF/MTRS metrics,
           so that service reliability is measurable.

US-CMDB-03: As an admin, I want configuration baselines/snapshots,
            so that CI configurations are versioned.

US-KB-02:  As an agent, I want article ratings (thumbs up/down),
           so that the quality of the knowledge base is measurable.

US-KB-03:  As an agent, I want matching KB articles suggested
           when creating a ticket (KCS).

US-ITAM-03: As an asset manager, I want software license management,
            so that installed software can be compared against available licenses.

US-SD-03:  As an end user, I want a live chat in the portal,
           so that I get immediate help.

US-SEC-04: As an admin, I want IP whitelisting for API access,
           so that only authorized systems can access.

US-MON-04: As an admin, I want event correlation and deduplication,
           so that flapping doesn't lead to ticket floods.

US-CAP-01: As an admin, I want to import performance metrics (CPU, RAM, disk)
           from monitoring sources, so that capacity planning is possible.
```

---

## 6. Prioritized Implementation Plan

### Phase A — ITIL Core Compliance (Must-Have)

**Goal:** Bring incident, problem, change, and SLA to ITIL level.

| # | User Story | Effort | Module |
|---|-----------|--------|--------|
| 1 | US-INC-03 | M | Notification service (email on ticket changes) |
| 2 | US-SLA-01 | S | SLA breach worker (background job) |
| 3 | US-SLA-02 | S | SLA pause on pending status |
| 4 | US-PRB-01 | S | Root cause field on problem tickets |
| 5 | US-PRB-02 | M | Known Error Database + workaround display |
| 6 | US-PRB-03 | S | Known error suggestion for incidents |
| 7 | US-CHG-01 | M | RFC fields on change tickets |
| 8 | US-CHG-02 | S | Risk assessment (likelihood x impact) |
| 9 | US-INC-01 | M | Auto-escalation worker |
| 10 | US-INC-02 | M | Major incident process |
| 11 | US-SEC-01 | S | Password policy |
| 12 | US-SEC-02 | M | System-wide audit log |

**Estimated Total Effort Phase A:** ~6-8 feature blocks

### Phase B — Service Operations (Must + Should)

**Goal:** Monitoring, service requests, and SLA reporting.

| # | User Story | Effort | Module |
|---|-----------|--------|--------|
| 13 | US-MON-03 | S | Mount monitoring API routes |
| 14 | US-MON-01 | L | Check_MK v2 REST API client |
| 15 | US-MON-02 | M | Event-to-incident worker |
| 16 | US-SRQ-01 | L | Service request type + portal ordering |
| 17 | US-SRQ-02 | M | Fulfillment workflow mapping |
| 18 | US-SLA-03 | M | SLA performance reports |
| 19 | US-KB-01 | S | Full-text search (KB) |
| 20 | US-CHG-03 | M | CAB board |

**Estimated Total Effort Phase B:** ~8-10 feature blocks

### Phase C — Enterprise & Maturity (Should + Could)

**Goal:** Reporting, CSI, extended asset management, release management.

| # | User Story | Effort | Module |
|---|-----------|--------|--------|
| 21-24 | US-CHG-04 to 07 | M-L | Change calendar, impact analysis, standard changes, PIR |
| 25-26 | US-INC-04, 05 | S-M | Hierarchical categories, text templates |
| 27-28 | US-CMDB-01, 02 | M | CI history, auto-discovery |
| 29-30 | US-ITAM-01, 02 | M | Financial tracking, CSV import |
| 31-33 | US-CSI-01-03 | M-L | Improvement register, CSAT, trend reports |
| 34 | US-SEC-03 | M | 2FA/MFA |
| 35-36 | US-REL-01, 02 | L | Release planning, quality gates |
| 37-38 | US-AVL-01, 02 | M | Availability targets, MTBF/MTRS |

**Estimated Total Effort Phase C:** ~15-20 feature blocks

---

## Appendix: ITIL 4 Practice Score Summary

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
Average                           1.9/5
Weighted Average*                 2.8/5

* Weighted by relevance for an asset-centric ITSM:
  CMDB, Incident, SLA, Knowledge, Service Desk = 2x weight
```

---

*Generated on 2026-03-10 | OpsWeave v0.2.8 | Automated ITIL 4 Compliance Assessment*
