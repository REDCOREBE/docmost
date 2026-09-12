# Rollback

Guaranteed rollback **before merge** of `feature/tasks-native-v1`:

```bash
git switch <branche_initiale>   # e.g. redcore/0.95.0
git branch -D feature/tasks-native-v1
```

Baseline tag (do not move):

```text
pre-tasks-native-v1
```

Diff from baseline:

```bash
git diff pre-tasks-native-v1..feature/tasks-native-v1 --stat
```

## Application rollback (post-deploy / post-merge)

1. Remove nav + routes (`App.tsx`, `app-route.ts`, global-sidebar, space-sidebar, locale keys).
2. Remove `TaskModule` from `core.module.ts`.
3. Remove task repos from `DatabaseModule`.
4. Remove Task aliases/types from `entity.types.ts` and `db.d.ts` (or re-codegen after dropping tables).
5. Drop tables (dev/staging only unless explicitly approved):

```sql
DROP TABLE IF EXISTS task_views;
DROP TABLE IF EXISTS task_assignees;
DROP TABLE IF EXISTS task_items;
DELETE FROM kysely_migration WHERE name = '20260912T074500-tasks';
```

Or migration down:

```bash
pnpm --filter ./apps/server migration:down
```

## Confirmed intact after Tasks work

- `pages`
- `spaces`
- `users`
- `base_*`

Space hard-delete remains CASCADE via FK — no `SpaceService` change.

## DB backup (this environment)

Created before migration:

- Path: `/root/backups/docmost-pre-tasks-20260912-074455.dump`
- Format: `pg_dump -Fc`
- Target (non-secret): host=`db` (compose), port=`5432`, database=`docmost`, user=`docmost`
- Restore requires **explicit human approval** — never auto-restore.

```bash
# verify listing
docker cp /root/backups/docmost-pre-tasks-20260912-074455.dump docmost-db-1:/tmp/docmost-pre-tasks.dump
docker exec docmost-db-1 pg_restore -l /tmp/docmost-pre-tasks.dump | wc -l
```
