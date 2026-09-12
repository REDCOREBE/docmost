# Upgrade / inheritance (native UI)

## Prefer

Import EE **leaves + styles** from pinned Docmost version; keep orchestration in `features/tasks/components/native/*`.

Inject **generic** `BaseDataPorts` only (no Tasks imports in `ee/base`). Document every EE touch in [UPSTREAM-PATCHES.md](./UPSTREAM-PATCHES.md).

## Avoid unless necessary

Broad rewrites of EE parents. Prefer small port branches with unchanged default Base behavior.

## Checklist after Docmost / Base upgrade

1. Diff `apps/client/src/ee/base/**` for breaking renames; re-apply port patches from UPSTREAM-PATCHES.
2. Re-smoke Space Tasks + Global Tasks (table, kanban DnD, row detail, create untitled, toolbar).
3. Re-smoke EE Bases regression (ports absent path).
4. Confirm **0 `/api/bases*`** from Tasks network log.
5. Update [UI.md](./UI.md) / [V2.md](./V2.md) Known gaps if needed.

## Pin

Ops images pin Docmost source SHA; record `SOURCE_COMMIT` in [V2.md](./V2.md) and image labels.

## Rollback of UI-only changes

See [ROLLBACK.md](./ROLLBACK.md). Native UI can be reverted without dropping `task_*` if Task API routes remain.
