# Rollback (Project A)

Independent ops procedure. **Do not restore the database.**  
Project B (Louise) is a separate image overlay — see R26 notes below.

## Combined production (after Louise R25 cutover)

Current **running** prod is **not** the historical Gantt-only R24 image.

| Role | Image |
|------|-------|
| Combined prod (R24 Gantt + Louise R25) | `redcore-docmost-c2:0.95.0-r25-louise-context-usage-final` |
| Digest | `sha256:9f6e2d1145424aec7a66164cdb790dcbe5631b36ef511b17eacccddf4b8fa255` |
| Historical Gantt-only R24 | `redcore-docmost-c2:0.95.0-r24-gantt-ux-test` |

**A future R26 Gantt-edit cutover must roll back to the combined R25 image**, not to `r24-gantt-ux-test`. Using the old R24 image would **remove Louise**.

Runtime Louise patch `patch-aichat-context-usage.js` stays in prod `command:` across a Projet A rollback.

## R26 candidate (not deployed)

| Role | Image |
|------|-------|
| Gantt-edit smoke (this branch, Projet A source) | `redcore-docmost-c2:0.95.0-r26-gantt-edit-rebased-test` |
| Rollback if R26 were ever cut over | combined prod `…-r25-louise-context-usage-final` |

Smoke image is built from the Gantt git branch (Louise client **not** committed here). A later **prod** R26 image must be an unpublished integration build: Gantt R26 + Louise client commit `a527bd32`. Do not cherry-pick Louise onto `feature/tasks-r23-gantt-edit-rebased`.

## Historical R24 → R22 (Gantt-only era)

Use only if you intentionally accept **dropping Louise**. Prefer the combined R25 image instead.

| Role | Image |
|------|-------|
| Historical R24 Gantt-only | `redcore-docmost-c2:0.95.0-r24-gantt-ux-test` |
| Historical R22 | `redcore-docmost-c2:0.95.0-r22-gantt-polish-final` |

Digest reference for R24 (for comparison only):  
`sha256:4d3badc239478f641993f2c52950d4ab8d0eb099ce1b70a31a193c4ca1e4250a`

## Procedure (image swap, Docmost service only)

1. Capture logs if investigating an incident.
2. Edit **only** the Docmost service `image:` in compose (`/opt/docmost/docker-compose.yml`).
3. Apply:

```bash
cd /opt/docmost
docker compose up -d --no-deps docmost
```

4. Do **not** restart PostgreSQL / Redis / cloudflared unless they are unhealthy for unrelated reasons.
5. Do **not** remove `patch-aichat-context-usage.js` from `command:` when rolling back Projet A.
6. Wait for Nest start / “No pending database migrations”.
7. Verify:
   - `http://127.0.0.1:3000/` `/tasks` `/ai/chat` → 200
   - Base Table / Kanban / Gantt still loads
   - Louise ring still present if rolled back to R25 combined
   - cloudflared active; no persistent Error 1033
   - On `/tasks`, network still must not call `/api/bases*` for normal Tasks use

## Data compatibility

R24 may have created Base properties such as Start / Due dates.  
**Software rollback must not delete these.** R26 date edits persist as existing cell values — harmless if the edit UI is rolled back.

Legacy `gantt.barPropertyIds` configs remain readable on R22.

## Git pointers

| Pointer | Meaning |
|---------|---------|
| Tag `docmost-r24-gantt-ux-prod` | R24 frozen Gantt source |
| Tag `docmost-r25-louise-context-usage-prod` | Louise client (`a527bd32`) — Projet B, independent |
| Branch `feature/tasks-r23-gantt-edit-rebased` | R26 candidate |
| Commit `33d82aee` / `feature/tasks-r22-gantt-polish` | R22 polish source |

## Do not

- Restore DB dumps for a pure image rollback
- Deploy R23-on-R22 as a “rollback”
- Roll back Projet A with the Gantt-only R24 image after Louise R25 (drops Projet B)
- Mix Louise / AI context-usage **source** into the Gantt branch
