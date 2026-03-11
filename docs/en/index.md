---
layout: home

hero:
  name: "OpsWeave"
  text: "IT Service Management"
  tagline: "Asset-centric. Workflow-powered. Open Source."
  image:
    src: /logo-icon.svg
    alt: OpsWeave Logo
  actions:
    - theme: brand
      text: Quick Start →
      link: /en/guide/quickstart
    - theme: alt
      text: Installation
      link: /en/guide/installation
    - theme: alt
      text: GitHub
      link: https://github.com/slemens/opsweave

features:
  - icon: 🗄️
    title: Asset CMDB
    details: Full-featured CMDB with DAG relations, SLA inheritance, and asset graph visualization. 24 asset types, 7 categories.

  - icon: 🎫
    title: Ticket Management
    details: ITIL-compliant incident, problem, and change processes. Kanban board, SLA tracking, comments, history.

  - icon: ⚙️
    title: Workflow Engine
    details: Drag-and-drop workflow designer with step types (Form, Routing, Approval, Condition, Automatic) and runtime engine.

  - icon: 📋
    title: Service Catalog
    details: Service descriptions, horizontal and vertical catalogs. Asset-service linking. Compliance tags.

  - icon: ✅
    title: Compliance
    details: Regulatory frameworks (ISO 27001, GDPR, BSI IT-Grundschutz), requirements, compliance matrix, gap analysis.

  - icon: 📚
    title: Knowledge Base
    details: Markdown articles with ticket linking. Internal and public visibility. Full-text search.

  - icon: 🏢
    title: Customer Portal
    details: Self-service portal with separate authentication. Ticket view, comments, ticket creation, KB access.

  - icon: 📧
    title: Email Inbound
    details: IMAP polling and webhook ingest (Mailgun, SendGrid). Thread matching, auto-ticket creation.

  - icon: 🏗️
    title: Multi-Tenant
    details: Strict data isolation via tenant_id. An agent can be assigned to multiple customers. Tenant-specific roles.

  - icon: 🔑
    title: Freemium License
    details: Community Edition free of charge (50 assets, 5 users). Enterprise extensions via offline JWT (no license server).

  - icon: 🐳
    title: Docker-First
    details: Single container for quick start. Multi-container (PostgreSQL + Redis) for production.

  - icon: 🌍
    title: Bilingual
    details: German and English UI from day one. Complete i18n system with 9 namespaces.

  - icon: 🔍
    title: Monitoring Integration
    details: Check_MK integration (v1 + v2), event dashboard with status cards, auto-incident creation, asset matching.

  - icon: ⏱️
    title: SLA Management
    details: Gold/Silver/Bronze SLA tiers, breach tracking, performance reports, automatic deadline calculation.

  - icon: 🛡️
    title: Change Advisory Board
    details: CAB board for change approvals. Risk assessment, RFC details, approve/reject/defer workflow.

  - icon: 🚨
    title: Major Incidents
    details: Major incident declaration, incident commander, bridge call, KEDB with workarounds.

  - icon: ⬆️
    title: Escalation
    details: Multi-level escalation (L1→L2→L3) with target group, justification, and automatic notification.

  - icon: 📊
    title: Reporting & Dashboard
    details: KPI dashboard with ticket statistics, SLA performance, compliance status, and trend analysis.
---
