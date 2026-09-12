# Testing

## Backend (`task.service.spec.ts`)

Cover:

1. Non-member space-scoped → 404 from ability factory
2. Reader read ok; create/update/delete 403
3. Writer create/update ok; delete 403
4. Admin delete + shared Space views ok
5. Global list only accessible spaces
6. assignee=me includes multi-assignee
7. Workspace isolation
8. Progress 0/50/100 ok; -1/101 rejected
9. linkedPage accessible vs null (soft-deleted / ACL / other space)
10. Views: personal global, personal Space, shared Space admin; writer denied shared Space mutate

## Manual UI

- `/tasks` and `/s/:slug/tasks`
- Table / Kanban / DnD status
- Dark mode / mobile overflow
- Reader: no create controls

## Commands

```bash
pnpm --filter ./apps/server test -- task.service.spec
pnpm --filter ./apps/server build
pnpm --filter ./apps/client build
```
