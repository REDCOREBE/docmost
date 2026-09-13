import type { GanttZoom, IBaseRow } from "@/ee/base/types/base.types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Hard cap so a 2020→2030 outlier cannot explode the DOM. */
export function maxTimelineDays(zoom: GanttZoom): number {
  switch (zoom) {
    case "day":
      return 120;
    case "month":
      return 540;
    case "week":
    default:
      return 280;
  }
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function parseCellDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfLocalDay(value);
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : startOfLocalDay(d);
  }
  return null;
}

export function dayIndex(from: Date, day: Date): number {
  return Math.round(
    (startOfLocalDay(day).getTime() - startOfLocalDay(from).getTime()) / DAY_MS,
  );
}

export function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.max(1, dayIndex(start, end) + 1);
}

export type GanttSpanKind = "bar" | "milestone";

export type GanttDatedRow = {
  row: IBaseRow;
  start: Date;
  end: Date;
  kind: GanttSpanKind;
};

/**
 * Resolve a timeline span from configured date properties.
 * - both dates, different days → bar
 * - start only / end only / same day → milestone (never invents the missing date)
 * - neither date → null (excluded from timeline)
 */
export function resolveRowSpan(
  row: IBaseRow,
  startPropertyId: string,
  endPropertyId: string,
): GanttDatedRow | null {
  const start = parseCellDate(row.cells?.[startPropertyId]);
  const end = parseCellDate(row.cells?.[endPropertyId]);

  if (!start && !end) return null;

  if (start && end) {
    if (end.getTime() === start.getTime()) {
      return { row, start, end, kind: "milestone" };
    }
    if (end.getTime() < start.getTime()) {
      return { row, start: end, end: start, kind: "bar" };
    }
    return { row, start, end, kind: "bar" };
  }

  const day = (start ?? end)!;
  return { row, start: day, end: day, kind: "milestone" };
}

export function pxPerDay(zoom: GanttZoom): number {
  switch (zoom) {
    case "day":
      return 44;
    case "month":
      return 10;
    case "week":
    default:
      return 26;
  }
}

export function marginDays(zoom: GanttZoom): number {
  switch (zoom) {
    case "day":
      return 5;
    case "month":
      return 21;
    case "week":
    default:
      return 10;
  }
}

export type TimelineRange = {
  rangeStart: Date;
  rangeEnd: Date;
  dayCount: number;
  clamped: boolean;
};

/**
 * Window around visible dated rows + zoom margin, with a hard max span.
 * Extreme outliers (e.g. 2020→2030) are clamped around today when possible,
 * otherwise around the median start date of dated rows.
 */
export function computeTimelineRange(
  dated: GanttDatedRow[],
  zoom: GanttZoom,
  now = new Date(),
): TimelineRange {
  const today = startOfLocalDay(now);
  const margin = marginDays(zoom);
  const maxDays = maxTimelineDays(zoom);

  if (dated.length === 0) {
    const rangeStart = addDays(today, -margin);
    const rangeEnd = addDays(today, margin);
    return {
      rangeStart,
      rangeEnd,
      dayCount: dayIndex(rangeStart, rangeEnd) + 1,
      clamped: false,
    };
  }

  let min = dated[0].start;
  let max = dated[0].end;
  for (const d of dated) {
    if (d.start < min) min = d.start;
    if (d.end > max) max = d.end;
  }

  let rangeStart = addDays(min, -margin);
  let rangeEnd = addDays(max, margin);
  let dayCount = dayIndex(rangeStart, rangeEnd) + 1;
  let clamped = false;

  if (dayCount > maxDays) {
    clamped = true;
    const half = Math.floor(maxDays / 2);
    let center = today;
    if (today < min || today > max) {
      const starts = dated.map((d) => d.start.getTime()).sort((a, b) => a - b);
      center = startOfLocalDay(new Date(starts[Math.floor(starts.length / 2)]));
    }
    rangeStart = addDays(center, -half);
    rangeEnd = addDays(center, maxDays - half - 1);
    dayCount = dayIndex(rangeStart, rangeEnd) + 1;
  }

  return { rangeStart, rangeEnd, dayCount, clamped };
}

export type MonthHeader = {
  key: string;
  label: string;
  startIndex: number;
  spanDays: number;
};

export type DayHeader = {
  key: string;
  label: string;
  index: number;
  isWeekend: boolean;
  isToday: boolean;
  date: Date;
};

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function buildHeaders(
  rangeStart: Date,
  dayCount: number,
  zoom: GanttZoom,
  now = new Date(),
): { months: MonthHeader[]; days: DayHeader[] } {
  const today = startOfLocalDay(now);
  const days: DayHeader[] = [];
  const months: MonthHeader[] = [];
  let currentMonthKey = "";
  let monthStartIndex = 0;

  for (let i = 0; i < dayCount; i++) {
    const date = addDays(rangeStart, i);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthKey !== currentMonthKey) {
      if (currentMonthKey) {
        const anchor = addDays(rangeStart, monthStartIndex);
        months.push({
          key: currentMonthKey,
          label: `${MONTHS_SHORT[anchor.getMonth()]} ${anchor.getFullYear()}`,
          startIndex: monthStartIndex,
          spanDays: i - monthStartIndex,
        });
      }
      currentMonthKey = monthKey;
      monthStartIndex = i;
    }

    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    let label: string;
    if (zoom === "month") {
      if (date.getDate() === 1 || i === 0) label = String(date.getDate());
      else if (date.getDate() % 7 === 1) label = String(date.getDate());
      else label = "";
    } else if (zoom === "week") {
      label = String(date.getDate());
    } else {
      // day zoom: weekday initial + date for short-term readability
      const wd = ["S", "M", "T", "W", "T", "F", "S"][dow];
      label = `${wd}${date.getDate()}`;
    }

    days.push({
      key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      label,
      index: i,
      isWeekend,
      isToday: date.getTime() === today.getTime(),
      date,
    });
  }

  if (currentMonthKey) {
    const anchor = addDays(rangeStart, monthStartIndex);
    months.push({
      key: currentMonthKey,
      label: `${MONTHS_SHORT[anchor.getMonth()]} ${anchor.getFullYear()}`,
      startIndex: monthStartIndex,
      spanDays: dayCount - monthStartIndex,
    });
  }

  return { months, days };
}
