<div align="center">
  <img src="assets/screenshots/dashboard.png" alt="OpsWeave Dashboard with CMDB topology, ticket board, and SLA status" width="100%" />

  <br /><br />

  <h1>OpsWeave</h1>

  <p><strong>IT Service Management that takes your CMDB seriously.</strong></p>
  <p>OpsWeave links tickets, SLAs and compliance to your assets — find the right lever the moment something breaks.</p>

  <p>
    <a href="https://github.com/users/slemens/packages/container/package/opsweave"><img src="https://img.shields.io/badge/version-0.10.0-2563eb?style=for-the-badge" alt="Version" /></a>
    <a href="https://demo.opsweave.de"><img src="https://img.shields.io/badge/live%20demo-opsweave.de-22c55e?style=for-the-badge" alt="Demo" /></a>
    <a href="https://docs.opsweave.de"><img src="https://img.shields.io/badge/docs-opsweave.de-f59e0b?style=for-the-badge" alt="Docs" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Commercial-333?style=for-the-badge" alt="License" /></a>
  </p>

  <p>
    <a href="https://demo.opsweave.de"><strong>Live Demo</strong></a> ·
    <a href="https://docs.opsweave.de"><strong>Documentation</strong></a> ·
    <a href="https://opsweave.de/pricing.html"><strong>Pricing</strong></a> ·
    <a href="https://opsweave.de/compare.html"><strong>Compare</strong></a> ·
    <a href="https://github.com/slemens/opsweave/issues"><strong>Issues</strong></a>
  </p>
</div>

---

## Why teams pick OpsWeave

- **Asset-first with DAG visualization** — every ticket, SLA, contract and compliance control links back to an asset in the CMDB. Impact paths are visible, not implied.
- **Full ITIL suite** — Incident, Problem, Change, Service Request, CAB, KEDB. SLA engine inherits over the dependency graph; auto-escalation built in.
- **1,369 compliance controls bundled** — ISO 27001, BSI C5, NIS2, GDPR mapped to real assets, tickets and audit logs. No Excel mapping.
- **Multi-tenant by design** — every table carries `tenant_id`, every query is row-level isolated. One instance, n separated tenants — MSP-ready.
- **Self-hosted in the EU** — your data on your infrastructure, no US-cloud risk, no phone-home licensing. Source code audit available under NDA.

## Quick start

**Single container (SQLite, evaluation)**

```bash
docker run -d \
  -p 8080:8080 \
  -v opsweave-data:/data \
  --name opsweave \
  ghcr.io/slemens/opsweave:latest
```

**Multi-container (PostgreSQL + Redis, production)**

```bash
git clone https://github.com/slemens/opsweave.git
cd opsweave/examples
cp .env.example .env       # edit SMTP, license, tenant
docker compose up -d
```

Open http://localhost:8080 — initial credentials: `admin@opsweave.local` / `changeme`.

System requirements: 2 vCPU + 4 GB RAM minimum (Starter, ≤10 agents); 4 vCPU + 8 GB RAM typical (Team/Business, ≤50 agents). Postgres 15+ or SQLite. Linux, macOS or Windows (WSL2). No internet required after install. Full guide: [docs.opsweave.de/guide/installation.html](https://docs.opsweave.de/guide/installation.html).

## A look inside

<table>
  <tr>
    <td width="50%">
      <a href="assets/screenshots/ticket-board.png"><img src="assets/screenshots/ticket-board.png" alt="ITIL Ticket Board" /></a>
      <p align="center"><sub><b>ITIL Ticket Board</b> — Kanban with drag-and-drop, filters, SLA status</sub></p>
    </td>
    <td width="50%">
      <a href="assets/screenshots/cmdb-topology.png"><img src="assets/screenshots/cmdb-topology.png" alt="CMDB Topology" /></a>
      <p align="center"><sub><b>CMDB Topology</b> — DAG visualization of asset relations and impact paths</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <a href="assets/screenshots/workflow-detail.png"><img src="assets/screenshots/workflow-detail.png" alt="Workflow Designer" /></a>
      <p align="center"><sub><b>Workflow Designer</b> — Visual editor with CAB voting for change processes</sub></p>
    </td>
    <td width="50%">
      <a href="assets/screenshots/compliance.png"><img src="assets/screenshots/compliance.png" alt="Compliance Matrix" /></a>
      <p align="center"><sub><b>Compliance Matrix</b> — ISO 27001, BSI C5, NIS2 framework mapping</sub></p>
    </td>
  </tr>
</table>

→ Live walkthrough at [demo.opsweave.de](https://demo.opsweave.de). No signup, no credit card.

## When something breaks

Three scenarios that play out in every ITSM tool every day — and how OpsWeave shortens them:

> **Mail server down at 3 AM**
> *Problem.* You get paged. Which services depend on it? Which customers are affected? Was there a change last week?
> *OpsWeave.* One click on the mail server in the CMDB — you see instantly: affected services, affected customers, the last 5 changes, similar major incidents from the KEDB.
> *Outcome.* 3 clicks to diagnosis instead of 30 minutes of Excel hunting.

> **ISO auditor arrives in 4 weeks**
> *Problem.* 114 ISO 27001 controls, each to be evidenced individually. Who patched which asset, which tickets relate, which approvals?
> *OpsWeave.* 1,369 compliance controls bundled (ISO 27001, BSI C5, NIS2, GDPR). Every control maps to real assets, tickets and audit logs — no Excel mapping.
> *Outcome.* Audit prep shrinks from weeks to days.

> **12 customers, one MSP, one platform**
> *Problem.* Each customer wants their own SLAs, tickets, data. But you do not want to maintain 12 instances.
> *OpsWeave.* Multi-tenant by design — every table has `tenant_id`, every query is isolated. One instance, 12 completely separate tenants.
> *Outcome.* Ship updates once, every customer benefits.

## Trust & compliance

- **Tamper-proof audit trail** — every change to tickets, assets and changes is recorded in a SHA-256 hash chain. Retroactive manipulation is detected — suitable for BaFin and DORA audits.
- **Multi-tenant by design** — `tenant_id` on every entity table, every query row-level isolated. Verifiable in code under NDA.
- **AI transparency** — default Ollama or LiteLLM self-hosted; your data never leaves your network. BYOK optional for OpenAI, Anthropic, Gemini.
- **Source audit under NDA** — audit-grade source-code access for customers on request. Compliance reviews, pen tests, architecture audits.
- **No vendor lock-in** — standard Docker images, Postgres or SQLite, REST API. Data exportable any time.

→ Details: [opsweave.de](https://opsweave.de) (compliance & trust section).

## Pricing

| Tier | Agents | Assets | Compliance | Price |
|---|---:|---:|---|---:|
| **Starter** | max **10** | max **50** | 1 framework | Free |
| **Team** | per-licence | up to **500** | 3 frameworks | On request |
| **Business** | per-licence | up to **1,000** | All bundled | On request |
| **Enterprise** | per-licence | unlimited | All bundled + AI Compliance Feed | On request |

**How licensing works.** OpsWeave is licensed per agent — every user actively working on tickets. Customers, viewers and customer-portal users do not count. Starter is capped at 10 agents and 50 assets (hard limits). In Team, Business and Enterprise you license per agent (no hard agent cap).

**Need more assets?** Asset packs (+100 / +500 / +1,000) are available on request. You get a warning before the limit is reached — no hard stop.

→ Full details + FAQ on [opsweave.de/pricing.html](https://opsweave.de/pricing.html).

## How OpsWeave compares

| | OpsWeave | ServiceNow | Freshservice | Zammad | TOPdesk |
|---|:---:|:---:|:---:|:---:|:---:|
| Licence model | Commercial (source under NDA) | Closed source | Closed source | GPL | AGPL |
| Self-hosted | Yes | Limited / complex | Cloud-first | Yes | Contract-dependent |
| CMDB as core model | Asset-first | Yes | Basic CMDB | Limited | Service-oriented |
| Change + CAB | Included | Yes | Partial | Not a focus | Yes |
| Compliance mapping (DORA / NIS2) | Native | Mostly add-ons | Rarely native | DIY build | Process-heavy |
| Fast Docker start | Yes, in minutes | No | No | Tech know-how needed | No |
| Cost for SMB (5–50 IT staff) | Very predictable | High | Mid to high | Low | Mid to high |
| Data sovereignty (EU / on-prem) | 100 % on your side | Depends on setup | Cloud provider | On-prem | Contract-dependent |

→ Full comparison: [opsweave.de/compare.html](https://opsweave.de/compare.html).

## FAQ (excerpt)

**What counts as an agent?**
Every user who actively works on tickets. Viewers, customer-portal users and external customers do not count. Assets are independent — you pay per agent.

**Which AI model is used?**
By default OpsWeave uses Ollama or LiteLLM self-hosted — your data never leaves your network. Alternatively you can provide your own API keys (BYOK) for OpenAI, Anthropic or Gemini.

**Is there white-label for MSPs?**
Multi-tenant branding (own logo, colours, sub-domain per tenant) is available from the Business tier. Custom CSS and custom login pages are included.

**How does backup and restore work?**
All data lives in the Postgres database and an object store (local or S3-compatible). Standard tools (`pg_dump`, `rsync`, `restic`) work directly. In the Business tier an automated backup job can be set up; in the Enterprise tier we guide the disaster-recovery plan.

**What happens if I exceed the asset limit?**
In Team, Business and Enterprise you get a warning before the limit is reached — no hard lock. You can book additional asset packs or upgrade any time. In Starter, 10 agents and 50 assets are hard caps — upgrading to Team removes them.

→ Full FAQ: [opsweave.de/pricing.html#faq](https://opsweave.de/pricing.html).

## Source code

Source code is not distributed with the binary. Audit-grade source-code review is available to customers under a separate Non-Disclosure Agreement — contact [sebastian@opsweave.de](mailto:sebastian@opsweave.de).

## Telemetry

OpsWeave transmits anonymous operational telemetry (instance UUID, version, DB type, aggregate counts of assets, users, tickets). No personal data, no tenant names, no business content is collected. Disable with `OPSWEAVE_TELEMETRY=false`. Update-check disable with `OPSWEAVE_UPDATE_CHECK=false`.

## Support & contact

- **Documentation** — [docs.opsweave.de](https://docs.opsweave.de)
- **Issues** — [github.com/slemens/opsweave/issues](https://github.com/slemens/opsweave/issues)
- **Sales / NDA** — [sebastian@opsweave.de](mailto:sebastian@opsweave.de)
- **Security** — [sebastian@opsweave.de](mailto:sebastian@opsweave.de)

### Early-adopter programme

OpsWeave is fresh on the market. We are looking for 5 pilot customers from the DACH mid-market or MSP space — discounted Business licence, dedicated onboarding, direct line to the core team. In return: feedback and permission to name you after go-live. [Get in touch.](mailto:sebastian@opsweave.de?subject=Early%20Adopter%20Programme)

## License

Copyright © 2026 Sebastian Lemens · OpsWeave is commercial software (proprietary EULA — see [LICENSE](LICENSE)). The Starter Edition is free for self-hosted use; Team / Business / Enterprise are paid tiers ([pricing](https://opsweave.de/pricing.html)).
