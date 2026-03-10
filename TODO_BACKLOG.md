# OpsWeave — TODO Backlog

Collected from source code TODOs. Referenced in code as `// See TODO_BACKLOG.md#XX`.

---

## TODO-01: Mount remaining module routes

- **Origin:** `packages/backend/src/routes/index.ts:60`
- **Description:** Monitoring module routes are not mounted yet. The monitoring module (Check_MK v1/v2, Zabbix, Prometheus integration) is planned for Phase 6 but not yet implemented.
- **Priority:** High (C-01 in AUDIT_RESULTS.md)
- **Action:** Implement the monitoring module or remove the monitoring nav entry and document as "Planned".
