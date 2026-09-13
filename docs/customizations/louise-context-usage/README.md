# Louise context usage indicator (V1)

**Ce projet est indépendant du projet Gantt/Tasks.**

| Champ | Valeur |
|-------|--------|
| Projet | **B — Louise Context Usage** |
| Date de validation | 2026-09-13 |
| Prod | **non déployé** |
| Image candidate | `redcore-docmost-c2:0.95.0-r25-context-usage-test` |
| Digest | `sha256:9f6e2d1145424aec7a66164cdb790dcbe5631b36ef511b17eacccddf4b8fa255` |
| Tag final (même digest) | `redcore-docmost-c2:0.95.0-r25-louise-context-usage-final` |
| Branche client | `feature/louise-context-usage-r25` |
| Branche ops | `feature/louise-context-usage-r25` |
| Marker serveur | `REDCORE_AICHAT_CONTEXT_USAGE_V1` |
| Marker client | `REDCORE_AICHAT_CONTEXT_USAGE_CLIENT_NATIVE` |

## Objectif

Petit anneau cliquable (20px) à gauche du bouton Envoyer de Louise. Il affiche l’usage **estimé** de la fenêtre de contexte réelle (`redcore-general` = **65 536** tokens). Clic → popover de détail.

## Motivation

`done.usage` est l’usage **provider** du tour (LiteLLM), souvent vide, et ce n’est pas le remplissage de la fenêtre. Recalculer depuis les messages visibles côté client serait faux (prompt, outils, compaction, mémoire interne).

## Comportement UI

- Trois surfaces, **un seul** `ChatInput` : page `/ai`, empty state, aside.
- Nouveau chat : anneau neutre, popover « Contexte de base chargé » — **aucun faux %**.
- Après `done` : `~XX %`, total used / 65 536, ventilation honnête, compacté Oui/Non.
- Pendant le stream : snapshot précédent conservé (`aria-busy`).
- Après compaction le % **peut baisser** — c’est normal.

## Source de vérité

Le serveur. Jamais un tokenizer client. Voir [ARCHITECTURE.md](./ARCHITECTURE.md).

## Limites V1

- Valeurs **estimées** (`source: "server-estimate"`), tilde obligatoire.
- Pas de live à chaque tool step.
- Pas de breakdown Cursor (Rules / Skills / MCP / subagents).
- Pas de courbe historique ni « messages restants ».
- `attachmentsTokens` **omis** (non mesuré honnêtement).
- `done.usage` (provider) ≠ `done.contextUsage`.
- Compaction interne vise ~45k **payload total** (history + system + tools + **réserve réponse**). L’anneau **n’inclut pas** la réserve, donc le plafond live non compacté est ~62 % de 65 536, pas 100 %. Le seuil visuel >80 % reste valide pour les cas limites / fixtures.

## Fichiers touchés (Projet B uniquement)

**Client (fork `REDCOREBE/docmost`)**

- `apps/client/src/ee/ai-chat/types/ai-chat.types.ts`
- `apps/client/src/ee/ai-chat/hooks/use-chat-stream.ts`
- `apps/client/src/ee/ai-chat/hooks/use-context-usage.ts`
- `apps/client/src/ee/ai-chat/utils/context-usage.ts`
- `apps/client/src/ee/ai-chat/utils/context-usage.spec.ts`
- `apps/client/src/ee/ai-chat/components/context-usage-ring.tsx`
- `apps/client/src/ee/ai-chat/styles/context-usage-ring.module.css`
- `apps/client/src/ee/ai-chat/components/chat-input.tsx`
- `apps/client/src/ee/ai-chat/components/ai-chat-layout.tsx`
- `apps/client/src/ee/ai-chat/components/chat-empty-state.tsx`
- `apps/client/src/ee/ai-chat/components/aside-chat-panel.tsx`
- `apps/client/src/ee/ai-chat/constants/redcore-aichat-context-usage.ts`
- `apps/client/public/locales/en-US/translation.json`
- `apps/client/public/locales/fr-FR/translation.json`

**Ops (`REDCOREBE/redcore-docmost`)**

- `patch-aichat-context-usage.js`
- `scripts/test-aichat-context-usage.js`
- `scripts/test-aichat-context-usage-client.js`
- `scripts/smoke-aichat-context-usage-api.js`
- `scripts/smoke-louise-compaction-live.js`
- `scripts/smoke-louise-compaction-live.py`
- `scripts/smoke-louise-context-usage-browser.py`
- `scripts/docker-compose.aichat-r25-context-usage-smoke.yml`
- `docs/customizations/Dockerfile.c2-hybrid.r25.example`
- `docs/customizations/aichat-invariants.md` (CU-I1…I6)
- `docs/customizations/louise-context-usage/`

## Navigation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SSE-CONTRACT.md](./SSE-CONTRACT.md)
- [ROLLBACK.md](./ROLLBACK.md)
- [UPGRADE-NOTES.md](./UPGRADE-NOTES.md)
- [VALIDATION.md](./VALIDATION.md)
