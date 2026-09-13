# R23 rebase plan (documentation only)

**Do not implement R23 in the R24 freeze run.**

## Current state

| Item | Status |
|------|--------|
| R24 | **LIVE prod** — baseline `docmost-r24-gantt-ux-prod` |
| R23 | Drag / resize / milestone edit **WIP** — **NOT DEPLOYED** |
| Stash hint | `r23-gantt-edit-wip` (from earlier `feature/tasks-r23-gantt-edit` work) |

R23 must be rebuilt **on top of R24**, not beside R22.

## Recommended plan

1. Create a clean branch from R24 prod commit / tag:

```bash
git fetch redcore
git checkout -b feature/tasks-r23-gantt-edit-on-r24 docmost-r24-gantt-ux-prod
```

2. Cherry-pick or rebase **only** R23 edit commits / stash hunks that touch drag-resize behaviour.
3. Resolve conflicts preferentially in:
   - `gantt-view.tsx`
   - bar / milestone interaction handlers
   - view `gantt` config types  
   **Keep R24 UX:** visiblePropertyIds bars, quick filters, auto-dates, full-width/height.
4. Do **not** reintroduce a separate “Bar fields” toolbar.
5. Retest before any smoke promote:
   - Quick Person / Space + combined URL
   - dirty=false / no `task_views` mutation from quick filters
   - Card properties → bars
   - Base auto-dates + duplicate prevention
   - EPMF full-width + full-height
   - Tasks network boundary: **0** `/api/bases*`
6. Only then continue drag/resize product work and packaging.

## Explicit exclusions

- Never rebase **Louise / AI context-usage** (Project B) into the R23 Gantt branch
- Never deploy R23 until R24 regression matrix is green on the rebased branch
- Never use R23 as a production rollback path from R24
