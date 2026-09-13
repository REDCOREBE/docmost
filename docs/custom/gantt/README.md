# Gantt / Tasks native views (Project A)

**CURRENT PROD BASELINE = R24**

Project A covers Docmost **Gantt** and related **Tasks** native UI (Table / Kanban / Gantt).  
It is **distinct** from Project B (Louise / AI context-usage indicator). Do not mix branches, commits, docs, images, or rollbacks.

## Objective

Provide a production-grade Gantt timeline for:

- Global and space-scoped **Tasks** (`task_*` + `/api/tasks*`)
- **Base** pages (`base_*` + `/api/bases*`) using the same shared Gantt UI

Storage planes stay independent. The UI is shared; mutations are not.

## Relation to Tasks

- Tasks render Gantt via `TasksNativeUiAdapter` + `BaseDataPorts` into shared `GanttView`
- Task dates use system properties (`sys:startDate`, `sys:dueDate`)
- Saved views live in `task_views` (types: `table` | `kanban` | `gantt`)
- Quick Person / Space filters on `/tasks` are **URL-only** (not persisted in `task_views`)

## Relation to Base

- Base Gantt uses Base date properties and Base view config
- Creating a Base Gantt may **auto-provision** `Start date` / `Due date` (localized) when missing
- Software rollback of the R24 image does **not** delete those properties

## Architecture (summary)

| Plane | Storage | API | UI |
|-------|---------|-----|----|
| Tasks | `task_*` | `/api/tasks*` | Native shell + ports |
| Base | `base_*` / page Base schema | `/api/bases*` | Base views |
| Shared | — | — | `GanttView`, bar labels, scale |

**Critical rule:** Tasks **MUST NOT** mutate through `/api/bases*`.

Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Feature surface (R24)

- Views: Table, Kanban, Gantt
- Milestones (single-day / zero-duration bars)
- Card / visible properties → bar metadata (`visiblePropertyIds`; legacy `gantt.barPropertyIds` still readable)
- Quick filters: `/tasks?assignee=<id>&space=<id>`
- Base auto date provisioning on first Gantt create
- Full-width timeline (`effectivePxPerDay` / ResizeObserver)
- Full-height grid fill

## Production baseline

| Field | Value |
|-------|-------|
| Tag | `docmost-r24-gantt-ux-prod` |
| Commit | see [RELEASES.md](./RELEASES.md) |
| IMAGE | `redcore-docmost-c2:0.95.0-r24-gantt-ux-test` |
| DIGEST | `sha256:4d3badc239478f641993f2c52950d4ab8d0eb099ce1b70a31a193c4ca1e4250a` |
| Previous rollback image | `redcore-docmost-c2:0.95.0-r22-gantt-polish-final` |
| R23 drag/resize | **NOT DEPLOYED** — rebase onto R24 later ([R23-REBASE-PLAN.md](./R23-REBASE-PLAN.md)) |

Cutover validation: [VALIDATION.md](./VALIDATION.md)  
Rollback: [ROLLBACK.md](./ROLLBACK.md)  
Upgrade notes: [UPGRADE-NOTES.md](./UPGRADE-NOTES.md)

## Related docs

- Tasks module: [../tasks/README.md](../tasks/README.md)
- Ops packaging notes may also exist under `/opt/docmost/docs/customizations/` (host ops tree; not a substitute for this Git baseline)
