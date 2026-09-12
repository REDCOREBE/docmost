# Testing

## Backend (`task.service.spec.ts`)

### V1

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

### V2

11. Global list filters: all / me / overdue (ACL unchanged)
12. Admin create property ok; writer create property 403
13. Writer set value ok; reader set value 403
14. Property Space A not applicable to task in Space B
15. Delete property calls repo (DB CASCADE values/options)
16. Person outside Space rejected
17. Page outside Space / inaccessible rejected
18. Type roundtrips: text, long_text, number, date
19. Migration V2 drop order contract

## Manual UI

- `/tasks` scope tabs + Space filter + Space badge on rows/cards
- Table / Kanban / DnD status / + New task in column
- Drawer Esc, system rows, add property (admin)
- Dark mode / mobile overflow
- Reader: open read-only; no create / no add property

## Commands

```bash
pnpm --filter ./apps/server test -- task.service.spec
pnpm --filter ./apps/server build
pnpm --filter ./apps/client build
git diff --check
```
