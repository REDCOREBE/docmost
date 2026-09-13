# Gantt architecture (Project A)

## Data planes

### Tasks

| Concern | Detail |
|---------|--------|
| Tables | `task_items`, `task_views`, `task_properties*`, assignees / ACL as in Tasks V1–V2 |
| API | `/api/tasks*` only for Task mutations and lists |
| Views | `task_views.type` ∈ `table` \| `kanban` \| `gantt` |
| Gantt dates | `sys:startDate`, `sys:dueDate` |

### Base

| Concern | Detail |
|---------|--------|
| Tables / schema | Base properties & views on Base pages (`base_properties`, `base_views`, `base_rows`, …) |
| API | `/api/bases*`, `/api/bases/views*`, `/api/bases/properties*`, `/api/bases/rows*` |
| Gantt dates | User date properties (often auto-provisioned as Start / Due) |

### Shared UI

| Component | Role |
|-----------|------|
| `GanttView` | Timeline chrome, bars, milestones, scale |
| `BaseDataPorts` | Generic mutation/read ports used by Base and Tasks adapters |
| `TasksNativeUiAdapter` | Maps Task rows/views → Base-shaped props; **writes Task API only** |

## Critical boundary

```
Tasks surface ──► /api/tasks*     ✅
Tasks surface ──► /api/bases*     ❌ MUST NOT
Base surface  ──► /api/bases*     ✅
```

Quick filters and view switching on `/tasks` must not call Base APIs. Validation cutover confirmed **0** `/api/bases*` on an isolated Tasks session.

## R24 UX contracts

### Card properties → bar metadata

- Toolbar **“Bar fields”** removed
- Bars use `view.config.visiblePropertyIds` (+ property order)
- Legacy `gantt.barPropertyIds` remains **readable** for older views; soft-prefer visible props
- Density: title always; 0–2 meta chips by bar width

### Quick Person / Space (Tasks global)

- URL: `/tasks?assignee=<uuid>&space=<uuid>`
- Does **not** write `task_views`
- Does **not** set dirty / “save for everyone”
- Composes with existing view filters

### Base auto date provisioning

- On Base “+ Gantt”, `planGanttDateProvision` may create missing Start/Due date properties
- Idempotent by name (localized variants)
- Does not delete properties on image rollback

### Full-width / full-height

- `gantt-scale.ts`: `effectivePxPerDay` fills container; horizontal scroll when range is large
- Grid / body continues vertically (full-height polish from R22 retained)

## R26 pointer edit (candidate, not prod)

Rebased R23 WIP onto R24. Shared `GanttView` interactions:

| Gesture | Effect |
|---------|--------|
| Bar drag | start + due +N days (duration preserved) |
| Resize left / right | start only / due only; clamp `start <= due` |
| Milestone drag | start-only / due-only / same-day; never converts to a bar |

Implementation:

- `gantt-edit.ts` — calendar-day math (`Date#setDate`, not +24h)
- `use-gantt-pointer-edit.ts` — preview locally; **one mutation on drop**
- Pixel → day uses the **current** `effectivePxPerDay` (R24 EPMF), captured at pointer-down
- Timeline scale is computed from **committed** rows (`datedRaw`), so a preview cannot retune px/day mid-drag
- Tasks: `updateRowCells` batches `startDate`+`dueDate` into **one** `/api/tasks*` update
- Base: `useUpdateRowMutation` → `/api/bases*`
- Read-only: no grab, no handles, no mutation
- Keyboard date nudging: **not in V1** (handles `tabIndex={-1}`); Enter still opens RowDetail
- No edge auto-scroll during drag (manual scroll still works; `touch-action: none` on the bar)

Does **not** touch `visiblePropertyIds`, `propertyOrder`, quick-filter URL, or `task_views`.

## Principal source files (R24)

```
apps/client/src/ee/base/components/gantt/gantt-view.tsx
apps/client/src/ee/base/components/gantt/base-gantt.tsx
apps/client/src/ee/base/components/gantt/gantt-edit.ts
apps/client/src/ee/base/components/gantt/use-gantt-pointer-edit.ts
apps/client/src/ee/base/components/gantt/gantt-bar-label.ts
apps/client/src/ee/base/components/gantt/gantt-date-provision.ts
apps/client/src/ee/base/components/gantt/gantt-scale.ts
apps/client/src/ee/base/components/views/view-create-menu.tsx
apps/client/src/ee/base/components/kanban/kanban-card-properties.tsx
apps/client/src/features/tasks/components/native/tasks-native-shell.tsx
apps/client/src/features/tasks/components/native/tasks-quick-filters.ts
apps/client/src/features/tasks/components/native/tasks-quick-filters-toolbar.tsx
apps/client/src/features/tasks/adapter/tasks-native-ui-adapter.ts
```

## Independence

Project A must not import or ship Project B (Louise / context-usage) files:

- no `context-usage*`
- no `patch-aichat-context-usage.js`
- no Louise-only locale keys in Gantt commits
