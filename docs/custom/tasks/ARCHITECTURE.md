# Architecture

## Placement

```
apps/server/src/core/task/          Nest module (controller, service, DTOs)
apps/server/src/database/repos/task/ Kysely repositories
apps/server/src/database/migrations/*-tasks*.ts
apps/client/src/features/tasks/     UI, queries, services
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

## Request flow

1. `JwtAuthGuard` + `@AuthUser` + `@AuthWorkspace`
2. List without `spaceId`: SQL `spaceId IN getUserSpaceIdsQuery(userId)`
3. List/mutate with `spaceId`: `SpaceAbilityFactory.createForUser` then CASL Page/Settings checks
4. Optional linked-page hydration after list (never leak inaccessible titles)
5. Custom properties: always `workspaceId` + `spaceId`; values validated for person/page

## Independence

- Does not import `ee/base`
- Does not read/write `base_rows` / `base_properties` / `base_views`
- Does not patch `SpaceService` / `createSpace` / `deleteSpace` / `deleteUser`
- Space hard-delete removes tasks + properties via FK `ON DELETE CASCADE`
