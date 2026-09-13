import type { AiChatMessage, AiContextUsage } from "../types/ai-chat.types";

export const CONTEXT_USAGE_LIMIT_FALLBACK = 65536;

export function isAiContextUsage(value: unknown): value is AiContextUsage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.estimatedUsedTokens === "number" &&
    Number.isFinite(v.estimatedUsedTokens) &&
    typeof v.contextLimit === "number" &&
    Number.isFinite(v.contextLimit) &&
    v.contextLimit > 0 &&
    v.source === "server-estimate"
  );
}

export function findLatestContextUsage(
  messages: AiChatMessage[],
): AiContextUsage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const candidate = msg.metadata?.contextUsage;
    if (isAiContextUsage(candidate)) return candidate;
  }
  return null;
}

export function contextUsagePercent(usage: AiContextUsage): number {
  if (!usage.contextLimit) return 0;
  const raw = (usage.estimatedUsedTokens / usage.contextLimit) * 100;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, raw));
}

export type ContextUsageVisualLevel =
  | "unknown"
  | "neutral"
  | "attention"
  | "high";

export function contextUsageVisualLevel(
  percent: number | null,
  isKnown: boolean,
): ContextUsageVisualLevel {
  if (!isKnown || percent === null) return "unknown";
  if (percent > 80) return "high";
  if (percent > 60) return "attention";
  return "neutral";
}

export function roundedContextPercent(percent: number): number {
  return Math.round(percent);
}
