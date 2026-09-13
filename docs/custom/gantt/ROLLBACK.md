# Rollback R24 → R22 (Project A)

Independent ops procedure. **Do not restore the database.**

## Images

| Role | Image |
|------|-------|
| Current prod (R24) | `redcore-docmost-c2:0.95.0-r24-gantt-ux-test` |
| Rollback target (R22) | `redcore-docmost-c2:0.95.0-r22-gantt-polish-final` |

Digest reference for R24 (for comparison only):  
`sha256:4d3badc239478f641993f2c52950d4ab8d0eb099ce1b70a31a193c4ca1e4250a`

## Procedure

1. Capture logs if investigating an incident.
2. Edit **only** the Docmost service `image:` in compose  
   (`/opt/docmost/docker-compose.yml`):  
   `…-r24-gantt-ux-test` → `…-r22-gantt-polish-final`
3. Apply:

```bash
cd /opt/docmost
docker compose up -d --no-deps docmost
```

4. Do **not** restart PostgreSQL / Redis / cloudflared unless they are unhealthy for unrelated reasons.
5. Wait for Nest start / “No pending database migrations”.
6. Verify:
   - `http://127.0.0.1:3000/` and `/tasks` → 200
   - A Base Table / Kanban / Gantt still loads
   - cloudflared active; no persistent Error 1033
   - On `/tasks`, network still must not call `/api/bases*` for normal Tasks use

## Data compatibility

R24 may have created Base properties such as:

- `Date de début` / `Start date`
- `Date d'échéance` / `Due date`

**Software rollback must not delete these.** They remain valid Base schema.  
No destructive migration accompanies R24 ↔ R22 image swaps.

Legacy `gantt.barPropertyIds` configs remain readable on R22.  
R24-only UX (quick URL filters, unified visible props) simply becomes unavailable until R24 is restored.

## Git pointers

| Pointer | Meaning |
|---------|---------|
| Tag `docmost-r24-gantt-ux-prod` | R24 frozen source matching prod image intent |
| Commit `33d82aee` / branch `feature/tasks-r22-gantt-polish` | R22 polish source |

## Do not

- Restore DB dumps for a pure image rollback
- Deploy R23 as a “rollback”
- Mix Louise / AI context-usage changes into this procedure
