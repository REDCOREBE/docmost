import { describe, expect, it } from "vitest";
import {
  applyBarDrag,
  applyBarEdit,
  applyMilestoneDrag,
  applyResizeLeft,
  applyResizeRight,
  buildDateCells,
  dateToCellValue,
  daysDeltaFromPx,
  resolveMilestoneEditMode,
} from "./gantt-edit";
import { daysBetweenInclusive, parseCellDate } from "./gantt-timeline";
import type { IBaseRow } from "@/ee/base/types/base.types";

function d(iso: string): Date {
  return parseCellDate(iso)!;
}

function row(cells: Record<string, unknown>): IBaseRow {
  return {
    id: "r1",
    pageId: "p1",
    cells,
    position: "a0",
    creatorId: "u1",
    lastUpdatedById: null,
    workspaceId: "w1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("gantt-edit daysDeltaFromPx", () => {
  it("snaps to nearest day", () => {
    expect(daysDeltaFromPx(0, 26)).toBe(0);
    expect(daysDeltaFromPx(13, 26)).toBe(1);
    expect(daysDeltaFromPx(12, 26)).toBe(0);
    expect(daysDeltaFromPx(-40, 26)).toBe(-2);
    expect(daysDeltaFromPx(100, 10)).toBe(10);
  });
});

describe("gantt-edit bar drag", () => {
  it("preserves inclusive duration", () => {
    const start = d("2026-09-15T00:00:00.000Z");
    const end = d("2026-09-20T00:00:00.000Z");
    const before = daysBetweenInclusive(start, end);
    const next = applyBarDrag(start, end, 3);
    expect(dateToCellValue(next.start)).toBe(dateToCellValue(d("2026-09-18T00:00:00.000Z")));
    expect(dateToCellValue(next.end)).toBe(dateToCellValue(d("2026-09-23T00:00:00.000Z")));
    expect(daysBetweenInclusive(next.start, next.end)).toBe(before);
  });

  it("drag writes both dates", () => {
    const patch = applyBarEdit("drag", d("2026-09-15T00:00:00.000Z"), d("2026-09-20T00:00:00.000Z"), 3);
    expect(patch.writeStart).toBe(true);
    expect(patch.writeEnd).toBe(true);
  });
});

describe("gantt-edit resize", () => {
  it("resize left changes start only and clamps", () => {
    const start = d("2026-09-15T00:00:00.000Z");
    const end = d("2026-09-20T00:00:00.000Z");
    const next = applyResizeLeft(start, end, 2);
    expect(dateToCellValue(next.start)).toBe(dateToCellValue(d("2026-09-17T00:00:00.000Z")));
    expect(dateToCellValue(next.end)).toBe(dateToCellValue(end));

    const clamped = applyResizeLeft(start, end, 20);
    expect(dateToCellValue(clamped.start)).toBe(dateToCellValue(end));
  });

  it("resize right changes end only and clamps", () => {
    const start = d("2026-09-15T00:00:00.000Z");
    const end = d("2026-09-20T00:00:00.000Z");
    const next = applyResizeRight(start, end, -2);
    expect(dateToCellValue(next.start)).toBe(dateToCellValue(start));
    expect(dateToCellValue(next.end)).toBe(dateToCellValue(d("2026-09-18T00:00:00.000Z")));

    const clamped = applyResizeRight(start, end, -40);
    expect(dateToCellValue(clamped.end)).toBe(dateToCellValue(start));
  });
});

describe("gantt-edit milestones", () => {
  it("detects start-only / end-only / same-day", () => {
    expect(
      resolveMilestoneEditMode(row({ s: "2026-09-15T00:00:00.000Z" }), "s", "e"),
    ).toBe("start-only");
    expect(
      resolveMilestoneEditMode(row({ e: "2026-09-15T00:00:00.000Z" }), "s", "e"),
    ).toBe("end-only");
    expect(
      resolveMilestoneEditMode(
        row({ s: "2026-09-15T00:00:00.000Z", e: "2026-09-15T00:00:00.000Z" }),
        "s",
        "e",
      ),
    ).toBe("same-day");
    expect(
      resolveMilestoneEditMode(
        row({ s: "2026-09-15T00:00:00.000Z", e: "2026-09-20T00:00:00.000Z" }),
        "s",
        "e",
      ),
    ).toBeNull();
  });

  it("start-only drag writes start only", () => {
    const patch = applyMilestoneDrag(
      "start-only",
      d("2026-09-15T00:00:00.000Z"),
      d("2026-09-15T00:00:00.000Z"),
      2,
    );
    expect(patch.writeStart).toBe(true);
    expect(patch.writeEnd).toBe(false);
    expect(dateToCellValue(patch.start!)).toBe(
      dateToCellValue(d("2026-09-17T00:00:00.000Z")),
    );
  });

  it("end-only drag writes end only", () => {
    const patch = applyMilestoneDrag(
      "end-only",
      d("2026-09-15T00:00:00.000Z"),
      d("2026-09-15T00:00:00.000Z"),
      -1,
    );
    expect(patch.writeStart).toBe(false);
    expect(patch.writeEnd).toBe(true);
  });

  it("same-day moves both without expanding to a bar", () => {
    const patch = applyMilestoneDrag(
      "same-day",
      d("2026-09-15T00:00:00.000Z"),
      d("2026-09-15T00:00:00.000Z"),
      5,
    );
    expect(patch.writeStart).toBe(true);
    expect(patch.writeEnd).toBe(true);
    expect(patch.start!.getTime()).toBe(patch.end!.getTime());
  });
});

describe("gantt-edit buildDateCells + boundaries", () => {
  it("year boundary", () => {
    const next = applyBarDrag(d("2026-12-30T00:00:00.000Z"), d("2026-12-31T00:00:00.000Z"), 3);
    expect(dateToCellValue(next.start)).toBe("2027-01-02T00:00:00.000Z");
    expect(dateToCellValue(next.end)).toBe("2027-01-03T00:00:00.000Z");
  });

  it("month boundary", () => {
    const next = applyResizeRight(
      d("2026-09-28T00:00:00.000Z"),
      d("2026-09-30T00:00:00.000Z"),
      2,
    );
    expect(dateToCellValue(next.end)).toBe("2026-10-02T00:00:00.000Z");
  });

  it("DST-safe local day shift (Europe/Brussels spring)", () => {
    // 2026-03-29 is DST start in Brussels; shifting across it must stay on calendar days.
    const start = d("2026-03-28T00:00:00.000Z");
    const end = d("2026-03-30T00:00:00.000Z");
    const next = applyBarDrag(start, end, 1);
    expect(dateToCellValue(next.start)).toBe("2026-03-29T00:00:00.000Z");
    expect(dateToCellValue(next.end)).toBe("2026-03-31T00:00:00.000Z");
  });

  it("buildDateCells emits ISO for written fields only", () => {
    const cells = buildDateCells({
      startPropertyId: "sys:startDate",
      endPropertyId: "sys:dueDate",
      patch: {
        start: d("2026-09-18T00:00:00.000Z"),
        end: d("2026-09-23T00:00:00.000Z"),
        writeStart: true,
        writeEnd: false,
      },
    });
    expect(cells).toEqual({ "sys:startDate": "2026-09-18T00:00:00.000Z" });
    expect(cells["sys:dueDate"]).toBeUndefined();
  });
});

describe("gantt-edit preview scale", () => {
  it("applies preview over 500 rows quickly", async () => {
    const { applyPreviewToDated } = await import("./use-gantt-pointer-edit");
    const rows = Array.from({ length: 500 }, (_, i) => ({
      row: row({ s: "2026-09-01T00:00:00.000Z", e: "2026-09-05T00:00:00.000Z" }),
      start: d("2026-09-01T00:00:00.000Z"),
      end: d("2026-09-05T00:00:00.000Z"),
      kind: "bar" as const,
    }));
    rows[250].row = { ...rows[250].row, id: "target" };
    const t0 = performance.now();
    const next = applyPreviewToDated(rows, {
      rowId: "target",
      start: d("2026-09-10T00:00:00.000Z"),
      end: d("2026-09-14T00:00:00.000Z"),
    });
    const ms = performance.now() - t0;
    expect(next[250].start.getTime()).toBe(d("2026-09-10T00:00:00.000Z").getTime());
    expect(ms).toBeLessThan(50);
  });

  it("preview does not expand a same-day milestone into a bar", async () => {
    const { applyPreviewToDated } = await import("./use-gantt-pointer-edit");
    const dated = [
      {
        row: row({ s: "2026-09-15T00:00:00.000Z", e: "2026-09-15T00:00:00.000Z" }),
        start: d("2026-09-15T00:00:00.000Z"),
        end: d("2026-09-15T00:00:00.000Z"),
        kind: "milestone" as const,
      },
    ];
    const next = applyPreviewToDated(dated, {
      rowId: "r1",
      start: d("2026-09-20T00:00:00.000Z"),
      end: d("2026-09-20T00:00:00.000Z"),
    });
    expect(next[0].kind).toBe("milestone");
    expect(next[0].start.getTime()).toBe(next[0].end.getTime());
  });
});

describe("gantt-edit R24 compatibility", () => {
  it("day snap uses current effectivePxPerDay (not a frozen 26px R23 default)", () => {
    const epmf = 42.36;
    expect(daysDeltaFromPx(epmf, epmf)).toBe(1);
    expect(daysDeltaFromPx(epmf * 2.4, epmf)).toBe(2);
    expect(daysDeltaFromPx(13, 26)).toBe(1);
    expect(daysDeltaFromPx(13, epmf)).toBe(0);
    expect(daysDeltaFromPx(4, 4)).toBe(1);
  });

  it("does not rewrite visiblePropertyIds / barPropertyIds / URL state", () => {
    const cells = buildDateCells({
      startPropertyId: "sys:startDate",
      endPropertyId: "sys:dueDate",
      patch: {
        start: d("2026-09-18T00:00:00.000Z"),
        end: d("2026-09-23T00:00:00.000Z"),
        writeStart: true,
        writeEnd: true,
      },
    });
    expect(Object.keys(cells).sort()).toEqual(["sys:dueDate", "sys:startDate"]);
  });

  it("keeps timeline scale stable if preview were applied to datedRaw", async () => {
    const { computeFilledTimeline } = await import("./gantt-scale");
    const { applyPreviewToDated } = await import("./use-gantt-pointer-edit");
    const datedRaw = [
      {
        row: row({ s: "2026-09-01T00:00:00.000Z", e: "2026-09-05T00:00:00.000Z" }),
        start: d("2026-09-01T00:00:00.000Z"),
        end: d("2026-09-05T00:00:00.000Z"),
        kind: "bar" as const,
      },
    ];
    const previewed = applyPreviewToDated(datedRaw, {
      rowId: "r1",
      start: d("2027-06-01T00:00:00.000Z"),
      end: d("2027-06-10T00:00:00.000Z"),
    });
    const fromRaw = computeFilledTimeline({
      dated: datedRaw,
      zoom: "week",
      containerWidthPx: 1059,
    });
    const fromPreview = computeFilledTimeline({
      dated: previewed,
      zoom: "week",
      containerWidthPx: 1059,
    });
    expect(fromRaw.effectivePxPerDay).not.toBe(fromPreview.effectivePxPerDay);
    // View must feed datedRaw into computeFilledTimeline so drag cannot retune EPMF.
    expect(fromRaw.dayCount).toBeLessThan(fromPreview.dayCount);
  });
});
