# SSE contract — `done.contextUsage`

`contextUsage` est **optionnel** et **distinct** de `usage` (provider). Ne pas changer la sémantique de `usage`.

```ts
done: {
  type: 'done';
  messageId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }; // provider / tour — PAS la jauge de fenêtre
  contextUsage?: {
    estimatedUsedTokens: number;
    contextLimit: number; // 65536 for redcore-general
    systemPromptTokens?: number;
    toolsTokens?: number;
    historyTokens?: number;
    internalMemoryTokens?: number; // omitted if 0
    attachmentsTokens?: number;    // omitted in V1
    compacted: boolean;
    messagesBefore?: number;
    messagesAfter?: number;
    toolResultsBefore?: number;
    toolResultsAfter?: number;
    source: 'server-estimate';
  };
}
```

Confirmé live :

- `JSON.stringify(done.usage) !== JSON.stringify(done.contextUsage)`
- `done.usage` souvent `{}` / absent avec LiteLLM
- Client ignore `usage` pour l’anneau
- Backend ancien sans `contextUsage` : le client ne crash pas (baseline)

## Metadata persistée (merge)

```ts
metadata: {
  model,
  tokenCount,
  pendingAction?,
  pendingSearch?,
  tokenUsage?,     // provider, inchangé
  contextUsage?,   // ajout V1
}
```

Ancienne forme `{ model, tokenCount }` reste lisible. Pas de migration DB. `contextUsage` inconnue → baseline.

Live keys après tour : `model`, `tokenCount`, `tokenUsage`, `contextUsage`.
