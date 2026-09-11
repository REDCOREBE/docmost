/**
 * Redcore — AI Chat V3.8 client stream handling (source-native)
 * Bundle marker: REDCORE_AICHAT_V38_CLIENT_NATIVE
 *
 * When present in the client index bundle, patch-aichat-v38.js skips minified
 * client injection (Hub without this marker still gets the runtime inject).
 * Server V3.8 / V3.8.1 patches always run.
 *
 * Behavior (parity with runtime client patch):
 * - tool_call → clear streaming content (drop optimistic pre-tool narration)
 * - content with replace:true → replace streaming content; else append
 */
export const REDCORE_AICHAT_V38_CLIENT_NATIVE =
  "REDCORE_AICHAT_V38_CLIENT_NATIVE";
