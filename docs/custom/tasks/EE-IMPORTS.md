# EE import inventory (Tasks native UI)

**EE file edits:** see [UPSTREAM-PATCHES.md](./UPSTREAM-PATCHES.md) (full port table). Bases path unchanged when ports absent.

## Ports (exact)

`deleteRows`, `persistViewConfig`, `createProperty`, `disableSchemaMutations`, `filterRows`, `createKanbanCard`, `moveKanbanCard`, `openRow`, `updateRowCells`, `deleteRow`, `getRow`, `addRowLabel`, `addCardLabel`.

## Adapter

| Import | File |
|--------|------|
| `IBase*`, `ViewConfig`, types | `features/tasks/adapter/tasks-native-ui-adapter.ts` |

## Shell / toolbar

| Import | Module |
|--------|--------|
| `ViewFilterConfigPopover` | `views/view-filter-config` |
| `ViewSortConfigPopover` | `views/view-sort-config` |
| `ViewPropertyVisibility` | `views/view-property-visibility` |
| `KanbanGroupByPicker` | `kanban/kanban-group-by-picker` |
| `KanbanCardProperties` | `kanban/kanban-card-properties` |
| `BaseEditableProvider` | `context/base-editable` |
| `BaseDataPortsProvider` | `context/base-data-ports` |
| CSS | `grid.module.css`, `base-toolbar.module.css` |

## Table

| Import | Module |
|--------|--------|
| `BaseTable` | `components/base-table` |
| `useBaseTable` | `hooks/use-base-table` |
| `RowExpandProvider` | `context/row-expand` |

## Kanban

| Import | Module |
|--------|--------|
| `BaseKanban` | `kanban/base-kanban` |
| (+ via BaseKanban) `KanbanColumn`, `KanbanColumnHeader`, `KanbanCard`, Pragmatic DnD | |

## Row detail

| Import | Module |
|--------|--------|
| `RowDetailModal` | `row-detail-modal/row-detail-modal` |
| `CreatePropertyPopover` (inside modal) | `property/create-property-popover` |

## Explicitly NOT used for Tasks data

- `BaseView` / full `BaseToolbar` / data-bound `ViewTabs` (shell composes leaves)
- `exportBaseToCsv` (unsupported — control hidden)
- Default Base React Query when `BaseDataPorts` provided
