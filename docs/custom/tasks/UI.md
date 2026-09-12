# UI — Native Docmost Base presentation

## Principles

- **Visual fidelity**: reuse EE Base **presentation leaves + CSS modules**.
- **Data isolation**: never call `BaseService` / `base_*`. Mutations → Task API via `BaseDataPorts`.
- **No drop-in `BaseView`**: Tasks owns the orchestrator shell; injects ports into native Base components.
- Licence: see [LICENCE.md](./LICENCE.md).

## Architecture

```
pages/tasks/*  →  TasksNativeShell (+ BaseDataPortsProvider)
                    ├─ BaseTable (table)
                    ├─ BaseKanban / KanbanColumn (kanban, Pragmatic DnD)
                    └─ RowDetailModal (+ CreatePropertyPopover)
                         ↑
              TasksNativeUiAdapter (IBase* shapes) + ports → /api/tasks*
```

| Layer | Path | Role |
|-------|------|------|
| Adapter | `features/tasks/adapter/tasks-native-ui-adapter.ts` | Task ↔ `IBase*`; `filterTaskRows`; type snake↔camel |
| Shell | `…/tasks-native-shell.tsx` | View tabs + Filter/Sort/Visibility + Group-by + Card properties + ports |
| Table | `…/tasks-native-table.tsx` | Native `BaseTable` / `useBaseTable` |
| Kanban | `…/tasks-native-kanban.tsx` | Thin wrapper → `BaseKanban` |
| Detail | EE `RowDetailModal` | Native modal; Task mutations via ports |

## Deleted lookalike UI

`tasks-table`, `tasks-kanban`, `task-detail-drawer`, `tasks-toolbar`, custom `task-row-detail-modal`, etc.

## Routes

| Route | Behaviour |
|-------|-----------|
| `/s/:spaceSlug/tasks` | Native shell; create untitled + open detail |
| `/tasks` | Same + scope tabs All / My tasks / Overdue |

## Known gaps (KNOWN MINOR GAPS)

| Gap | Class | Blocker? |
|-----|-------|----------|
| View tabs custom (not data-bound `ViewTabs`) — **8.5/10** | visuelle | no |
| Add view `+` without CRUD | fonctionnel | no |
| CSV export absent (contrôle masqué) | fonctionnel | no |
| person/page cell hydration limited | fonctionnel | no |
| Advanced grouping beyond status/select | fonctionnel | no |
| Dark mode — dedicated re-smoke in packaging freeze (target ≥ 9.5) | visuelle | soft |
| `/api/bases` from `CellPage` | mitigated (`pageId: ""`) | watch |

See also [V2.md](./V2.md) freeze marker + ports in [UPSTREAM-PATCHES.md](./UPSTREAM-PATCHES.md).

## Status labels (FR via i18n)

- todo → À faire · in_progress → En cours · done → Terminé

## Sidebar

Always **"Tasks"** / **"Tâches"**. Global default scope = **All**.
