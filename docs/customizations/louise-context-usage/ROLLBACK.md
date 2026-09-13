# Rollback — Louise context usage (Projet B only)

Retirer **uniquement** Louise Context Usage, sans retirer Gantt/Tasks.

Aucune migration DB destructrice. `metadata.contextUsage` laissé en base est **harmless** pour une version qui ne le lit pas (JSON additif).

## 1. Image de rollback

Image C2 **sans** l’overlay client context-usage et **sans** le patch `patch-aichat-context-usage.js` dans le `command:` compose.

Référence actuelle prod (inchangée par cette run) : ne pas déployer r25.

Candidate r25 à ne **pas** laisser dans prod compose. Rollback = rester / revenir à l’image prod en cours (r24+ AI chat existant, sans anneau).

## 2. Patch runtime

1. Retirer `node /opt/patches/patch-aichat-context-usage.js` du `command:` compose.
2. Ne pas supprimer les autres `patch-aichat*`.
3. Recréer le conteneur **app** (pas un volume wipe).

Le dist EE Hub revient au `done` sans `contextUsage` au prochain boot (fichier réécrit depuis l’image, patch skip).

## 3. Client / UI

Si rollback **source** : revert du commit `feat(ai-chat): add server-backed context usage indicator` sur `feature/louise-context-usage-r25` (ou ne pas merger).

Si rollback **image seulement** : revenir à une image client sans `REDCORE_AICHAT_CONTEXT_USAGE_CLIENT_NATIVE`. L’anneau disparaît.

## 4. Metadata

Laisser `metadata.contextUsage` en DB. Pas de script de nettoyage obligatoire.

## 5. Vérification post-rollback

- Louise envoie / Stop inchangés
- Pas d’erreur console sur `contextUsage` undefined
- Pas d’anneau (ou anneau absent du bundle)
- Compaction / budgets inchangés (cette V1 ne les modifie pas)
