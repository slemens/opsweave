# Capacity Planning

OpsWeave provides integrated capacity planning directly linked to the CMDB. It shows at a glance how utilized your infrastructure is and which devices consume which resources.

## Concept

Every asset can **provide** capacity (e.g. a server provides CPU cores) or **consume** capacity (e.g. a VM consumes CPU cores from a host). Consumption relationships are automatically resolved via CMDB relations.

**Example:** A DC rack provides 42 rack units. Servers in the rack (`member_of` relation) each consume 2U. OpsWeave automatically calculates the utilization.

## Capacity Types

Capacity types define which resources are managed. Default types:

| Type | Unit | Category |
|------|------|----------|
| CPU Cores | cores | Compute |
| RAM | GB | Memory |
| Storage | GB | Storage |
| Rack Units | U | Infrastructure |
| Power | W | Infrastructure |
| Bandwidth | Mbps | Network |
| Ports | count | Network |
| IOPS | IOPS | Storage |

Custom capacity types can be created under **Settings → Capacity Types**.

## Utilization Overview

The main view under **Capacity Planning** shows all assets with capacities as a card grid. Each card shows:

- Asset name and type
- Capacity bar per type (color-coded: green < 70%, yellow < 85%, red ≥ 85%)
- Allocated / total and available capacity

Click a card to open the asset's **detail page**.

## Detail Page

The detail page shows per capacity type:

- **Summary**: Total capacity, allocated, available, utilization percentage with status badge
- **Consumer table**: Which devices consume how much, with relation type, absolute consumption, and percentage share
- **Tracked vs. untracked**: Summary of tracked consumption vs. manual allocations

## Compatibility Check

Find the best host for a new workload:

1. Select required resources (e.g. 4 CPU cores + 16 GB RAM)
2. OpsWeave shows all hosts with sufficient free capacity
3. Sorted by fit score (how well the workload matches the host)

## Migration Check

Check whether an existing workload can be migrated to another host:

1. Select source workload and target host
2. OpsWeave compares required resources with available capacity
3. Result: feasible/not feasible with detailed breakdown per resource type

## Overprovisioned Detection

Identify assets with low utilization:

- Configurable threshold (default: 30%)
- Shows all assets whose utilization falls below the threshold
- Helps with consolidation and cost reduction

## Asset-Level Capacity

In the **Asset Detail** under the **Capacity** tab you can:

- Add new capacities (provides/consumes)
- Edit existing values (total, allocated, reserved)
- Adjust auto-synced entries (from relations)
- Delete capacity entries (except auto-synced)

## REST API

```
# Capacity Types
GET    /api/v1/capacity/types
POST   /api/v1/capacity/types
PUT    /api/v1/capacity/types/:id
DELETE /api/v1/capacity/types/:id

# Asset Capacities
GET    /api/v1/capacity/assets/:id
POST   /api/v1/capacity/assets/:id
DELETE /api/v1/capacity/assets/:id/:cid
GET    /api/v1/capacity/assets/:id/utilization
GET    /api/v1/capacity/assets/:id/consumers/:capacityTypeId

# Capacity Planning
GET    /api/v1/capacity/utilization
GET    /api/v1/capacity/compatible?requirements=[...]
GET    /api/v1/capacity/migration-check?workload=:id&target=:id
GET    /api/v1/capacity/overprovisioned?threshold=30
```
