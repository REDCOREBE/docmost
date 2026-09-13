import {
  addDays,
  dayIndex,
  maxTimelineDays,
  marginDays,
  pxPerDay,
  startOfLocalDay,
  type GanttDatedRow,
} from "./gantt-timeline";
import type { GanttZoom } from "@/ee/base/types/base.types";

/** Cap so short ranges don't become cartoonishly wide. */
export const MAX_EFFECTIVE_PX_PER_DAY = 64;

/** Floor so long ranges remain readable when not scrolling. */
export const MIN_EFFECTIVE_PX_PER_DAY = 4;

/**
 * ROOT_CAUSE_FULL_WIDTH (EPMF):
 * The timeline canvas width was `dayCount * defaultPxPerDay(zoom)` only.
 * Short ranges (few days/weeks) produced a naturalWidth << containerWidth,
 * so the grid occupied ~half the pane with empty flex space on the right.
 *
 * Fix: scale day width so the canvas fills available width when natural
 * width is smaller, using a single effectivePxPerDay for header/body/bars.
 */
export function computeEffectivePxPerDay(input: {
  dayCount: number;
  zoom: GanttZoom;
  containerWidthPx: number;
}): { effectivePxPerDay: number; timelineWidth: number; stretched: boolean } {
  const { dayCount, zoom, containerWidthPx } = input;
  const base = pxPerDay(zoom);
  if (dayCount <= 0) {
    return {
      effectivePxPerDay: base,
      timelineWidth: Math.max(0, containerWidthPx),
      stretched: false,
    };
  }

  const naturalWidth = dayCount * base;
  const available = Math.max(0, containerWidthPx);
  if (available <= 0 || naturalWidth >= available) {
    return {
      effectivePxPerDay: base,
      timelineWidth: naturalWidth,
      stretched: false,
    };
  }

  const stretched = available / dayCount;
  const effective = Math.min(MAX_EFFECTIVE_PX_PER_DAY, Math.max(base, stretched));
  // If max cap prevents full fill, still use effective*dayCount (may leave a
  // small gap rather than absurd day columns).
  return {
    effectivePxPerDay: effective,
    timelineWidth: effective * dayCount,
    stretched: effective > base,
  };
}

/**
 * When stretch is capped by MAX_EFFECTIVE_PX_PER_DAY and still doesn't fill,
 * optionally extend the date window with extra padding days so the canvas
 * matches the container without oversized cells.
 */
export function maybeExtendRangeForWidth(input: {
  rangeStart: Date;
  dayCount: number;
  zoom: GanttZoom;
  containerWidthPx: number;
}): { rangeStart: Date; dayCount: number } {
  const { rangeStart, dayCount, zoom, containerWidthPx } = input;
  const { timelineWidth, effectivePxPerDay } = computeEffectivePxPerDay({
    dayCount,
    zoom,
    containerWidthPx,
  });
  if (containerWidthPx <= 0 || timelineWidth >= containerWidthPx - 1) {
    return { rangeStart, dayCount };
  }
  if (effectivePxPerDay < MAX_EFFECTIVE_PX_PER_DAY - 0.5) {
    return { rangeStart, dayCount };
  }

  const needed = Math.ceil(containerWidthPx / MAX_EFFECTIVE_PX_PER_DAY);
  const maxDays = maxTimelineDays(zoom);
  const target = Math.min(maxDays, Math.max(dayCount, needed));
  if (target <= dayCount) return { rangeStart, dayCount };

  const extra = target - dayCount;
  const padLeft = Math.floor(extra / 2);
  return {
    rangeStart: addDays(rangeStart, -padLeft),
    dayCount: target,
  };
}

export function computeFilledTimeline(input: {
  dated: GanttDatedRow[];
  zoom: GanttZoom;
  containerWidthPx: number;
  now?: Date;
}): {
  rangeStart: Date;
  dayCount: number;
  effectivePxPerDay: number;
  timelineWidth: number;
  clamped: boolean;
} {
  const now = input.now ?? new Date();
  const today = startOfLocalDay(now);
  const margin = marginDays(input.zoom);
  const maxDays = maxTimelineDays(input.zoom);

  let rangeStart: Date;
  let rangeEnd: Date;
  let clamped = false;

  if (input.dated.length === 0) {
    rangeStart = addDays(today, -margin);
    rangeEnd = addDays(today, margin);
  } else {
    let min = input.dated[0].start;
    let max = input.dated[0].end;
    for (const d of input.dated) {
      if (d.start < min) min = d.start;
      if (d.end > max) max = d.end;
    }
    rangeStart = addDays(min, -margin);
    rangeEnd = addDays(max, margin);
    let dayCount = dayIndex(rangeStart, rangeEnd) + 1;
    if (dayCount > maxDays) {
      clamped = true;
      const half = Math.floor(maxDays / 2);
      let center = today;
      if (today < min || today > max) {
        const starts = input.dated
          .map((d) => d.start.getTime())
          .sort((a, b) => a - b);
        center = startOfLocalDay(
          new Date(starts[Math.floor(starts.length / 2)]),
        );
      }
      rangeStart = addDays(center, -half);
      rangeEnd = addDays(center, maxDays - half - 1);
    }
  }

  let dayCount = dayIndex(rangeStart, rangeEnd) + 1;
  const extended = maybeExtendRangeForWidth({
    rangeStart,
    dayCount,
    zoom: input.zoom,
    containerWidthPx: input.containerWidthPx,
  });
  rangeStart = extended.rangeStart;
  dayCount = extended.dayCount;

  const scale = computeEffectivePxPerDay({
    dayCount,
    zoom: input.zoom,
    containerWidthPx: input.containerWidthPx,
  });

  return {
    rangeStart,
    dayCount,
    effectivePxPerDay: scale.effectivePxPerDay,
    timelineWidth: scale.timelineWidth,
    clamped,
  };
}
