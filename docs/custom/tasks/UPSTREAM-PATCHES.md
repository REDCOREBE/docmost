# Upstream patches (Tasks) — source of truth

Every modified **upstream** file for the native Tasks module (V1 + V2 + Native UI ports).

| File | Hunk / change | Reason | Merge risk | Re-apply after Docmost upgrade |
|------|---------------|--------|------------|--------------------------------|
| `apps/server/src/core/core.module.ts` | Import + register `TaskModule` | Wire Nest module | Low | Re-add import + `TaskModule` |
| `apps/server/src/database/database.module.ts` | Provide/export Task* repos (V1: 3, V2: +3 property repos) | DI | Low | Re-add providers/exports |
| `apps/server/src/database/types/db.d.ts` | TaskItems/Assignees/Views + V2 TaskProperties/Options/Values + `DB` keys | Kysely types | Medium (codegen) | `migration:codegen` or re-insert interfaces |
| `apps/server/src/database/types/entity.types.ts` | Task* Selectable aliases (V1+V2) | Manual aliases | Low | Re-add aliases + imports |
| `apps/client/src/App.tsx` | Routes `/tasks`, `/s/:spaceSlug/tasks` | Routing | Low | Re-add routes |
| `apps/client/src/lib/app-route.ts` | `TASKS: "/tasks"` | Constant | Low | Re-add key |
| `apps/client/src/components/layouts/global/global-sidebar.tsx` | Nav item Tasks | Global nav | Low | Re-add nav item |
| `apps/client/src/features/space/components/sidebar/space-sidebar.tsx` | Link to space tasks | Space nav | Low | Re-add menu button |
| `apps/client/public/locales/en-US/translation.json` | Tasks (+ V2 + Kanban label) i18n keys | EN | Low | Merge JSON keys |
| `apps/client/public/locales/fr-FR/translation.json` | Tasks (+ V2 + Kanban label) i18n keys | FR | Low | Merge JSON keys |

## Intentionally untouched (data / ACL)

- `apps/server/src/core/casl/**`
- `SpaceService` / createSpace / deleteSpace / deleteUser
- All `base_*` tables and `BaseService` mutations from Tasks

## EE BaseDataPorts — exact port list

Defined in `apps/client/src/ee/base/context/base-data-ports.tsx`.

| Port | Purpose |
|------|---------|
| `deleteRows` | Bulk/selection deletes |
| `persistViewConfig` | View layout / filter / sort / kanban config patches |
| `createProperty` | Create property from native popover |
| `disableSchemaMutations` | Hide rename/type/delete property menus |
| `filterRows` | KanbanColumn rows without `useBaseRowsQuery` |
| `createKanbanCard` | Column `+` / New card |
| `moveKanbanCard` | Pragmatic DnD card move |
| `openRow` | Open row detail (Tasks-owned state) |
| `updateRowCells` | RowDetailModal cell commits |
| `deleteRow` | RowDetailModal delete |
| `getRow` | Deep-link fetch when row not in list |
| `addRowLabel` | Table footer label override |
| `addCardLabel` | Kanban add-card label override |

**Rule:** ports are generic. No `features/tasks` imports inside `ee/base`. When ports are absent, Base default path is unchanged.

## EE patches (detail)

| File | Reason | Default (no ports) | With Tasks ports | Upgrade risk | Rollback |
|------|--------|--------------------|------------------|--------------|----------|
| `context/base-data-ports.tsx` | **NEW** ports context | Provider unused; hooks return null | Tasks supplies ports | Low (new file) | Delete file + unwire consumers |
| `hooks/use-delete-selected-rows.tsx` | Prefer `deleteRows` | Base deleteRows API | Task deletes | Low | Revert prefer branch |
| `hooks/use-base-table.ts` | Prefer `persistViewConfig` | `useUpdateViewMutation` | Task view update | Low | Revert prefer branch |
| `queries/base-row-query.ts` | `enabled` on rows query; get/update/delete prefer ports | Base list/info/update/delete | Tasks filterRows / getRow / updateRowCells / deleteRow | Medium | Revert port branches |
| `queries/base-view-query.ts` | Prefer `persistViewConfig` | `updateView` Base API | Task view config | Low | Revert prefer branch |
| `property/create-property-popover.tsx` | Prefer `createProperty` | Base createProperty | Task property create | Low | Revert prefer branch |
| `grid/grid-header.tsx` | `disableSchemaMutations` / create port | Schema menus on | Menus suppressed / port create | Low | Revert |
| `grid/grid-header-cell.tsx` | Suppress schema menus | Menus on | Menus off | Low | Revert |
| `grid/add-row-button.tsx` | Optional `label` | i18n "New row" | "New task" | Trivial | Revert |
| `grid/grid-container.tsx` | Pass `addRowLabel` | unchanged | label forwarded | Trivial | Revert |
| `base-table.tsx` | Pass `addRowLabel` | unchanged | label forwarded | Trivial | Revert |
| `kanban/kanban-add-card-button.tsx` | Optional `label` | i18n "New row" | "New task" | Trivial | Revert |
| `kanban/kanban-column.tsx` | `filterRows` / `createKanbanCard`; skip Base query | `useBaseRowsQuery` + create mutation | Injected rows/create | Medium | Revert |
| `kanban/base-kanban.tsx` | `moveKanbanCard` / `openRow` / persist | Base move + URL row modal | Task move + shell open | Medium | Revert |
| `kanban/kanban-column-title.tsx` | `disableSchemaMutations` | Rename enabled | Rename disabled | Low | Revert |
| `kanban/kanban-column-menu.tsx` | Hide Edit property | Full menu | Hide only | Low | Revert |
| `kanban/kanban-empty-state.tsx` | Prefer create port; hide when schema disabled | Base create status | Task create / message | Low | Revert |
| `row-detail-modal/property-row.tsx` | `disableSchemaMutations` | Property menu on label | Static label | Low | Revert |

## Upgrade Docmost strategy

1. Merge/rebase onto new upstream tag on `redcore/x.y`.
2. Re-apply the tables above (module wiring + locales + EE ports).
3. Keep fork-only trees (`features/tasks/**`, `pages/tasks/**`, `docs/custom/tasks/**`).
4. Re-check [EE-IMPORTS.md](./EE-IMPORTS.md) / [UPGRADE.md](./UPGRADE.md).
5. Run `migration:latest` (V1 + V2 additive).
6. Smoke `/tasks` + space tasks + Bases regression + confirm **0 `/api/bases*`** from Tasks.
