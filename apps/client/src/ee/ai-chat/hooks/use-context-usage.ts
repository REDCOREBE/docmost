import { useMemo } from "react";
import type { AiChatMessage, AiContextUsage } from "../types/ai-chat.types";
import {
  contextUsagePercent,
  contextUsageVisualLevel,
  findLatestContextUsage,
  roundedContextPercent,
  type ContextUsageVisualLevel,
} from "../utils/context-usage";

export type ContextUsageView = {
  usage: AiContextUsage | null;
  percent: number | null;
  roundedPercent: number | null;
  isKnown: boolean;
  compacted: boolean;
  visualLevel: ContextUsageVisualLevel;
  ariaLabelKey: "known" | "unknown";
};

export function useContextUsage(
  messages: AiChatMessage[],
  liveSnapshot: AiContextUsage | null,
): ContextUsageView {
  return useMemo(() => {
    const usage = liveSnapshot ?? findLatestContextUsage(messages);
    const isKnown = !!usage;
    const percent = usage ? contextUsagePercent(usage) : null;
    const roundedPercent =
      percent === null ? null : roundedContextPercent(percent);
    return {
      usage,
      percent,
      roundedPercent,
      isKnown,
      compacted: !!usage?.compacted,
      visualLevel: contextUsageVisualLevel(percent, isKnown),
      ariaLabelKey: isKnown ? "known" : "unknown",
    };
  }, [messages, liveSnapshot]);
}
