# UI

## Principles

- Same UX language as Docmost (Mantine, Tabler, light-dark tokens)
- **Independent** implementation — do not import `apps/client/src/ee/base/**`
- Do not copy EE CSS (`kanban.module.css`, `grid.module.css`, `choice-color.ts`, row-detail CSS)
- Visual target may be observed from Bases; reimplement tokens under `features/tasks/styles/tasks.module.css`

## Reuse (AGPL / Mantine)

`Drawer`, `Table`, `Badge`, `Progress`, `Tabs`, `Menu`, `ActionIcon`, `ScrollArea`, `Tooltip`, `Popover`, `Select`, `MultiSelect`, `DateInput`, `CustomAvatar`, `EmptyState`, pragmatic-drag-and-drop.

## Own components

Under `apps/client/src/features/tasks/components/`:

- `TasksScopeTabs` — Tout / Mes tâches / En retard (global)
- `TasksViewTabs` — Table / Board
- `TasksToolbar`, `TasksTable`, `TasksKanban` (+ Column/Card)
- `TaskDetailDrawer` — title + system property rows + custom props
- `properties/task-add-property-menu`, `properties/task-property-editors`
- Badges/avatars/due/progress helpers

Legacy `task-editor-modal.tsx` is unused in V2 (kept only if referenced; prefer drawer).

## Kanban target

- Columns ~280px, radius ~10px, soft gray background (no heavy outer border)
- Header: status dot, title, count, `+`, `…`
- Cards: radius ~8px, light border, subtle shadow, padding ~12px
- Footer: + New task
- DnD independent; disabled without write permission

## Detail drawer target

- Top bar: prev/next, `…`, close; Esc closes
- Large editable title
- Rows: `[icon] [label ~180px] [value]`
- System props from `task_items` (not EAV)
- `+ Ajouter une propriété` (Manage Settings)

## Status labels (FR via i18n)

- todo → À faire
- in_progress → En cours
- done → Terminé

## Sidebar label

Always **"Tasks"** / **"Tâches"**. Global default scope tab = **Tout**.
