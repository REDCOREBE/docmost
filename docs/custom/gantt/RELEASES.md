# Gantt release history (Project A)

## R21 — Gantt V1

- First Tasks Gantt view type
- `task_items.start_date` + `task_views` type `gantt`
- Shared Base Gantt presentation entry for Tasks

Tag reference: `pre-tasks-r21-gantt-v1` (pre-state marker in repo history)

## R22 — polish (previous prod)

Branch tip historically: `feature/tasks-r22-gantt-polish`  
Commit: `33d82aee` — *feat(tasks): R22 Gantt polish — milestones, barPropertyIds, full-height*

Delivered:

- Milestones
- Bar metadata via `gantt.barPropertyIds`
- Full-height grid behaviour
- Visual polish

**Rollback image (still kept):**  
`redcore-docmost-c2:0.95.0-r22-gantt-polish-final`

## R24 — UX consistency (**CURRENT PROD**)

Branch: `feature/tasks-r24-gantt-ux`  
Tag: **`docmost-r24-gantt-ux-prod`**  
Commit: **`2cb717a5fc2eb60b17d26274c16a0afece7cb427`**

Delivered:

- Unified card / visible properties → bar metas (`visiblePropertyIds`)
- Removed separate “Bar fields” control
- Quick Person / Space filters on global `/tasks` (URL)
- Base Gantt auto date provisioning
- Full-width timeline (`effectivePxPerDay`)

**Production image (validated; keep `-test` suffix as-is):**  
`redcore-docmost-c2:0.95.0-r24-gantt-ux-test`  
**Digest:** `sha256:4d3badc239478f641993f2c52950d4ab8d0eb099ce1b70a31a193c4ca1e4250a`

Cutover: `2026-09-13T18:40:56+02:00` — **PRODUCTION PASS WITH WARNINGS** — **KEEP R24**  
See [VALIDATION.md](./VALIDATION.md).

## R23 — drag / resize (WIP, not deployed)

- Stash / WIP: `r23-gantt-edit-wip` (branch `feature/tasks-r23-gantt-edit` historically pointed at R22 tip before R24 freeze)
- Scope: drag / resize / milestone edit
- **NOT DEPLOYED**
- **Must rebase onto R24** before any further work — [R23-REBASE-PLAN.md](./R23-REBASE-PLAN.md)

Never merge Louise / Project B into R23 or R24 Gantt branches.
