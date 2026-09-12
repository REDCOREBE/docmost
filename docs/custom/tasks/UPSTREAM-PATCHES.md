# Upstream patches (Tasks V1)

Every modified upstream file for the native Tasks module.

| File | Hunk / change | Reason | Merge risk | Re-apply |
|------|---------------|--------|------------|----------|
| `apps/server/src/core/core.module.ts` | Import + register `TaskModule` next to `FavoriteModule` | Wire Nest module | Low | Re-add import + `TaskModule` in `imports` |
| `apps/server/src/database/database.module.ts` | Import/provide/export `TaskItemRepo`, `TaskAssigneeRepo`, `TaskViewRepo` | DI for repos | Low | Re-add three providers/exports |
| `apps/server/src/database/types/db.d.ts` | Add `TaskItems`, `TaskAssignees`, `TaskViews` + `DB` keys | Kysely types (normally via `migration:codegen`) | Medium (codegen overwrite) | Re-run `pnpm --filter ./apps/server migration:codegen` after migrate, or re-insert interfaces |
| `apps/server/src/database/types/entity.types.ts` | Add Task* Selectable/Insertable/Updateable aliases | Manual entity aliases | Low | Re-add aliases + imports |
| `apps/client/src/App.tsx` | Routes `/tasks` and `/s/:spaceSlug/tasks` | Client routing | Low | Re-add imports + `<Route>` entries under `<Layout>` |
| `apps/client/src/lib/app-route.ts` | `TASKS: "/tasks"` | Route constant | Low | Re-add key |
| `apps/client/src/components/layouts/global/global-sidebar.tsx` | Nav item Tasks between Favorites and Spaces | Global nav | Low | Re-add `IconChecklist` + nav item |
| `apps/client/src/features/space/components/sidebar/space-sidebar.tsx` | Space menu link to `/s/:slug/tasks` | Space nav | Low | Re-add checklist menu button |
| `apps/client/public/locales/en-US/translation.json` | Tasks-related i18n keys | EN copy | Low | Merge JSON keys |
| `apps/client/public/locales/fr-FR/translation.json` | Tasks-related i18n keys | FR copy | Low | Merge JSON keys |

## Intentionally untouched

- `apps/client/src/components/layouts/global/global-app-shell.tsx`
- `apps/server/src/core/casl/**`
- `SpaceService` / createSpace / deleteSpace / deleteUser
- `apps/client/src/ee/base/**` and all `base_*` tables
- EE CSS (`kanban.module.css`, `grid.module.css`, `choice-color.ts`)

## New files (fork-only, not upstream patches)

See `docs/custom/tasks/README.md` — `apps/server/src/core/task/**`, `apps/server/src/database/repos/task/**`, migration `20260912T074500-tasks.ts`, `apps/client/src/features/tasks/**`, `apps/client/src/pages/tasks/**`.
