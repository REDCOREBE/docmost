# Rollback

## Tags / branches

| Tag | Meaning |
|-----|---------|
| `pre-tasks-native-v1` | Before Tasks V1 |
| `pre-tasks-v2` | Before Tasks V2 (on `feature/tasks-v2-native-ux`) |

```bash
git diff pre-tasks-v2..feature/tasks-v2-native-ux --stat
```

## Remove V2 only (keep V1 Tasks)

1. Revert client V2 UI (drawer, scope tabs, property editors) or checkout V1 feature tip.
2. Remove property endpoints from `task.controller.ts` / methods from `task.service.ts`.
3. Remove `TaskProperty*Repo` from `database.module.ts`.
4. Remove V2 types from `db.d.ts` / `entity.types.ts`.
5. Drop V2 tables:

```sql
DROP TABLE IF EXISTS task_property_values;
DROP TABLE IF EXISTS task_property_options;
DROP TABLE IF EXISTS task_properties;
DELETE FROM kysely_migration WHERE name = '20260912T120000-task-properties';
```

## Remove Tasks entirely

1. Remove nav + routes (`App.tsx`, `app-route.ts`, global-sidebar, space-sidebar, locale keys).
2. Remove `TaskModule` from `core.module.ts`.
3. Remove all task repos from `DatabaseModule`.
4. Remove Task* types from `entity.types.ts` and `db.d.ts`.
5. Drop all `task_*` tables (order matters):

```sql
DROP TABLE IF EXISTS task_property_values;
DROP TABLE IF EXISTS task_property_options;
DROP TABLE IF EXISTS task_properties;
DROP TABLE IF EXISTS task_views;
DROP TABLE IF EXISTS task_assignees;
DROP TABLE IF EXISTS task_items;
DELETE FROM kysely_migration WHERE name IN (
  '20260912T120000-task-properties',
  '20260912T074500-tasks'
);
```

## Confirmed intact after Tasks work

- `pages`
- `spaces`
- `users`
- `base_*`

Space hard-delete remains CASCADE via FK — no `SpaceService` change.

## DB backup (this environment)

- Path: `/root/backups/docmost-pre-tasks-20260912-074455.dump`
- Restore requires **explicit human approval** — never auto-restore.
