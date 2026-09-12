# Native Tasks (Redcore fork)

Independent Tasks module for Docmost v0.95.0. Parallel to Bases — **no** dependency on `base_*` or `apps/client/src/ee/base/**`.

## Scope

### V1 (shipped)

- Space-scoped tasks (`workspace_id` + `space_id`)
- Routes `/tasks` and `/s/:spaceSlug/tasks`
- Table + Kanban (status columns)
- Saved views (`task_views`)
- Optional `linked_page_id` with ACL-safe hydration

### V2 (this branch)

- Global scope tabs: **Tout / Mes tâches / En retard** (default Tout)
- Native-like Kanban + `TaskDetailDrawer` (AGPL/Mantine only)
- Space-scoped custom properties: `task_properties*`
- `task_views.config.visiblePropertyIds` for card/table display

See [V2.md](./V2.md).

## Out of scope

- AI / MCP tools
- File property type
- `task_list` / dynamic status tables
- Shared workspace-global views / workspace-global properties
- Soft-delete / trash for tasks
- Hooks on Space create/delete or user delete
- `TaskAbilityFactory` / CASL subject `Task`
- Any `ee/base` import or copy

## Docs

| File | Purpose |
|------|---------|
| [V2.md](./V2.md) | V1 vs V2 summary |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Module layout and data flow |
| [DATABASE.md](./DATABASE.md) | Schema, indexes, CASCADE |
| [PERMISSIONS.md](./PERMISSIONS.md) | ACL mapping |
| [UPSTREAM-PATCHES.md](./UPSTREAM-PATCHES.md) | Exact upstream touchpoints (**source of truth**) |
| [ROLLBACK.md](./ROLLBACK.md) | Remove V2 only or Tasks entirely |
| [UI.md](./UI.md) | Client components / tokens |
| [VIEWS.md](./VIEWS.md) | Virtual + saved views |
| [AI.md](./AI.md) | Future AI (not implemented) |
| [TESTING.md](./TESTING.md) | Test matrix |

## Branch / restore

| | V1 | V2 |
|--|----|----|
| Branch | `feature/tasks-native-v1` | `feature/tasks-v2-native-ux` |
| Baseline tag | `pre-tasks-native-v1` | `pre-tasks-v2` |
