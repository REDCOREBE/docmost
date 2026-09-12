# Architecture

## Placement

```
apps/server/src/core/task/          Nest module (controller, service, DTOs)
apps/server/src/database/repos/task/ Kysely repositories
apps/server/src/database/migrations/*-tasks*.ts
apps/client/src/features/tasks/
  adapter/                          TasksNativeUiAdapter (Task ↔ IBase*)
  components/native/                Shell + Table + Kanban + RowDetail Modal
  queries/  services/  types/       Durable Task API client
apps/client/src/pages/tasks/        Route pages
docs/custom/tasks/                  This documentation
```

## Data model (summary)

```
workspaces ──< spaces ──< task_items ──< task_assignees
                 │              │
                 │              ├── linked_page_id? → pages (SET NULL)
                 │              └── task_property_values >── task_properties
                 │                                            └── task_property_options
                 └── task_views (space_id nullable)
```

No `task_list`. No `base_*`. System fields remain columns on `task_items`.

## Client UI (native adapter)

1. Pages load tasks / properties / views via Task React Query.
2. `buildTasksBase` + `mapTaskToBaseRow` produce Base-shaped props for presentation.
3. `TasksNativeShell` provides `BaseDataPorts` and renders `BaseTable` / `BaseKanban` / `RowDetailModal`.
4. User edits → ports → Task mutations only (`cellUpdateToTaskMutation`, etc.).

Synthetic `pageId` = `spaceId` (space Tasks) or `workspace-tasks:<workspaceId>` (global). Never used to call Base APIs.

## Request flow (server)

1. `JwtAuthGuard` + `@AuthUser` + `@AuthWorkspace`
2. List without `spaceId`: SQL `spaceId IN getUserSpaceIdsQuery(userId)`
3. List/mutate with `spaceId`: `SpaceAbilityFactory.createForUser` then CASL Page/Settings checks
4. Optional linked-page hydration after list (never leak inaccessible titles)
5. Custom properties: always `workspaceId` + `spaceId`; values validated for person/page

## Independence (data plane)

- Does **not** read/write `base_rows` / `base_properties` / `base_views`
- Does **not** call `BaseService`
- Does **not** patch `SpaceService` / `createSpace` / `deleteSpace` / `deleteUser`
- Space hard-delete removes tasks + properties via FK `ON DELETE CASCADE`

## Presentation reuse (EE)

- **Allowed under valid EE subscription**: import CSS modules and presentational leaves from `apps/client/src/ee/base/**`
- **Forbidden without legal OK**: public redistribute/sell/sublicense of EE source or factorisation patches
- Prefer Tasks-owned orchestrators over factorising EE ports (lower upgrade conflict)

See [UI.md](./UI.md), [LICENCE.md](./LICENCE.md), [UPGRADE.md](./UPGRADE.md).
