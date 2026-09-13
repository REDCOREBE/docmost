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

## R23 — drag / resize (WIP, **rebased as R26**)

- Original stash: `stash@{1}` `r23-gantt-edit-wip` on `feature/tasks-r23-gantt-edit` (HEAD was R22 `33d82aee`; **0 unique commits**)
- Rebased onto R24: branch `feature/tasks-r23-gantt-edit-rebased` — see R26 below
- **NOT DEPLOYED**

Never merge Louise / Project B into R23 or R24 Gantt branches.

## R26 — Gantt Edit Rebased (**CANDIDATE, not prod**)

Branch: `feature/tasks-r23-gantt-edit-rebased`  
Base: tag `docmost-r24-gantt-ux-prod` / `2cb717a5` + docs freeze `6ef199b7`

Delivered on top of R24 UX:

- Bar drag / resize / milestone edit (R23 KEEP, adapted to `effectivePxPerDay`)
- Optimistic preview; one mutation per drop; native error toast + visual rollback
- Tasks batch `sys:startDate` + `sys:dueDate`

**Smoke image (Gantt source branch):** `redcore-docmost-c2:0.95.0-r26-gantt-edit-rebased-test`  
**Prod cutover image (later):** must be an unpublished integration build = this branch **plus** Louise R25 client (`a527bd32`), because current prod already includes Louise. Do **not** cherry-pick Louise onto the Gantt branch.

Never merge Louise / Project B into R23, R24, or R26 Gantt branches.
