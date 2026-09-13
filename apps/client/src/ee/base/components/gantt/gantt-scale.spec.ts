import { describe, expect, it } from "vitest";
import {
  computeEffectivePxPerDay,
  computeFilledTimeline,
  MAX_EFFECTIVE_PX_PER_DAY,
  maybeExtendRangeForWidth,
} from "@/ee/base/components/gantt/gantt-scale";
import type { GanttDatedRow } from "@/ee/base/components/gantt/gantt-timeline";

describe("gantt-scale", () => {
  it("keeps natural width when longer than container", () => {
    const r = computeEffectivePxPerDay({
      dayCount: 365,
      zoom: "week",
      containerWidthPx: 800,
    });
    expect(r.stretched).toBe(false);
    expect(r.timelineWidth).toBeGreaterThan(800);
  });

  it("stretches short timelines to fill container", () => {
    const r = computeEffectivePxPerDay({
      dayCount: 10,
      zoom: "week",
      containerWidthPx: 1000,
    });
    expect(r.stretched).toBe(true);
    expect(r.effectivePxPerDay).toBeLessThanOrEqual(MAX_EFFECTIVE_PX_PER_DAY);
    expect(r.timelineWidth).toBe(r.effectivePxPerDay * 10);
    expect(r.timelineWidth).toBeGreaterThanOrEqual(10 * 14); // > default week px
  });

  it("caps stretch and may extend range", () => {
    const rangeStart = new Date(2026, 8, 1);
    const extended = maybeExtendRangeForWidth({
      rangeStart,
      dayCount: 5,
      zoom: "day",
      containerWidthPx: 2000,
    });
    expect(extended.dayCount).toBeGreaterThanOrEqual(5);
  });

  it("computeFilledTimeline returns consistent scale", () => {
    const dated: GanttDatedRow[] = [
      {
        row: { id: "1" } as GanttDatedRow["row"],
        start: new Date(2026, 8, 1),
        end: new Date(2026, 8, 5),
        kind: "bar",
      },
    ];
    const t = computeFilledTimeline({
      dated,
      zoom: "week",
      containerWidthPx: 1200,
    });
    expect(t.dayCount).toBeGreaterThan(0);
    expect(t.effectivePxPerDay * t.dayCount).toBe(t.timelineWidth);
    expect(t.timelineWidth).toBeGreaterThanOrEqual(Math.min(1200, t.dayCount * MAX_EFFECTIVE_PX_PER_DAY));
  });
});
