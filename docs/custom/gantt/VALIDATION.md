# R24 production validation (Project A)

Frozen synthesis of the authorized R24 production cutover.  
Do not treat `/tmp/r24-prod-cutover/` alone as the long-term record.

## Result

**PRODUCTION PASS WITH WARNINGS** — **KEEP R24** — rollback **no**

## Cutover identity

| Field | Value |
|-------|-------|
| Cutover timestamp | `2026-09-13T18:40:56+02:00` |
| Method | `docker compose up -d --no-deps docmost` only |
| Old image | `redcore-docmost-c2:0.95.0-r22-gantt-polish-final` |
| New image | `redcore-docmost-c2:0.95.0-r24-gantt-ux-test` |
| Digest | `sha256:4d3badc239478f641993f2c52950d4ab8d0eb099ce1b70a31a193c4ca1e4250a` |
| Source tag | `docmost-r24-gantt-ux-prod` |
| Source commit | `2cb717a5fc2eb60b17d26274c16a0afece7cb427` |
| Compose backup | `/root/backup-docmost-compose-pre-r24-20260913-184037.yml` |
| Pre-cutover inspect | `/root/docmost-r22-container-inspect-pre-r24.json` |

## Matrix

| Check | Result |
|-------|--------|
| Quick Person | PASS |
| Quick Space | PASS |
| Combined Person+Space | PASS |
| dirty=false / task_views unchanged | PASS |
| Card properties → bars | PASS WITH WARNINGS |
| Legacy views (`barPropertyIds`) | PASS |
| Base auto-dates (0-date Base) | PASS |
| Duplicate date prevention | PASS |
| EPMF full-width | PASS (`containerWidth=1059` = `timelineWidth`, `px/day≈42.36`) |
| Full-height | PASS |
| Space Gantt | PASS |
| Base regression | PASS |
| Network boundary Tasks → `/api/bases*` | PASS (0 calls, isolated session) |
| Dark mode | PASS |
| Cloudflare | PASS WITH WARNINGS |
| HTTP failures (30 min / 15 cycles) | 0 |
| 5xx (monitor window) | 0 |
| Container restarts | 0 |
| DB | healthy |
| Redis | PONG |
| Rollback executed | no |

## Non-blocking warnings (no rollback)

1. **Cloudflare** — brief origin `connection refused` / `reset by peer` only during docmost recreate (~18:41:14–35). No Error 1033 afterward. cloudflared stayed active.
2. **Selenium bar-meta density** — Progress picker opened; “Bar fields” absent; post-toggle meta chip density not fully asserted in headless automation. Pre-cutover browser score **9.56/10** remains the UX reference.
3. **Person combobox accent** — one flaky UI typeahead with “Cédric”; URL `?assignee=` and API paths solid.

None of these warnings required rollback.

## Monitoring

15 cycles × 2 minutes (`2026-09-13T18:47:38+02:00` → `19:15:45+02:00`): all `/`, `/login`, `/tasks`, space tasks HTTP 200; RestartCount 0; DB/Redis/CF OK.
