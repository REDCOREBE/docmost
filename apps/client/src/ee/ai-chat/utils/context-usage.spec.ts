import { describe, expect, it } from "vitest";
import type { AiChatMessage, AiContextUsage } from "../types/ai-chat.types";
import {
  CONTEXT_USAGE_LIMIT_FALLBACK,
  contextUsagePercent,
  contextUsageVisualLevel,
  findLatestContextUsage,
  isAiContextUsage,
  roundedContextPercent,
} from "./context-usage";

const sample = (over: Partial<AiContextUsage> = {}): AiContextUsage => ({
  estimatedUsedTokens: 15728,
  contextLimit: 65536,
  compacted: false,
  source: "server-estimate",
  ...over,
});

function msg(
  role: AiChatMessage["role"],
  metadata: Record<string, unknown> | null,
): AiChatMessage {
  return {
    id: `${role}-${Math.random()}`,
    chatId: "c1",
    role,
    content: "x",
    toolCalls: null,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

describe("context-usage", () => {
  it("rejects unknown / provider usage shapes", () => {
    expect(isAiContextUsage(null)).toBe(false);
    expect(isAiContextUsage({ promptTokens: 12, totalTokens: 20 })).toBe(false);
    expect(
      isAiContextUsage({
        estimatedUsedTokens: 10,
        contextLimit: 65536,
        compacted: false,
      }),
    ).toBe(false);
    expect(isAiContextUsage(sample())).toBe(true);
  });

  it("hydrates the last assistant snapshot, not user/provider usage", () => {
    const older = sample({ estimatedUsedTokens: 1000 });
    const newer = sample({ estimatedUsedTokens: 9000, compacted: true });
    const messages = [
      msg("assistant", { contextUsage: older, tokenUsage: { totalTokens: 99 } }),
      msg("user", { contextUsage: sample({ estimatedUsedTokens: 1 }) }),
      msg("assistant", {
        tokenUsage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        contextUsage: newer,
      }),
    ];
    expect(findLatestContextUsage(messages)).toEqual(newer);
  });

  it("unknown when no snapshot exists", () => {
    expect(
      findLatestContextUsage([
        msg("assistant", { model: "redcore-general", tokenCount: 40 }),
      ]),
    ).toBeNull();
  });

  it("percent uses contextLimit and clamps", () => {
    expect(contextUsagePercent(sample({ estimatedUsedTokens: 0 }))).toBe(0);
    expect(
      roundedContextPercent(
        contextUsagePercent(sample({ estimatedUsedTokens: 15728 })),
      ),
    ).toBe(24);
    expect(
      contextUsagePercent(
        sample({ estimatedUsedTokens: 70000, contextLimit: 65536 }),
      ),
    ).toBe(100);
    expect(CONTEXT_USAGE_LIMIT_FALLBACK).toBe(65536);
  });

  it("thresholds: 59 neutral, 61 attention, 81 high", () => {
    expect(contextUsageVisualLevel(0, true)).toBe("neutral");
    expect(contextUsageVisualLevel(59, true)).toBe("neutral");
    expect(contextUsageVisualLevel(60, true)).toBe("neutral");
    expect(contextUsageVisualLevel(61, true)).toBe("attention");
    expect(contextUsageVisualLevel(79, true)).toBe("attention");
    expect(contextUsageVisualLevel(80, true)).toBe("attention");
    expect(contextUsageVisualLevel(81, true)).toBe("high");
    expect(contextUsageVisualLevel(95, true)).toBe("high");
    expect(contextUsageVisualLevel(100, true)).toBe("high");
    expect(contextUsageVisualLevel(null, false)).toBe("unknown");
  });

  it("keeps optional breakdowns optional", () => {
    const usage = sample();
    expect(usage.systemPromptTokens).toBeUndefined();
    expect(usage.internalMemoryTokens).toBeUndefined();
  });
});
