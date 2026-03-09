---
layout: home

hero:
  name: "OpsWeave"
  text: "IT Service Management"
  tagline: "Asset-zentriert. Workflow-gesteuert. Open Source."
  image:
    src: /logo-icon.svg
    alt: OpsWeave Logo
  actions:
    - theme: brand
      text: Quick Start →
      link: /guide/quickstart
    - theme: alt
      text: Installation
      link: /guide/installation
    - theme: alt
      text: GitHub
      link: https://github.com/slemens/opsweave

features:
  - icon: 🗄️
    title: Asset-CMDB
    details: Vollständige CMDB mit DAG-Relationen, SLA-Vererbung und Asset-Graph-Visualisierung. 24 Asset-Typen, 7 Kategorien.

  - icon: 🎫
    title: Ticket Management
    details: ITIL-konforme Incident-, Problem- und Change-Prozesse. Kanban-Board, SLA-Tracking, Kommentare, History.

  - icon: ⚙️
    title: Workflow Engine
    details: Drag-and-drop Workflow-Designer mit Step-Typen (Form, Routing, Approval, Condition, Automatic) und Runtime-Engine.

  - icon: 📋
    title: Service Katalog
    details: Leistungsbeschreibungen, horizontale und vertikale Kataloge. Asset-Service-Verknüpfung. Compliance-Tags.

  - icon: ✅
    title: Compliance
    details: Regulatorik-Frameworks (ISO 27001, DSGVO, BSI IT-Grundschutz), Anforderungen, Compliance-Matrix, Gap-Analyse.

  - icon: 📚
    title: Wissensdatenbank
    details: Markdown-Artikel mit Ticket-Verknüpfung. Interne und öffentliche Sichtbarkeit. Volltextsuche.

  - icon: 🏢
    title: Kundenportal
    details: Self-Service Portal mit separater Authentifizierung. Ticket-Ansicht, Kommentare, Ticket-Erstellung, KB-Zugriff.

  - icon: 📧
    title: E-Mail Inbound
    details: IMAP-Polling und Webhook-Ingest (Mailgun, SendGrid). Thread-Matching, Auto-Ticket-Erstellung.

  - icon: 🏗️
    title: Multi-Tenant
    details: Strikte Datenisolation via tenant_id. Ein Agent kann mehreren Kunden zugeordnet sein. Tenant-spezifische Rollen.

  - icon: 🔑
    title: Freemium-Lizenz
    details: Community Edition kostenlos (50 Assets, 5 User). Enterprise-Erweiterungen via Offline-JWT (kein Lizenzserver).

  - icon: 🐳
    title: Docker-First
    details: Single-Container für schnellen Start. Multi-Container (PostgreSQL + Redis) für Production.

  - icon: 🌍
    title: Zweisprachig
    details: Deutsche und englische UI ab Tag 1. Vollständiges i18n-System mit 9 Namespaces.
---
