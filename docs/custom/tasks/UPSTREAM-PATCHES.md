# Upstream patches (Tasks) — source of truth

Every modified **upstream** file for the native Tasks module (V1 + V2).

| File | Hunk / change | Reason | Merge risk | Re-apply after Docmost upgrade |
|------|---------------|--------|------------|--------------------------------|
| `apps/server/src/core/core.module.ts` | Import + register `TaskModule` | Wire Nest module | Low | Re-add import + `TaskModule` |
| `apps/server/src/database/database.module.ts` | Provide/export Task* repos (V1: 3, V2: +3 property repos) | DI | Low | Re-add providers/exports |
| `apps/server/src/database/types/db.d.ts` | TaskItems/Assignees/Views + V2 TaskProperties/Options/Values + `DB` keys | Kysely types | Medium (codegen) | `migration:codegen` or re-insert interfaces |
| `apps/server/src/database/types/entity.types.ts` | Task* Selectable aliases (V1+V2) | Manual aliases | Low | Re-add aliases + imports |
| `apps/client/src/App.tsx` | Routes `/tasks`, `/s/:spaceSlug/tasks` | Routing | Low | Re-add routes |
| `apps/client/src/lib/app-route.ts` | `TASKS: "/tasks"` | Constant | Low | Re-add key |
| `apps/client/src/components/layouts/global/global-sidebar.tsx` | Nav item Tasks | Global nav | Low | Re-add nav item |
| `apps/client/src/features/space/components/sidebar/space-sidebar.tsx` | Link to space tasks | Space nav | Low | Re-add menu button |
| `apps/client/public/locales/en-US/translation.json` | Tasks (+ V2) i18n keys | EN | Low | Merge JSON keys |
| `apps/client/public/locales/fr-FR/translation.json` | Tasks (+ V2) i18n keys | FR | Low | Merge JSON keys |

## V2: no new upstream files beyond V1 list

V2 work stays under:

- `apps/server/src/core/task/**`
- `apps/server/src/database/repos/task/**`
- `apps/server/src/database/migrations/20260912T120000-task-properties.ts`
- `apps/client/src/features/tasks/**`
- `apps/client/src/pages/tasks/**`
- `docs/custom/tasks/**`

Only **extensions** of files already in the V1 patch list (`database.module.ts`, `db.d.ts`, `entity.types.ts`, locales).

## Intentionally untouched

- `apps/client/src/components/layouts/global/global-app-shell.tsx`
- `apps/server/src/core/casl/**`
- `SpaceService` / createSpace / deleteSpace / deleteUser
- `apps/client/src/ee/base/**` and all `base_*` tables
- EE CSS (`kanban.module.css`, `grid.module.css`, `choice-color.ts`, row-detail CSS)

## Upgrade Docmost strategy

1. Merge/rebase onto new upstream tag on `redcore/x.y`.
2. Re-apply the table above (usually small conflicts in module wiring + locales).
3. Keep fork-only trees intact.
4. Run `migration:latest` (V1 + V2 migrations are additive).
5. Smoke `/tasks` + `/api/tasks` + `/api/tasks/properties`.
