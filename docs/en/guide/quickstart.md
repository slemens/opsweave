# Quick Start

After [installation](/en/guide/installation), this guide walks you through the first steps.

## 1. Log In

Open http://localhost:8080 and log in with the default credentials:

- **Email:** `admin@opsweave.local`
- **Password:** `changeme`

::: warning
Change the default password immediately under **Settings → Profile**.
:::

## 2. Create Your First Ticket

1. Click **Tickets** in the sidebar
2. Click **New Ticket** in the upper right
3. Fill in the form:
   - **Type:** Incident
   - **Title:** e.g. "Test Incident"
   - **Priority:** Medium
4. Click **Create**

The ticket appears on the Kanban board in the "Open" column.

## 3. Create Your First Asset

1. Click **Assets / CMDB** in the sidebar
2. Click **Add Asset**
3. Select an asset type (e.g. "Server")
4. Enter a name and optionally an IP address
5. Click **Create**

## 4. Link Ticket to Asset

1. Open the created ticket
2. Click the **Asset** field in the right column
3. Search for the asset and select it
4. The ticket is now linked to the asset — the SLA tier is automatically inherited

## 5. Create Your First Workflow

1. Click **Workflows** → **New Template**
2. Enter a name (e.g. "Incident Escalation")
3. Add steps:
   - **Step 1:** Type "Form" — Agent fills out initial analysis
   - **Step 2:** Type "Approval" — Manager confirms escalation
4. Click **Save**

Workflows are automatically triggered when tickets match the configured type/subtype.

## 6. Create a Knowledge Base Article

1. Click **Knowledge Base** → **Create Article**
2. Write the article in Markdown
3. Set **Visibility** to "Public" if the article should appear in the customer portal
4. Click **Publish**

## Demo Data

The seed data already includes:
- 4 demo users (Admin User, Alex Agent, Maria Manager, Viewer User)
- 3 groups (1st Level, 2nd Level, Management)
- 15 assets with relations
- 5 tickets in various states
- 2 workflow templates
- 7 KB articles
- 1 customer portal user (`portal@acme.example.com` / `changeme`)

**Customer Portal:** http://localhost:8080/portal/login

## Next Steps

- [Ticket Management →](/en/features/tickets)
- [CMDB / Assets →](/en/features/cmdb)
- [Workflows →](/en/features/workflows)
- [REST API →](/en/api/)
