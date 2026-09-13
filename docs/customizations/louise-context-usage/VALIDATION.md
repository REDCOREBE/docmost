# Validation — Louise context usage V1

**Ce projet est indépendant du projet Gantt/Tasks. Prod R25 déployée 2026-09-13 (KEEP R25).**

| | |
|---|---|
| Date | 2026-09-13 |
| Image | `redcore-docmost-c2:0.95.0-r25-context-usage-test` |
| Digest | `sha256:9f6e2d1145424aec7a66164cdb790dcbe5631b36ef511b17eacccddf4b8fa255` |
| Tag final | `redcore-docmost-c2:0.95.0-r25-louise-context-usage-final` (même digest) |
| Branche | `feature/louise-context-usage-r25` |
| Smoke access | `nsenter` dans le netns du conteneur smoke |
| Smoke URL | `http://127.0.0.1:3000` **dans** ce netns (le publish hôte `:3011` est bloqué par docker-proxy) |
| Compose smoke | `scripts/docker-compose.aichat-r25-context-usage-smoke.yml` projet `docmost-aichat-r25-context-usage-smoke` |

```
SMOKE_ACCESS_METHOD=nsenter
SMOKE_URL=http://127.0.0.1:3000
```

## Tests

| Suite | Résultat |
|-------|----------|
| `test-aichat-context-usage.js` (server snapshot/SSE/merge/privacy/budgets) | PASS |
| `test-aichat-context-usage-client.js` | PASS |
| `context-usage.spec.ts` (vitest) | PASS — 1 file, **6 tests** |
| `tsc --noEmit` isolated mount | workspace `@docmost/editor-ext` non lié (bruit préexistant). **Build image r25** = `pnpm --filter client build` (tsc && vite) **PASS** (bundle contient `REDCORE_AICHAT_CONTEXT_USAGE_CLIENT_NATIVE`) |
| nest build | inchangé (patch runtime EE, pas de source OSS server) |
| API smoke `smoke-aichat-context-usage-api.js` | PASS (9125 / 65536, metadata merge, reload match) |
| Compaction live | PASS — voir `validation/compaction-live.json` |
| Browser selenium | PASS — `validation/browser-smoke.json` |

## Compaction live (même conversation)

Chat `01a09bcd-2ea1-7e6f-ad74-19338cc6f0ea`. Checkpoint `[Previous conversation summary]` `compactionVersion: 2`.

| | Avant | Après |
|---|-------|--------|
| `estimatedUsedTokens` | **39872** | **9274** |
| `historyTokens` | 30759 | 161 |
| `internalMemoryTokens` | omis (0) | omis (0) |
| `compacted` | false | **true** |
| `messagesBefore → After` | 41 → 41 | **83 → 2** |
| `%` | ~61 % | ~14 % |
| somme ventilations = used | oui | oui |

Baisse de % **attendue**. UI : « History compacted Yes » + note explicative. Pas de fuite mémoire interne.

## Browser smoke

Captures dans [`screenshots/`](./screenshots/).

| Surface | Résultat |
|---------|----------|
| Empty avant 1er message | anneau unknown 20px, « Base context loaded », pas de faux % |
| Empty après 1er message | `~14 %`, 9 122 / 65 536 |
| Page chat hydratée | `~14 %` depuis metadata |
| Page après send | history 12 → 33, ring update |
| Reload F5 | même aria `Context ~14%` |
| Switch conversation | snapshot restauré |
| Aside étroit | 20px, left of Send, no overflow, Space ouvre, send → `~14 %` |
| Light / dark | PASS |
| Thresholds visuels 25 / 65 / 85 | neutral / attention / high (fixtures hydratées, source server-estimate) |
| Keyboard | button, Enter/Space ouvrent ; Escape headless ActionChains = flaky (handler `closeOnEscape` + `onKeyDown` ajouté en source) |
| Enter dans l’éditeur | n’ouvre pas le popover (envoie le message) |
| Provider usage | **non** affiché comme contexte |

## Privacy

SSE, metadata DB, popover, JSON client : compteurs seulement. `INTERNAL PRIOR ACTIVITY MEMORY` absent du snapshot.

## Décision sémantique

`estimatedUsedTokens` **n’inclut pas** la réserve de réponse. `contextLimit = 65536`.

## Verdict smoke (pré-cutover)

**SAFE FOR PROD YES** — cutover dédié Projet B exécuté ci-dessous.

## Production cutover R25 — 2026-09-13

| | |
|---|---|
| RESULT | **PRODUCTION PASS WITH WARNINGS** |
| Recommendation | **KEEP R25** |
| Cutover timestamp | `2026-09-13T17:47:21Z` |
| Command | `docker compose up -d --no-deps docmost` (PostgreSQL / Redis / cloudflared **non** recréés) |
| Old image | `redcore-docmost-c2:0.95.0-r24-gantt-ux-test` |
| Old digest | `sha256:4d3badc239478f641993f2c52950d4ab8d0eb099ce1b70a31a193c4ca1e4250a` |
| New image | `redcore-docmost-c2:0.95.0-r25-louise-context-usage-final` |
| New digest | `sha256:9f6e2d1145424aec7a66164cdb790dcbe5631b36ef511b17eacccddf4b8fa255` |
| Client commit | `a527bd32dca41fe1e1600d6f40daefb93a8fb12a` |
| Ops commit (patch+docs) | `a311af49cc72efdbf5ec0a29c7831aec83836057` |
| Prod tag (Projet B) | `docmost-r25-louise-context-usage-prod` → client `a527bd32` |
| Projet A tag | `docmost-r24-gantt-ux-prod` **inchangé** |
| Rollback | **non utilisé** (artefacts `/root/backup-docmost-compose-pre-r25-louise-20260913-174628.yml`) |
| Patch order | `onepassword-redact` **puis** `patch-aichat-context-usage.js` **puis** entitlements / logo |
| Patch runtime | `AI chat context usage V1 patch applied to ai-chat.service` — skip-if-present, hard-fail anchors, RestartCount=0 |
| Migrations | `No pending database migrations` |

Compose diff strictement limité à : image R24→R25 + volume/commande du patch Louise. Pas de changement DB / Redis / Cloudflare / réseau / volumes inattendus / patch Gantt.

### Monitoring 30 min

15 cycles / 2 min (`2026-09-13T17:49:04Z` → `2026-09-13T18:17:25Z`). GET `/` `/login` `/tasks` `/ai/chat` : **HTTP 200**, 0 failure, 0 5xx monitor, RestartCount=0, OOM=false, Redis PONG, DB accepting, cloudflared active, 0 Error 1033 persistant.

CPU ~0.4 %, RAM ~471 MiB / 3.8 GiB en fin de fenêtre.

### SSE / metadata prod (compteurs seulement)

Après cutover : **21/21** messages assistant ont `model` + `tokenCount` + `tokenUsage` + `contextUsage`. 0 fuite `INTERNAL PRIOR ACTIVITY MEMORY` / system prompt dans metadata.

Exemples (pas de contenu message) :

- early chat : `estimatedUsedTokens=9122`, `contextLimit=65536`, `compacted=false`, `source=server-estimate`
- conversation plus longue : `used=14232`, `compacted=true`, `systemPromptTokens=3617`, `toolsTokens=5500`, `historyTokens=4888`, `internalMemoryTokens=227` (compteur seul)

`done.usage` (provider) reste distinct de `done.contextUsage`. `contextLimit` toujours 65536. Jauge = server-estimate, pas le usage provider.

### Compaction prod

**17** snapshots `compacted=true`, **4** `false` (trafic organique). Pas de seed artificiel. UI : note « History compacted » déjà validée en smoke.

### Cloudflare

Reset origin bref pendant recreate (~17:47:36–17:47:49Z), classe R24. Tunnel `active` ensuite. Public `https://docs.red-cloud.be/` = 403 challenge Cloudflare (pas 1033).

### Warnings (non bloquants)

1. **UI logged-in non cliquée en prod** : SSO, pas de reset mot de passe. Bundle prod contient `data-context-usage-ring`, `REDCORE_AICHAT_CONTEXT_USAGE_CLIENT_NATIVE`, `Base context loaded`. Click-through page / empty / aside / a11y / Gantt Quick Person validés en **smoke** + nsenter, pas en session SSO prod.
2. **Escape** : handler `closeOnEscape` présent en source git ; **absent du bundle image gelée** r25 (flaky headless déjà noté).
3. **3 × `AI stream error part`** `18:12:03`–`18:13:49Z` : erreur connexion LiteLLM amont (`OpenAIException - Connection error`, model group `redcore-general`). Nested HTTP 500 LiteLLM, pas un crash Nest/patch. **21** `agent loop finished` dans la même fenêtre. Rollback R25 n’aurait pas corrigé LiteLLM. Seuil « ≥3 5xx AI / 5 min » interprété comme incident **upstream**, pas comme cassage streaming R25.
4. **Collation PG** warning préexistant (2.41 vs 2.36) — non touché.
5. Nest log d’erreur AI SDK peut inclure `requestBodyValues` (prompt/outils) sur stream fail — **préexistant**, hors snapshot `contextUsage`.

### Gantt / Projet A

0 modification fonctionnelle. Overlay `barPropertyIds` toujours dans le même bundle client. `/tasks` SPA 200. Tables `task_*` non touchées. Smoke R24 Gantt laissé intact (conteneurs smoke séparés).

### Git push

```
CLIENT_BRANCH_PUSHED=yes   feature/louise-context-usage-r25
OPS_BRANCH_PUSHED=yes      feature/louise-context-usage-r25
PROD_TAG_PUSHED=yes        docmost-r25-louise-context-usage-prod
```

Pas de merge `main`. Tag Gantt `docmost-r24-gantt-ux-prod` non déplacé.
