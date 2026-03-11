# Email Inbound

OpsWeave can automatically convert incoming emails into tickets and
assign replies to existing tickets as comments.

## Configuration

Email configurations are managed under **Settings → Email**.

### Provider Types

| Type | Description |
|------|-------------|
| `imap` | IMAP polling (periodic retrieval) |
| `webhook_mailgun` | Mailgun inbound webhook |
| `webhook_sendgrid` | SendGrid inbound parse |
| `smtp_gateway` | SMTP gateway (own MX) |

### IMAP Configuration

```json
{
  "host": "imap.example.com",
  "port": 993,
  "secure": true,
  "username": "support@example.com",
  "password": "..."
}
```

## Thread Matching

OpsWeave detects whether an incoming email is a reply to an existing ticket:

**Priority 1:** `In-Reply-To` / `References` header → known `message_id`?

**Priority 2:** Subject contains ticket number (e.g. `Re: [INC-2026-00042] Server unreachable`)

**Match found:** Email is appended as an external comment to the ticket.

**No match:** A new ticket is created (ticket type from configuration, group from `target_group_id`).

## Auto-Ticket

New emails without a thread match automatically create a ticket:

- **Title:** Email subject
- **Description:** Email body (text version)
- **Source:** `email`
- **Type:** Configurable per email config (`incident` or `change`)
- **Group:** `target_group_id` from configuration
- **Reporter:** Email sender (stored as text)

## Webhook Ingest

For Mailgun and SendGrid, a public webhook endpoint is used:

```
POST /api/v1/email/webhook?provider=mailgun&config_id=<id>
POST /api/v1/email/webhook?provider=sendgrid&config_id=<id>
```

## REST API

```
GET    /api/v1/email/configs           # Email configurations
POST   /api/v1/email/configs           # Create configuration
GET    /api/v1/email/configs/:id        # Detail
PUT    /api/v1/email/configs/:id        # Update
DELETE /api/v1/email/configs/:id        # Delete
POST   /api/v1/email/configs/:id/test   # Connection test (IMAP)
GET    /api/v1/email/messages           # Received emails (paginated)
GET    /api/v1/email/messages/:id        # Email detail
POST   /api/v1/email/webhook            # Webhook endpoint (public)
```

::: warning IMAP Poller
The IMAP poller is fully implemented as a configuration.
The background worker for active IMAP polling will be activated in a later version.
Webhook-based providers (Mailgun, SendGrid) work immediately.
:::
