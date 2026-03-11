# Customer Portal

The customer portal is a self-service portal for end customers with **separate authentication**,
separate from the internal agent accounts.

## Access

The portal is accessible at `/portal/login`.
Customer portal users are stored in a separate table (`customer_portal_users`)
and have **no access** to the internal ITSM interface.

**Demo Access (Seed Data):**
- URL: http://localhost:8080/portal/login
- Email: `portal@acme.example.com`
- Password: `changeme`
- Tenant: `demo-org`

## Features

### My Tickets

- List of all tickets for the user's customer
- Filter by status
- Ticket detail with comments

**Visibility:** Only external comments (no internal agent notes)

### Create New Ticket

Portal users can submit tickets:
- Type (Incident / Change)
- Title and description
- Priority

The ticket is created with `source: 'portal'` and the portal user's `customer_id`.

### Comments

Portal users can leave external comments.
Agents see these comments in the regular ticket view.

### Knowledge Base

All **published, public** KB articles are visible in the portal:
- Search
- Article cards with category and tags
- Full article view (Markdown rendered)

## Authentication

The portal uses its own JWT tokens with the `portal: true` flag.
Tenant assignment is done via the `tenantSlug` during login.

```json
{
  "sub": "portal-user-id",
  "email": "user@customer.example",
  "displayName": "Max Mustermann",
  "customerId": "customer-uuid",
  "tenantId": "tenant-uuid",
  "portal": true
}
```

## Managing Portal Users

Portal users are currently created directly in the database.
An admin UI for portal user management is planned.

```sql
INSERT INTO customer_portal_users
  (id, tenant_id, customer_id, email, display_name, password_hash, is_active, created_at)
VALUES (?, ?, ?, ?, ?, bcrypt(?), 1, ?);
```

## REST API (Portal Endpoints)

```
POST /api/v1/portal/auth/login         # Portal login (returns JWT)
GET  /api/v1/portal/auth/me            # Own profile + customer info
GET  /api/v1/portal/tickets            # Own tickets (paginated)
GET  /api/v1/portal/tickets/:id        # Ticket detail + external comments
POST /api/v1/portal/tickets            # Create new ticket
POST /api/v1/portal/tickets/:id/comments # Add comment
GET  /api/v1/portal/kb                 # Public KB articles (optional: ?q=)
```
