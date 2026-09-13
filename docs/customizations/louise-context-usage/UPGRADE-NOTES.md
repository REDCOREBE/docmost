# Upgrade notes — patch EE Hub `done.contextUsage`

**Ce projet est indépendant du projet Gantt/Tasks.**

## Fichier runtime ciblé

`/app/apps/server/dist/ee/ai-chat/ai-chat.service.js`

Marker : `REDCORE_AICHAT_CONTEXT_USAGE_V1`

Patch : `patch-aichat-context-usage.js` via `patch-service-guard` (skip-if-present, `node --check`, hard-fail si ancre absente).

## Ancres

1. `/* REDCORE_AICHAT_CONTEXT_V3 */` doit déjà être présent (compaction / `builtPayloadTokens`).
2. Helper injecté avant `const REDCORE_AICHAT_MAX_STEPS = 8;`
3. Snapshot après  
   `const effectiveSystemPromptWithSearch = effectiveSystemPrompt + searchScopeBlock + comprehensiveBlock;`
4. Yield `done` avec `usage: usage ? { promptTokens, completionTokens, totalTokens } : undefined`
5. `saveAssistantMessage(..., pendingSearch)` → arity +1 `contextUsage`
6. Merge `assistantMetadata.contextUsage = contextUsage` **après** `tokenUsage`, sans toucher `model` / `tokenCount`

## Skip-if-present

Si le source contient déjà le marker **et** `redcoreBuildContextUsageSnapshot` **et** `contextUsage: contextUsage || undefined` **et** `assistantMetadata.contextUsage = contextUsage` → log `already applied`, exit 0.

## Hard-fail

- Context V3 absent
- Signature `saveAssistantMessage` V3.5 introuvable
- Yield `done` introuvable
- Marker manquant après patch
- Tentative de persister le texte mémoire interne

## Ordre boot (smoke r25)

`… → patch-aichat-onepassword-redact → patch-aichat-context-usage → entitlements → logo`

`onepassword-redact` doit rester **avant** : il réécrit le même service file. Inverser l’ordre peut casser les ancres.

## Détecter un changement upstream

Après bump Hub digest :

```
grep -n "type: 'done'" /app/apps/server/dist/ee/ai-chat/ai-chat.service.js
grep -n "saveAssistantMessage" /app/apps/server/dist/ee/ai-chat/ai-chat.service.js
grep -n "effectiveSystemPromptWithSearch" /app/apps/server/dist/ee/ai-chat/ai-chat.service.js
grep REDCORE_AICHAT_MAX_STEPS /app/apps/server/dist/ee/ai-chat/ai-chat.service.js
```

Si une ancre manque : le patch **doit** hard-fail (ne pas forcer un replace dist/ee).

## Revalidation après upgrade Docmost

1. Appliquer le patch sur smoke isolée (pas prod).
2. `node /opt/patches/test-aichat-context-usage.js`
3. Envoyer 1 message, inspecter SSE `done.contextUsage` ≠ `done.usage`
4. Reload conversation → metadata hydrate
5. Vérifier budgets compaction toujours 45000 / 40000
6. Smoke navigateur page / empty / aside
