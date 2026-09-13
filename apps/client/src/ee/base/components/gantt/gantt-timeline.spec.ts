import { describe, expect, it } from "vitest";
import {
  computeTimelineRange,
  parseCellDate,
  resolveRowSpan,
  startOfLocalDay,
} from "@/ee/base/components/gantt/gantt-timeline";
import type { IBaseRow } from "@/ee/base/types/base.types";

function row(cells: Record<string, unknown>): IBaseRow {
  return {
    id: "r1",
    pageId: "p1",
    cells,
    position: "a0",
    creatorId: "",
    lastUpdatedById: null,
    workspaceId: "w1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("gantt-timeline", () => {
  it("parses ISO date strings to local day", () => {
    const d = parseCellDate("2026-09-13T15:00:00.000Z");
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(0);
  });

  it("returns null for missing dates", () => {
    expect(parseCellDate(null)).toBeNull();
    expect(parseCellDate("")).toBeNull();
    expect(parseCellDate("not-a-date")).toBeNull();
  });

  it("excludes rows with no dates at all", () => {
    expect(
      resolveRowSpan(row({ start: null, end: null }), "start", "end"),
    ).toBeNull();
  });

  it("renders start-only as milestone (no invented end)", () => {
    const span = resolveRowSpan(
      row({ start: "2026-09-01", end: null }),
      "start",
      "end",
    );
    expect(span).not.toBeNull();
    expect(span!.kind).toBe("milestone");
    expect(span!.start.getDate()).toBe(1);
    expect(span!.end.getTime()).toBe(span!.start.getTime());
  });

  it("renders end-only as milestone (no invented start)", () => {
    const span = resolveRowSpan(
      row({ start: null, end: "2026-09-05" }),
      "start",
      "end",
    );
    expect(span).not.toBeNull();
    expect(span!.kind).toBe("milestone");
    expect(span!.start.getDate()).toBe(5);
    expect(span!.end.getTime()).toBe(span!.start.getTime());
  });

  it("renders same-day start/end as milestone", () => {
    const span = resolveRowSpan(
      row({ start: "2026-09-03", end: "2026-09-03" }),
      "start",
      "end",
    );
    expect(span!.kind).toBe("milestone");
  });

  it("keeps valid multi-day start/end as bar", () => {
    const span = resolveRowSpan(
      row({ start: "2026-09-01", end: "2026-09-05" }),
      "start",
      "end",
    );
    expect(span).not.toBeNull();
    expect(span!.kind).toBe("bar");
    expect(span!.start.getDate()).toBe(1);
    expect(span!.end.getDate()).toBe(5);
  });

  it("swaps inverted ranges as bar", () => {
    const span = resolveRowSpan(
      row({ start: "2026-09-10", end: "2026-09-02" }),
      "start",
      "end",
    );
    expect(span!.kind).toBe("bar");
    expect(span!.start.getDate()).toBe(2);
    expect(span!.end.getDate()).toBe(10);
  });

  it("adds margin around dated rows", () => {
    const dated = [
      {
        row: row({}),
        start: startOfLocalDay(new Date("2026-09-10T00:00:00")),
        end: startOfLocalDay(new Date("2026-09-12T00:00:00")),
        kind: "bar" as const,
      },
    ];
    const { rangeStart, rangeEnd, dayCount, clamped } = computeTimelineRange(
      dated,
      "week",
    );
    expect(dayCount).toBeGreaterThan(14);
    expect(clamped).toBe(false);
    expect(rangeStart.getTime()).toBeLessThan(dated[0].start.getTime());
    expect(rangeEnd.getTime()).toBeGreaterThan(dated[0].end.getTime());
  });

  it("clamps extreme 2020-2030 spans", () => {
    const dated = [
      {
        row: row({}),
        start: startOfLocalDay(new Date("2020-01-01T00:00:00")),
        end: startOfLocalDay(new Date("2030-12-31T00:00:00")),
        kind: "bar" as const,
      },
    ];
    const { dayCount, clamped } = computeTimelineRange(
      dated,
      "week",
      new Date("2026-09-13T12:00:00"),
    );
    expect(clamped).toBe(true);
    expect(dayCount).toBeLessThanOrEqual(280);
  });
});
