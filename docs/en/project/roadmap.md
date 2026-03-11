# OpsWeave — Roadmap

> Consolidated backlog of all open features, improvements, and technical debt.
> As of: v0.3.2

---

## Planned Features

### Phase 6: Monitoring Integration
- Check_MK v1 (Livestatus) + v2 (REST API) adapter
- Webhook inbound + event-to-asset matching
- Auto-incident creation with deduplication
- Monitoring source management UI

### Notifications Module
- In-app + email notifications
- Configurable per user (ticket assignment, SLA warning, comment)
- Proactive SLA breach alerts (X minutes before deadline)

### OIDC/SAML Authentication (Enterprise)
- passport-openidconnect for Azure AD, Keycloak, Okta
- OIDC user + group sync

### Ticket Attachments
- File upload (drag & drop) in comment editor
- Images inline, other files as download
- Storage: Local filesystem or S3-compatible
- `ticket_attachments` table

### System User for Automatic Changes
- Dedicated system user (UUID) in seed
- All automatic changes reference the system user
- Resolves DATA-02 (invalid `'system'` FK)

### Auto-Assignment Rules
- Rules: Category/Asset/SLA tier → automatic group assignment
- Configurable per tenant

---

## Technical Debt

### Security
- **AUTH-03:** JWT token in localStorage → Migrate to HttpOnly cookies or document risk + harden CSP
- **SEC-01:** Rate limiting on login endpoints (5 req/min instead of global 1000/15min)
- **SEC-02:** Escape LIKE wildcard injection (`%`, `_` in search fields)
- **SEC-04:** Unify login error messages (don't leak SSO status)
- **SEC-05:** UNIQUE constraint on portal email (tenant_id, email)
- **CSRF:** SameSite cookies or X-CSRF-Token header

### Data Integrity
- **DATA-01:** Race condition on ticket numbers (DB-level sequence or lock)
- **DATA-03:** Extract ticket number logic DRY (`lib/ticket-number.ts`)

### Performance
- **PERF-01:** N+1 query in asset relations → batch query with `inArray()`

### Frontend
- **MED-08:** Configure query gcTime (10 min instead of unlimited)
- **MED-09:** Request timeout in API client (AbortController, 30s)
- **MED-10:** React.memo on ticket board cards
- **MED-12:** Read locale in formatDate() from user settings

### Accessibility
- **A11Y-02:** Color as sole status indicator → add icons additionally

---

## Tests
- Unit tests: 0% coverage → target 80% (auth, tickets, SLA, license)
- Integration tests: Tenant isolation, license enforcement, portal boundary
- E2E: Tenant switching, license limits, negative paths

---

## Architecture Recommendations (Long-Term)
- Event bus for module communication
- OpenTelemetry instrumentation
- Unified background job processor
- Redis cache layer
- HA deployment documentation
- Optimistic locking (version field + ETag)
- Global search across entities
