# Architecture — Louise context usage V1

**Ce projet est indépendant du projet Gantt/Tasks.**

```
Server snapshot (after real prompt + compaction)
  → SSE done.contextUsage
  → assistant metadata.contextUsage (merge)
  → getChatInfo / hydrateFromServer / findLatestContextUsage
  → useChatStream.contextUsage
  → useContextUsage
  → ChatInput → ContextUsageRing + popover
```

## Chemins exacts

### Serveur (runtime Hub EE, patché)

| Rôle | Fichier |
|------|---------|
| Stream AI / yield `done` | `/app/apps/server/dist/ee/ai-chat/ai-chat.service.js` |
| Patch | `/opt/docmost/patch-aichat-context-usage.js` |
| Compaction | `compactHistoryForModel` (`history-compressor.js`, patch context V3) |
| Budget / limite | `calculateTokenBudget`, `getModelContextLimit`, `estimateHistoryPayloadTokens` (`context-manager.js`) |
| Persist | `AiChatService.saveAssistantMessage` |

### Client (fork source-native)

| Rôle | Fichier |
|------|---------|
| Types | `apps/client/src/ee/ai-chat/types/ai-chat.types.ts` |
| SSE + hydrate | `apps/client/src/ee/ai-chat/hooks/use-chat-stream.ts` |
| Snapshot helpers | `apps/client/src/ee/ai-chat/utils/context-usage.ts` |
| Vue UI | `apps/client/src/ee/ai-chat/hooks/use-context-usage.ts` |
| Anneau | `apps/client/src/ee/ai-chat/components/context-usage-ring.tsx` |
| Input partagé | `apps/client/src/ee/ai-chat/components/chat-input.tsx` |
| Page | `apps/client/src/ee/ai-chat/components/ai-chat-layout.tsx` |
| Empty | `apps/client/src/ee/ai-chat/components/chat-empty-state.tsx` |
| Aside | `apps/client/src/ee/ai-chat/components/aside-chat-panel.tsx` |
| Hydration query | `getChatInfo` → `useChatInfoQuery` |

`CHAT_INPUT_SHARED_ACROSS_3_SURFACES=yes`

## Calcul serveur (`estimatedUsedTokens`)

Après construction de `effectiveSystemPromptWithSearch` :

```
systemPromptTokens  = countTokens(effectiveSystemPromptWithSearch) − countTokens(internalMemory)
toolsTokens         = budget.toolDefinitionTokens          // ~5500
historyTokens       = estimateHistoryPayloadTokens(history) // après compaction
internalMemoryTokens = compaction.stats.internalMemoryTokens // compteur, jamais le texte
attachmentsTokens   = OMIS en V1

estimatedUsedTokens = systemPromptTokens + toolsTokens + historyTokens + internalMemoryTokens
contextLimit        = getModelContextLimit(modelName) || 65536
```

**La réserve de réponse n’est pas incluse.** `builtPayloadTokens` existant (compaction) **inclut** `effectiveResponseReserve` — ne pas s’en servir comme jauge.

Live smoke (somme vérifiée) :

```
3613 + 5500 + 30759 + 0 = 39872   (avant compaction)
3613 + 5500 + 161   + 0 = 9274    (après)
```

Si une ventilation n’est pas fiable : le champ est **omis**, pas inventé. `internalMemoryTokens` est omis si 0.

## Client

- `useContextUsage(messages, liveSnapshot)` : `liveSnapshot` vient du hook stream (null = unknown).
- `percent = clamp(estimatedUsedTokens / contextLimit * 100, 0, 100)`
- Affichage `~{{percent}}%` si `source === "server-estimate"`.
- Pendant stream : pas d’event par tool step ; snapshot précédent.
- Reload : dernier assistant avec `metadata.contextUsage` valide.
- Ancien chat sans snapshot : baseline/unknown.

## Privacy

Le snapshot ne contient que des nombres + booléens + `source`. Jamais :

- texte system prompt
- `INTERNAL PRIOR ACTIVITY MEMORY`
- définitions d’outils
- credentials
- contenu attachments
- payload modèle brut
