# OpsWeave — Soft-Delete Strategy


---

## Principle

Entities that require audit trails or may be referenced by historical records should use **soft-delete** (`is_active = 0`). Junction tables, configuration data, and ephemeral records may use **hard-delete** with referential integrity checks.

---

## Current State (v0.2.x)

### Soft-Delete (is_active = 0)

| Entity | Table | Delete Approach | Notes |
|--------|-------|-----------------|-------|
| **Customers** | `customers` | `is_active = 0` | Checks for open tickets before deactivation. Existing tickets retain the customer reference. |

### Hard-Delete (row removal)

| Entity | Table | Referential Check | Notes |
|--------|-------|-------------------|-------|
| **User Membership** | `tenant_user_memberships` | Self-delete prevented | Removes user from tenant |
| **Group Membership** | `user_group_memberships` | None | Junction table |
| **Assignee Groups** | `assignee_groups` | Cascading (members first) | Removes group + memberships |
| **Assets** | `assets` | Checks linked tickets | CMDB items — consider soft-delete |
| **Asset Relations** | `asset_relations` | None | DAG edges |
| **Tickets (Categories)** | `ticket_categories` | 409 if tickets assigned | Hard-delete only if unused |
| **Workflow Templates** | `workflow_templates` | Checks active instances | Has `is_active` column but hard-deletes |
| **Workflow Steps** | `workflow_steps` | Via template ownership | Cascading with template |
| **Service Descriptions** | `service_descriptions` | Checks catalog references | |
| **Horizontal Catalogs** | `horizontal_catalog` | Checks for items | |
| **Horizontal Catalog Items** | `horizontal_catalog_items` | None | Junction table |
| **Vertical Catalogs** | `vertical_catalogs` | Cascading (overrides first) | Enterprise only |
| **Vertical Overrides** | `vertical_catalog_overrides` | None | |
| **Compliance Frameworks** | `regulatory_frameworks` | Checks requirements | |
| **Compliance Requirements** | `regulatory_requirements` | Checks mappings | |
| **Requirement Mappings** | `requirement_service_mappings` | None | Junction table |
| **Asset Regulatory Flags** | `asset_regulatory_flags` | None | Junction table |
| **SLA Definitions** | `sla_definitions` | Checks assignments | Has `is_active` column but hard-deletes |
| **SLA Assignments** | `sla_assignments` | None | |
| **KB Articles** | `kb_articles` | Removes links first | Uses `status` field, not `is_active` |
| **KB Article Links** | `kb_article_links` | None | Junction table |
| **Email Configs** | `email_inbound_configs` | None | Has `is_active` column but hard-deletes |
| **System Settings** | `system_settings` | None | Global config |

### Tables with `is_active` Column Not Used for Soft-Delete

These tables have the column but currently hard-delete:

- `tenants` — no delete operation implemented
- `users` — no delete operation (membership removal instead)
- `workflow_templates` — hard-delete with instance check
- `sla_definitions` — hard-delete with assignment check
- `email_inbound_configs` — hard-delete

---

## Recommendation

Entities that should migrate to **soft-delete** in a future release:

| Entity | Reason |
|--------|--------|
| **Assets** | CMDB items are referenced by tickets, SLA chains, compliance flags. Hard-delete breaks historical context. |
| **Workflow Templates** | Completed workflow instances reference the template. Soft-delete preserves audit trail. |
| **KB Articles** | Already has `status: 'archived'` — use that instead of hard-delete. |
| **SLA Definitions** | Historical tickets reference SLA tiers. Deactivation is safer than deletion. |
| **Email Configs** | Received messages reference the config. Deactivation preserves message history. |

### Migration Pattern

```typescript
// Instead of:
await db.delete(entity).where(eq(entity.id, id));

// Use:
await db.update(entity).set({ is_active: 0, updated_at: now }).where(eq(entity.id, id));
```

Ensure all list queries filter `WHERE is_active = 1` by default, with an optional `include_inactive` parameter for admin views.
