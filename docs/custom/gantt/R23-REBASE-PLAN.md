# R23 rebase plan — **DONE as R26**

Executed 2026-09-13 on Projet A only. No prod cutover. No Louise source on this branch.

## Inventory

```
R23_BRANCH=feature/tasks-r23-gantt-edit
R23_COMMITS=(none — HEAD was R22 33d82aee)
R23_FILES=stash@{1} r23-gantt-edit-wip (7 files)
R23_WORKTREE=none (stash only)
R23_STASHES=stash@{1} r23-gantt-edit-wip
LOUISE_FILES_IN_R23=no
```

Stash files:

- KEEP: `gantt-edit.ts`, `gantt-edit.spec.ts`, `use-gantt-pointer-edit.ts`
- ADAPT: `gantt-view.tsx`, `gantt.module.css`, `base-gantt.tsx`, `tasks-native-shell.tsx`
- DROP: none as commits (no R23 commits existed). Dropped R22-only assumptions: `computeTimelineRange` / frozen 26px day width / `resolveProgress` without `visiblePropertyIds`

## Classification vs R24

| Item | Class | Resolution |
|------|-------|------------|
| Date math + DST + snap | KEEP | Unchanged |
| Pointer hook | KEEP | `dayWidth` is caller-supplied = R24 `effectivePxPerDay` |
| `gantt-view` interactions | ADAPT | R24 wins UX: `visiblePropertyIds`, `propertyOrder`, EPMF, full-height, GanttToolbar without Bar fields |
| Timeline during drag | ADAPT | Scale from `datedRaw`, not preview (R24 EPMF stability) |
| `base-gantt` commit | ADAPT | Keep R24 `useMigrateBarPropertyIds`; add `useUpdateRowMutation` (ports → Tasks or Base) |
| `updateRowCells` batch | KEEP | One `/api/tasks*` for start+due |
| Bar fields toolbar | DROP | Must not return |
| Blocking empty config as default Base path | DROP | R24 auto-dates remain; empty UI kept as fallback only |

Conflict audit (`R24` wins UX, `R23` wins edit):

| File | R24 | R23 | Kept |
|------|-----|-----|------|
| `gantt-view.tsx` | EPMF, visible props, ResizeObserver | pointer edit, preview | both: edit on R24 chrome |
| `gantt.module.css` | R24 tokens | grab/handles | handles added, tokens unchanged |
| `base-gantt.tsx` | legacy barPropertyIds migrate | onCommitDates | both |
| `gantt-timeline.ts` | R24 | (untouched in stash) | R24 |
| `gantt-bar-label.ts` | visiblePropertyIds | (untouched) | R24 |
| `base-toolbar` / `view-create-menu` / `tasks-page` | quick filters, auto-dates | (untouched) | R24 |

New branch: `feature/tasks-r23-gantt-edit-rebased` from `2cb717a5` + cherry-pick KEEP docs `6ef199b7`.
