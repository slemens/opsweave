# OpsWeave — OpenAPI Spec Gaps


**Spec version:** 0.3.2 (Tags aktualisiert, einzelne Endpoint-Definitionen noch ausstehend)

---

## Missing Endpoints

### Tickets
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/tickets/stats/timeline` | Added post-spec |
| GET | `/api/v1/tickets/stats/by-customer` | Added post-spec |
| GET | `/api/v1/tickets/categories` | Category CRUD |
| POST | `/api/v1/tickets/categories` | Category CRUD |
| PUT | `/api/v1/tickets/categories/{id}` | Category CRUD |
| DELETE | `/api/v1/tickets/categories/{id}` | Category CRUD |
| PATCH | `/api/v1/tickets/{id}/archive` | Archive endpoint |
| GET | `/api/v1/tickets/{id}/children` | Parent/child tickets |

### Assets
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/assets/graph` | Full CMDB graph |

### Workflows
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/workflows/templates/{id}/steps` | Step management |
| DELETE | `/api/v1/workflows/templates/{id}/steps/{sid}` | Step management |
| PUT | `/api/v1/workflows/templates/{id}/steps/reorder` | Step reordering |
| GET | `/api/v1/workflows/templates/{id}/instances` | Template instances |
| GET | `/api/v1/workflows/ticket/{ticketId}` | Get workflow for ticket |

### Compliance
| Method | Path | Notes |
|--------|------|-------|
| PUT | `/api/v1/compliance/requirements/{rid}` | Requirement update |
| DELETE | `/api/v1/compliance/requirements/{rid}` | Requirement delete |
| POST | `/api/v1/compliance/requirements/{rid}/mappings/{sid}` | Mapping CRUD |
| DELETE | `/api/v1/compliance/requirements/{rid}/mappings/{sid}` | Mapping CRUD |
| GET | `/api/v1/compliance/frameworks/{id}/assets` | Asset flags |
| POST | `/api/v1/compliance/frameworks/{id}/assets` | Asset flags |
| DELETE | `/api/v1/compliance/frameworks/{id}/assets/{aid}` | Asset flags |

### Service Catalog
| Method | Path | Notes |
|--------|------|-------|
| DELETE | `/api/v1/services/catalogs/vertical/{id}` | Vertical catalog delete |
| POST | `/api/v1/services/catalogs/vertical/{id}/overrides` | Override management |
| DELETE | `/api/v1/services/catalogs/vertical/{id}/overrides/{oid}` | Override management |

### SLA (entire module missing from spec)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/sla/definitions` | SLA definition CRUD |
| GET | `/api/v1/sla/definitions/{id}` | |
| POST | `/api/v1/sla/definitions` | |
| PUT | `/api/v1/sla/definitions/{id}` | |
| DELETE | `/api/v1/sla/definitions/{id}` | |
| GET | `/api/v1/sla/assignments` | SLA assignment CRUD |
| POST | `/api/v1/sla/assignments` | |
| DELETE | `/api/v1/sla/assignments/{id}` | |
| GET | `/api/v1/sla/resolve` | SLA resolution helper |

### Settings
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/settings/runtime` | Runtime config |
| DELETE | `/api/v1/settings/{key}` | Setting deletion |

### License
| Method | Path | Notes |
|--------|------|-------|
| DELETE | `/api/v1/license` | License deactivation |

### Customers
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/customers/{id}/overview` | Customer overview |

---

## Endpoints in Spec but Not Implemented

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/auth/refresh` | Token refresh not implemented (stateless JWT) |
| GET | `/api/v1/auth/oidc/login` | OIDC not yet implemented (Phase 6) |
| GET | `/api/v1/auth/oidc/callback` | OIDC not yet implemented (Phase 6) |
| GET | `/api/v1/assets/search` | Merged into GET /assets with `q` param |
| GET | `/api/v1/assets/types` | Not implemented as separate endpoint |
| POST | `/api/v1/workflows/instances/{id}/steps/{sid}/route` | Not implemented |
| GET | `/api/v1/compliance/frameworks/{id}/gaps` | Not implemented |
| GET/PUT | `/api/v1/settings/branding` | Not implemented as separate endpoint |
| GET | `/api/v1/kb/articles/search` | Merged into GET /kb/articles with `q` param |
| GET | `/api/v1/kb/categories` | Not implemented as separate endpoint |
| GET/POST | `/api/v1/monitoring/sources` | Monitoring module not implemented |
| PUT | `/api/v1/monitoring/sources/{id}` | Monitoring module not implemented |
| POST/GET | `/api/v1/monitoring/events` | Monitoring module not implemented |

---

## Recommendation

1. Bump spec version to `0.2.0` to match codebase
2. Add all missing endpoints listed above
3. Remove or mark as `x-not-implemented` the endpoints not yet built
4. Run `npm run generate-api-docs` after updating (if script is functional)
