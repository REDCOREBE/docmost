# Upgrade / compatibility notes (Project A)

## CURRENT PROD BASELINE = R24

IMAGE=`redcore-docmost-c2:0.95.0-r24-gantt-ux-test`  
DIGEST=`sha256:4d3badc239478f641993f2c52950d4ab8d0eb099ce1b70a31a193c4ca1e4250a`

The `-test` suffix is historical packaging naming. **Do not retag/rebuild solely to rename.** Digest is the production reference.

## Quick filters

```
/tasks?assignee=<userUuid>&space=<spaceUuid>
```

| Property | Behaviour |
|----------|-----------|
| Persist in `task_views` | **No** |
| Dirty / save-for-everyone | **No** |
| Lifetime | Temporary (URL / session navigation) |
| Composition | Combines with saved view filters |

Clear by navigating to `/tasks` without query params or clearing the quick filter controls.

## Legacy bar config

| Config | Status |
|--------|--------|
| `gantt.barPropertyIds` | **Readable** for existing views — do not drop without an explicit future migration |
| `visiblePropertyIds` | **Current** UX source for bar metas (card / visible properties picker) |

Dual visibility systems must not both drive conflicting UI chrome (“Bar fields” removed).

## Base auto-dates / reversibility

R24 Base Gantt creation can add:

- Start date (`Date de début`, …)
- Due date (`Date d'échéance`, …)

Rules:

1. Idempotent provisioning (no duplicate Start/Due by known names)
2. Image rollback **does not** auto-remove properties
3. No destructive schema migration in R24 cutover
4. Properties remain valid Base data after returning to R22 image

## Functional freeze

After tag `docmost-r24-gantt-ux-prod`, do not land functional R24 changes on the prod baseline without a new release (R25+).  
Next functional Gantt edit track is **R23 rebased on R24** ([R23-REBASE-PLAN.md](./R23-REBASE-PLAN.md)).

## Project separation

Project A (this tree) ≠ Project B (Louise / context usage). Keep commits, tags, docs, and images separate.
