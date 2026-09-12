# Native Tasks (Redcore fork)

Independent Tasks module for Docmost v0.95.0. Parallel to Bases — **no** dependency on `base_*` or `apps/client/src/ee/base/**`.

## Scope (V1)

- Space-scoped tasks (`workspace_id` + `space_id`)
- Global “My tasks” at `/tasks` (default filter: assignee = me)
- Space UI at `/s/:spaceSlug/tasks`
- Table + Kanban (status columns)
- Saved views (`task_views`)
- Optional `linked_page_id` with ACL-safe hydration

## Out of scope (V1)

- AI / MCP tools
- `task_list` / `task_statuses` tables
- Shared workspace-global views
- Soft-delete / trash for tasks
- Hooks on Space create/delete or user delete
- `TaskAbilityFactory` / CASL subject `Task`

## Docs

| File | Purpose |
|------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Module layout and data flow |
| [DATABASE.md](./DATABASE.md) | Schema, indexes, CASCADE |
| [PERMISSIONS.md](./PERMISSIONS.md) | ACL mapping |
| [UPSTREAM-PATCHES.md](./UPSTREAM-PATCHES.md) | Exact upstream touchpoints |
| [ROLLBACK.md](./ROLLBACK.md) | How to remove Tasks cleanly |
| [UI.md](./UI.md) | Client components / tokens |
| [VIEWS.md](./VIEWS.md) | Virtual + saved views |
| [AI.md](./AI.md) | Future AI (not implemented) |
| [TESTING.md](./TESTING.md) | Test matrix |

## Branch / restore

- Branch: `feature/tasks-native-v1`
- Tag before work: `pre-tasks-native-v1`
