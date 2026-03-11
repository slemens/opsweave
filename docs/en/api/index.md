# REST API Overview

OpsWeave provides a comprehensive REST API. All UI functions are also available via the API.

## Base URL

```
http://localhost:3000/api/v1/
```

## Authentication

All endpoints (except portal auth, webhooks, and `/health`) require a Bearer token:

```bash
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:3000/api/v1/tickets
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@opsweave.local", "password": "changeme"}'
```

## Response Format

**Success (List):**
```json
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "limit": 25 }
}
```

**Success (Single):**
```json
{ "data": { ... } }
```

**Error:**
```json
{
  "error": "Ticket not found",
  "code": "NOT_FOUND",
  "status": 404
}
```

## Pagination & Filtering

```
GET /api/v1/tickets?page=2&limit=10&status=open&sort=created_at&order=desc
```

| Parameter | Description |
|-----------|-------------|
| `page` | Page (default: 1) |
| `limit` | Entries per page (default: 25, max: 100) |
| `sort` | Sort field |
| `order` | `asc` or `desc` |
| `q` | Full-text search |

## Tenant Scoping

The tenant is **read from the JWT**, not from the URL.
All data is automatically scoped to the logged-in user's tenant.

## Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/logout` | Logout |
| `POST` | `/auth/refresh` | Refresh JWT |
| `GET` | `/auth/me` | Own profile + tenants |
| `POST` | `/auth/switch-tenant` | Switch active tenant |

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | User list |
| `POST` | `/users` | Create user |
| `GET` | `/users/:id` | User detail |
| `PUT` | `/users/:id` | Update user |
| `DELETE` | `/users/:id` | Deactivate user |
| `POST` | `/users/import` | Import users from CSV |

### Groups

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/groups` | Group list |
| `POST` | `/groups` | Create group |
| `GET` | `/groups/:id` | Group detail |
| `PUT` | `/groups/:id` | Update group |
| `DELETE` | `/groups/:id` | Delete group |
| `GET` | `/groups/:id/members` | Members |
| `POST` | `/groups/:id/members` | Add member |
| `DELETE` | `/groups/:id/members/:uid` | Remove member |

### Tickets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tickets` | List (filter: type, status, priority, assignee, q) |
| `POST` | `/tickets` | Create |
| `GET` | `/tickets/:id` | Detail |
| `PUT` | `/tickets/:id` | Update |
| `PATCH` | `/tickets/:id/status` | Change status |
| `PATCH` | `/tickets/:id/assign` | Assign |
| `GET` | `/tickets/:id/comments` | Comments |
| `POST` | `/tickets/:id/comments` | Add comment |
| `GET` | `/tickets/:id/history` | Change log |
| `PATCH` | `/tickets/batch` | Batch update (max 100 tickets) |
| `GET` | `/tickets/stats` | Statistics |
| `GET` | `/tickets/stats/timeline` | Timeline statistics |
| `GET` | `/tickets/stats/by-customer` | Statistics per customer |
| `GET` | `/tickets/board` | Kanban board data |
| `GET/POST` | `/tickets/categories` | Ticket categories |
| `PUT/DELETE` | `/tickets/categories/:id` | Edit/delete category |

### Assets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/assets` | List |
| `POST` | `/assets` | Create |
| `GET` | `/assets/:id` | Detail |
| `PUT` | `/assets/:id` | Update |
| `DELETE` | `/assets/:id` | Delete |
| `GET` | `/assets/:id/relations` | Relations |
| `POST` | `/assets/:id/relations` | Add relation |
| `DELETE` | `/assets/:id/relations/:rid` | Remove relation |
| `GET` | `/assets/:id/sla-chain` | SLA inheritance chain |
| `GET` | `/assets/:id/tickets` | Linked tickets |
| `GET` | `/assets/stats` | Statistics |

### Workflows

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/workflows/templates` | Templates |
| `POST` | `/workflows/templates` | Create |
| `GET/PUT/DELETE` | `/workflows/templates/:id` | Detail |
| `POST` | `/workflows/instantiate` | Manually trigger |
| `GET` | `/workflows/instances/:id` | Instance status |
| `POST` | `/workflows/instances/:id/steps/:sid/complete` | Complete step |
| `POST` | `/workflows/instances/:id/cancel` | Cancel |

### Knowledge Base

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/kb/articles` | List (filter: status, visibility, category, q, linked_ticket_id) |
| `POST` | `/kb/articles` | Create |
| `GET/PUT/DELETE` | `/kb/articles/:id` | Detail |
| `POST` | `/kb/articles/:id/link/:ticketId` | Link to ticket |
| `DELETE` | `/kb/articles/:id/link/:ticketId` | Remove link |

### Service Catalog

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/services/descriptions` | Service descriptions |
| `GET/PUT` | `/services/descriptions/:id` | Detail |
| `GET/POST` | `/services/catalogs/horizontal` | Horizontal catalogs |
| `GET/POST` | `/services/catalogs/vertical` | Vertical catalogs (Enterprise) |

### Compliance

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/compliance/frameworks` | Frameworks |
| `GET/POST` | `/compliance/frameworks/:id/requirements` | Requirements |
| `GET` | `/compliance/frameworks/:id/matrix` | Compliance matrix |
| `GET` | `/compliance/frameworks/:id/gaps` | Gap analysis |
| `POST/DELETE` | `/compliance/mappings` | Service↔requirement |

### Email

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/email/configs` | Configurations |
| `GET/PUT/DELETE` | `/email/configs/:id` | Detail |
| `POST` | `/email/configs/:id/test` | Connection test |
| `GET` | `/email/messages` | Received emails |
| `POST` | `/email/webhook` | Webhook ingest (public) |

### Customer Portal

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/portal/auth/login` | Portal login |
| `GET` | `/portal/auth/me` | Portal user profile |
| `GET` | `/portal/tickets` | Own tickets |
| `POST` | `/portal/tickets` | Create ticket |
| `GET` | `/portal/tickets/:id` | Ticket detail |
| `POST` | `/portal/tickets/:id/comments` | Comment |
| `GET` | `/portal/kb` | Public KB articles |

### SLA

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/sla/definitions` | All SLA definitions |
| `GET` | `/sla/definitions/:id` | SLA definition detail |
| `POST` | `/sla/definitions` | Create SLA definition |
| `PUT` | `/sla/definitions/:id` | Update SLA definition |
| `DELETE` | `/sla/definitions/:id` | Delete SLA definition |
| `GET` | `/sla/assignments` | All SLA assignments |
| `POST` | `/sla/assignments` | Create SLA assignment |
| `DELETE` | `/sla/assignments/:id` | Remove SLA assignment |
| `GET` | `/sla/resolve` | Resolve SLA for asset/customer |

### Customers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/customers` | Customer list |
| `POST` | `/customers` | Create customer |
| `GET` | `/customers/:id` | Customer detail |
| `PUT` | `/customers/:id` | Update customer |
| `DELETE` | `/customers/:id` | Deactivate customer |
| `GET` | `/customers/:id/overview` | Customer overview (tickets, assets, SLAs) |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/settings` | All settings |
| `PUT` | `/settings/:key` | Change setting |
| `DELETE` | `/settings/:key` | Delete setting |
| `GET` | `/settings/runtime` | Runtime configuration |

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/system/health` | Health check |
| `GET` | `/system/info` | App info (version, DB) |
| `GET` | `/license` | License status |
| `POST` | `/license/activate` | Activate Enterprise key |
| `DELETE` | `/license` | Deactivate license |
