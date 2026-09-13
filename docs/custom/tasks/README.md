# Native Tasks (Redcore fork)

## Gantt (Project A)

Production Gantt baseline **R24**: see [../gantt/README.md](../gantt/README.md) (`docmost-r24-gantt-ux-prod`).

Independent Tasks **data plane** for Docmost v0.95.0 — parallel to Bases (`task_*` only). Client UI reuses EE Base **presentation** via a Tasks adapter + generic `BaseDataPorts` (see [LICENCE.md](./LICENCE.md)).

## Scope

### V1 (shipped)

- Space-scoped tasks (`workspace_id` + `space_id`)
- Routes `/tasks` and `/s/:spaceSlug/tasks`
- Table + Kanban (status columns)
- Saved views (`task_views`)
- Optional `linked_page_id` with ACL-safe hydration

### V2 (data + ACL)

- Global scope filters: **All / My tasks / Overdue**
- Space-scoped custom properties: `task_properties*`
- `task_views.config.visiblePropertyIds` for card/table display

### Native UI (validated — freeze)

- Lookalike Tasks chrome **deleted**
- `TasksNativeUiAdapter` → Base-shaped props; mutations → Task API only
- `TasksNativeShell` + `BaseTable` / `BaseKanban` / `RowDetailModal` via ports
- Do **not** drop-in `BaseView`; do **not** write `base_*`
- Marker: tag `tasks-native-ui-v2-validated` — see [V2.md](./V2.md)

## KNOWN MINOR GAPS

- View tabs custom (8.5/10) — not refactored in freeze
- Add view CRUD absent
- CSV absent (control hidden)
- person/page cell hydration limited
- Advanced grouping limited
- Dark mode: dedicated re-smoke in packaging freeze

## Out of scope

- AI / MCP tools · File property type · `task_list` · workspace-global views/properties
- Soft-delete · Space create/delete hooks · `TaskAbilityFactory`
- Migrating task data into `base_*`

## Docs

| File | Purpose |
|------|---------|
| [V2.md](./V2.md) | Freeze marker, gaps, scores |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Module layout and data flow |
| [DATABASE.md](./DATABASE.md) | Schema, indexes, CASCADE |
| [PERMISSIONS.md](./PERMISSIONS.md) | ACL mapping |
| [UPSTREAM-PATCHES.md](./UPSTREAM-PATCHES.md) | Upstream + **EE ports** source of truth |
| [ROLLBACK.md](./ROLLBACK.md) | Remove UI / V2 / all Tasks |
| [UI.md](./UI.md) | Native client map |
| [UPGRADE.md](./UPGRADE.md) | Docmost/Base upgrade checklist |
| [EE-IMPORTS.md](./EE-IMPORTS.md) | EE import inventory |
| [LICENCE.md](./LICENCE.md) | EE reuse constraints |
| [VIEWS.md](./VIEWS.md) | Virtual + saved views |
| [TESTING.md](./TESTING.md) | Test matrix |

## Branch / restore

| | V1 | V2 | Native UI freeze |
|--|----|----|------------------|
| Branch | `feature/tasks-native-v1` | `feature/tasks-v2-native-ux` | `redcore/0.95.0` (merged tip) |
| Baseline / marker | `pre-tasks-native-v1` | `pre-tasks-v2` | `tasks-native-ui-v2-validated` |
