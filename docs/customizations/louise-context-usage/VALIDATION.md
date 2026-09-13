# Validation — Louise context usage V1

**Ce projet est indépendant du projet Gantt/Tasks. Prod non déployée.**

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

## Verdict

Voir le rapport de clôture dans le chat / `VALIDATION` finale. **SAFE FOR PROD** uniquement après cutover dédié — cette run ne déploie pas.
