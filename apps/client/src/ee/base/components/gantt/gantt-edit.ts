import { addDays, parseCellDate, startOfLocalDay } from "./gantt-timeline";
import type { IBaseRow } from "@/ee/base/types/base.types";

export type GanttEditMode = "drag" | "resize-left" | "resize-right";

export type MilestoneEditMode = "start-only" | "end-only" | "same-day";

export type GanttDatePatch = {
  start: Date | null;
  end: Date | null;
  /** Which fields to write (others left untouched). */
  writeStart: boolean;
  writeEnd: boolean;
};

/** Snap a horizontal pixel delta to whole days (always day snap, any zoom). */
export function daysDeltaFromPx(deltaPx: number, dayWidth: number): number {
  if (!Number.isFinite(deltaPx) || !Number.isFinite(dayWidth) || dayWidth <= 0) {
    return 0;
  }
  return Math.round(deltaPx / dayWidth);
}

/**
 * Serialize a local calendar day the same way CellDate / FieldDate do:
 * UTC midnight for that Y-M-D (stable for Europe/Brussels).
 */
export function dateToCellValue(d: Date): string {
  const day = startOfLocalDay(d);
  return new Date(
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()),
  ).toISOString();
}

export function clampStartToEnd(start: Date, end: Date): Date {
  return start.getTime() > end.getTime() ? new Date(end) : start;
}

export function clampEndToStart(start: Date, end: Date): Date {
  return end.getTime() < start.getTime() ? new Date(start) : end;
}

/** Move a bar; duration (inclusive day span) stays identical. */
export function applyBarDrag(
  start: Date,
  end: Date,
  deltaDays: number,
): { start: Date; end: Date } {
  if (deltaDays === 0) return { start, end };
  return {
    start: addDays(start, deltaDays),
    end: addDays(end, deltaDays),
  };
}

export function applyResizeLeft(
  start: Date,
  end: Date,
  deltaDays: number,
): { start: Date; end: Date } {
  if (deltaDays === 0) return { start, end };
  const nextStart = clampStartToEnd(addDays(start, deltaDays), end);
  return { start: nextStart, end };
}

export function applyResizeRight(
  start: Date,
  end: Date,
  deltaDays: number,
): { start: Date; end: Date } {
  if (deltaDays === 0) return { start, end };
  const nextEnd = clampEndToStart(start, addDays(end, deltaDays));
  return { start, end: nextEnd };
}

export function resolveMilestoneEditMode(
  row: IBaseRow,
  startPropertyId: string,
  endPropertyId: string,
): MilestoneEditMode | null {
  const start = parseCellDate(row.cells?.[startPropertyId]);
  const end = parseCellDate(row.cells?.[endPropertyId]);
  if (!start && !end) return null;
  if (start && end) {
    if (start.getTime() === end.getTime()) return "same-day";
    return null; // bar, not milestone
  }
  if (start && !end) return "start-only";
  if (!start && end) return "end-only";
  return null;
}

/**
 * Milestone drag — never invents the missing date / never expands to a bar.
 * same-day: move both dates together.
 */
export function applyMilestoneDrag(
  mode: MilestoneEditMode,
  start: Date,
  end: Date,
  deltaDays: number,
): GanttDatePatch {
  if (deltaDays === 0) {
    return {
      start,
      end,
      writeStart: mode !== "end-only",
      writeEnd: mode !== "start-only",
    };
  }
  if (mode === "start-only") {
    const next = addDays(start, deltaDays);
    return { start: next, end: next, writeStart: true, writeEnd: false };
  }
  if (mode === "end-only") {
    const next = addDays(end, deltaDays);
    return { start: next, end: next, writeStart: false, writeEnd: true };
  }
  // same-day
  const next = addDays(start, deltaDays);
  return { start: next, end: next, writeStart: true, writeEnd: true };
}

export function applyBarEdit(
  mode: GanttEditMode,
  start: Date,
  end: Date,
  deltaDays: number,
): GanttDatePatch {
  if (mode === "drag") {
    const next = applyBarDrag(start, end, deltaDays);
    return { ...next, writeStart: true, writeEnd: true };
  }
  if (mode === "resize-left") {
    const next = applyResizeLeft(start, end, deltaDays);
    return { ...next, writeStart: true, writeEnd: false };
  }
  const next = applyResizeRight(start, end, deltaDays);
  return { ...next, writeStart: false, writeEnd: true };
}

/** Build cell map for the commit (ISO strings; omit untouched keys). */
export function buildDateCells(input: {
  startPropertyId: string;
  endPropertyId: string;
  patch: GanttDatePatch;
}): Record<string, string | null> {
  const cells: Record<string, string | null> = {};
  const { startPropertyId, endPropertyId, patch } = input;
  if (patch.writeStart) {
    cells[startPropertyId] = patch.start ? dateToCellValue(patch.start) : null;
  }
  if (patch.writeEnd) {
    if (startPropertyId === endPropertyId && patch.writeStart) {
      // Single property: one write is enough (same value).
      cells[startPropertyId] = patch.end
        ? dateToCellValue(patch.end)
        : cells[startPropertyId] ?? null;
    } else {
      cells[endPropertyId] = patch.end ? dateToCellValue(patch.end) : null;
    }
  }
  return cells;
}

export function datesEqualDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}
