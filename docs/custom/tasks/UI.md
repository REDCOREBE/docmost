# UI

## Principles

- Same UX language as Docmost (Mantine, Tabler, light-dark tokens)
- **Independent** implementation — do not import `apps/client/src/ee/base/**`
- Do not copy EE CSS (`kanban.module.css`, `grid.module.css`, `choice-color.ts`)

## Reuse (AGPL / Mantine)

`Table`, `Badge`, `Progress`, `Tabs`, `Menu`, `ActionIcon`, `ScrollArea`, `Tooltip`, `UnstyledButton`, `CustomAvatar`, `EmptyState`, sidebar `.menu` / `.link` classes.

## Own components

Under `apps/client/src/features/tasks/components/`:

TasksViewTabs, TasksToolbar, TasksTable, TasksKanban (+ Column/Card), TasksProgressBar, TasksPriorityBadge, TasksDueDate, TasksAssigneeAvatars, TasksLinkedPageIcon, Task editor modal.

## Status labels (FR via i18n)

- todo → À faire
- in_progress → En cours
- done → Terminé

## Sidebar label

Always **"Tasks"** / **"Tâches"** (not “My Tasks”). Default global filter may still be assignee=me.
