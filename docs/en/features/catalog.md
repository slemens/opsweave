# Service Catalog

The Service Catalog manages your IT organization's service portfolio across three tiers.

## Architecture (3-Tier)

```
Service Descriptions
        ↓
Horizontal Catalog (All Services)
        ↓
Vertical Catalog (Customer-specific) [Enterprise]
```

## Service Descriptions

Standardized descriptions of individual IT services:

| Field | Description |
|-------|-------------|
| `code` | Unique identifier (e.g. "SVC-001") |
| `title` | Service title |
| `description` | Detailed description |
| `scope_included` | What is included |
| `scope_excluded` | What is explicitly excluded |
| `compliance_tags` | Compliance references (ISO-27001, GDPR etc.) |
| `version` | Version number |
| `status` | active, inactive, deprecated |

## Horizontal Catalog

Groups service descriptions into thematic collections.
Each tenant has a default horizontal catalog.

Example: "IT Infrastructure Services" contains:
- Server provisioning
- Network management
- Backup & recovery

## Vertical Catalog (Enterprise)

Customer-specific view of the horizontal catalog:

- Based on a horizontal catalog
- Configurable per customer or industry segment
- Individual services can be overridden (different scope, different SLA)
- Override types: `scope_change`, `pricing_override`, `custom_description`

## Asset-Service Linking

Services can be linked to assets:
```
Asset "web-server-01"
  → Service "Web Hosting (Standard)"
  → Service "SSL Certificate Management"
```

This linking forms the basis for service impact analysis.

## REST API

```
GET    /api/v1/services/descriptions           # Service descriptions
POST   /api/v1/services/descriptions           # Create
GET    /api/v1/services/descriptions/:id        # Detail
PUT    /api/v1/services/descriptions/:id        # Update
GET    /api/v1/services/catalogs/horizontal     # Horizontal catalogs
POST   /api/v1/services/catalogs/horizontal     # Create
GET    /api/v1/services/catalogs/vertical       # Vertical catalogs (Enterprise)
POST   /api/v1/services/catalogs/vertical       # Create
GET    /api/v1/services/catalogs/vertical/:id/effective  # Effective services (with overrides)
```
