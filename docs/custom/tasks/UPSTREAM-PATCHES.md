# Upstream patches

Re-apply after merging `docmost/docmost`. Keep hunks minimal.

| File | Change | Why | Merge risk | Re-apply |
|------|--------|-----|------------|----------|
| `apps/server/src/core/core.module.ts` | `import { TaskModule }` + add to `imports` | Register Nest module | LOW | Add import next to `FavoriteModule` |
| `apps/server/src/database/database.module.ts` | Provide/export `TaskItemRepo`, `TaskAssigneeRepo`, `TaskViewRepo` | Global repos | LOW | Append to providers/exports arrays |
| `apps/server/src/database/types/db.d.ts` | Interfaces + `DB` keys for task tables | Kysely types | MEDIUM | Prefer `migration:codegen` after migrate |
| `apps/server/src/database/types/entity.types.ts` | `TaskItem` / Assignee / View aliases | Selectable helpers | LOW | Append after Base* aliases |
| `apps/client/src/App.tsx` | Routes `/tasks` and `/s/:spaceSlug/tasks` | Router | MEDIUM | Insert under `<Layout>` next to favorites / space home |
| `apps/client/src/lib/app-route.ts` | `TASKS: "/tasks"` | Constant | LOW | One line |
| `apps/client/src/components/layouts/global/global-sidebar.tsx` | Nav item label `"Tasks"` path `/tasks` | Global nav | MEDIUM | Insert after Favorites in `mainNavItems` |
| `apps/client/src/features/space/components/sidebar/space-sidebar.tsx` | Link to `/s/:slug/tasks` | Space nav | MEDIUM | Add UnstyledButton in `menuItems` |
| `apps/client/public/locales/en-US/translation.json` | i18n keys | Labels | LOW | Merge JSON keys |
| `apps/client/public/locales/fr-FR/translation.json` | i18n keys (`"Tasks": "Tâches"`) | Labels | LOW | Merge JSON keys |

## Do not patch

- `global-app-shell.tsx`
- `space.service.ts` / `space.repo.ts`
- CASL factories / ability types
- `ee/**`
- `createSpace` / `deleteSpace` / `deleteUser`
