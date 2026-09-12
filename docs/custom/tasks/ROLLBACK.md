# Rollback

Restore Docmost vanilla Tasks-free behaviour (data on `pages` / `spaces` / `users` / `base_*` untouched).

## Application rollback

1. Remove nav entries and routes (`global-sidebar`, `space-sidebar`, `App.tsx`, `app-route.ts`, locale keys).
2. Remove `TaskModule` from `core.module.ts`.
3. Remove Task repos from `database.module.ts`.
4. Remove Task aliases from `entity.types.ts`; regenerate or strip Task interfaces from `db.d.ts`.
5. Drop tables (dev only, after backup):

```sql
DROP TABLE IF EXISTS task_views;
DROP TABLE IF EXISTS task_assignees;
DROP TABLE IF EXISTS task_items;
```

6. Optionally reverse migration: `pnpm --filter ./apps/server migration:down` once.

## Git rollback (before merge)

```bash
git switch redcore/0.95.0   # or prior branch
git branch -D feature/tasks-native-v1
# restore point: tag pre-tasks-native-v1
```

## DB restore (human-only)

Use the pre-migration dump (never auto-restore):

```bash
# example — validate path/size first
pg_restore -l /root/backups/docmost-pre-tasks-YYYYMMDD-HHMMSS.dump
```

## Guarantee

Removing Tasks does not require altering Docmost core tables beyond dropping additive `task_*` tables and reversing the listed upstream hunks.
