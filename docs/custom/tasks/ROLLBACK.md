# Rollback

## Tags / branches

| Tag | Meaning |
|-----|---------|
| `pre-tasks-native-v1` | Before Tasks V1 |
| `pre-tasks-v2` | Before Tasks V2 |
| `tasks-native-ui-v2-validated` | Source freeze: native UI ports validated (do not move) |

```bash
git show tasks-native-ui-v2-validated --stat
git diff tasks-native-ui-v2-validated^..tasks-native-ui-v2-validated --stat
```

## Packaging rollback (ops)

| Image | Role |
|-------|------|
| `redcore-docmost-c2:0.95.0-r15-final` | Current prod baseline (pre native-UI cutover) |
| `redcore-docmost-c2:0.95.0-r16-native-ui-test` | Intermediate smoke — do not promote |
| `redcore-docmost-c2:0.95.0-r16-native-ui-final` | Candidate package for cutover |

Cutover reverse: point compose back to `r15-final`, recreate app container only (same DB). No `task_*` drop required for UI rollback.

## UI-only rollback (keep Task API + `task_*`)

1. Revert `apps/client/src/features/tasks/adapter/` and `components/native/`.
2. Revert EE `BaseDataPorts` patches listed in [UPSTREAM-PATCHES.md](./UPSTREAM-PATCHES.md).
3. Restore previous Tasks pages wiring if needed.
4. No DB change.

## Remove V2 only (keep V1 Tasks)

1. Revert native UI / V2 client (or checkout V1 feature tip).
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

- `pages` · `spaces` · `users` · `base_*`

Space hard-delete remains CASCADE via FK — no `SpaceService` change.

## DB backup (this environment)

- Path: `/root/backups/docmost-pre-tasks-20260912-074455.dump`
- Restore requires **explicit human approval** — never auto-restore.
