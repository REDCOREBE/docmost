import { useCallback, useEffect, useRef, useState } from "react";
import type { GanttDatedRow } from "./gantt-timeline";
import {
  applyBarEdit,
  applyMilestoneDrag,
  buildDateCells,
  daysDeltaFromPx,
  resolveMilestoneEditMode,
  type GanttDatePatch,
  type GanttEditMode,
} from "./gantt-edit";

export type GanttCommitDates = (input: {
  rowId: string;
  cells: Record<string, string | null>;
}) => Promise<void>;

export type GanttPreview = {
  rowId: string;
  start: Date;
  end: Date;
};

type ActiveEdit = {
  rowId: string;
  mode: GanttEditMode | "milestone";
  originX: number;
  originStart: Date;
  originEnd: Date;
  dayWidth: number;
  startPropertyId: string;
  endPropertyId: string;
  milestoneMode?: ReturnType<typeof resolveMilestoneEditMode>;
  moved: boolean;
};

/**
 * Pointer-based timeline edit (day snap). Uses native pointer events rather than
 * @atlaskit/pragmatic-drag-and-drop — continuous day-delta preview + resize handles
 * are a poor fit for list-oriented DnD; Kanban/ViewTabs keep pragmatic DnD.
 */
export function useGanttPointerEdit(opts: {
  editable: boolean;
  startPropertyId: string;
  endPropertyId: string;
  onCommitDates?: GanttCommitDates;
}) {
  const { editable, startPropertyId, endPropertyId, onCommitDates } = opts;
  const [preview, setPreview] = useState<GanttPreview | null>(null);
  const [dragging, setDragging] = useState(false);
  const activeRef = useRef<ActiveEdit | null>(null);
  const submittingRef = useRef(false);
  const suppressClickRef = useRef(false);

  const computePatch = useCallback(
    (active: ActiveEdit, clientX: number): GanttDatePatch => {
      const deltaDays = daysDeltaFromPx(clientX - active.originX, active.dayWidth);
      if (active.mode === "milestone" && active.milestoneMode) {
        return applyMilestoneDrag(
          active.milestoneMode,
          active.originStart,
          active.originEnd,
          deltaDays,
        );
      }
      return applyBarEdit(
        active.mode as GanttEditMode,
        active.originStart,
        active.originEnd,
        deltaDays,
      );
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const active = activeRef.current;
      if (!active) return;
      if (Math.abs(e.clientX - active.originX) > 3) active.moved = true;
      const patch = computePatch(active, e.clientX);
      if (!patch.start || !patch.end) return;
      setPreview({
        rowId: active.rowId,
        start: patch.start,
        end: patch.end,
      });
    };

    const onUp = async (e: PointerEvent) => {
      const active = activeRef.current;
      activeRef.current = null;
      setDragging(false);
      if (!active) {
        setPreview(null);
        return;
      }

      if (active.moved) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }

      const patch = computePatch(active, e.clientX);
      const startSame =
        patch.start?.getTime() === active.originStart.getTime();
      const endSame = patch.end?.getTime() === active.originEnd.getTime();
      if (!active.moved || (startSame && endSame)) {
        setPreview(null);
        return;
      }

      if (!onCommitDates || submittingRef.current) {
        setPreview(null);
        return;
      }

      // Keep optimistic preview until mutation settles
      if (patch.start && patch.end) {
        setPreview({ rowId: active.rowId, start: patch.start, end: patch.end });
      }

      const cells = buildDateCells({
        startPropertyId: active.startPropertyId,
        endPropertyId: active.endPropertyId,
        patch,
      });

      submittingRef.current = true;
      try {
        await onCommitDates({ rowId: active.rowId, cells });
        // Keep preview until parent rows reflect the new dates (avoids flicker).
        // Cleared by sync effect or timeout fallback.
        window.setTimeout(() => {
          setPreview((prev) =>
            prev && prev.rowId === active.rowId ? null : prev,
          );
        }, 1500);
      } catch {
        setPreview(null);
      } finally {
        submittingRef.current = false;
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, computePatch, onCommitDates]);

  const beginEdit = useCallback(
    (
      e: React.PointerEvent,
      item: GanttDatedRow,
      mode: GanttEditMode | "milestone",
      dayWidth: number,
    ) => {
      if (!editable || !onCommitDates) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const milestoneMode =
        mode === "milestone"
          ? resolveMilestoneEditMode(item.row, startPropertyId, endPropertyId)
          : null;
      if (mode === "milestone" && !milestoneMode) return;

      activeRef.current = {
        rowId: item.row.id,
        mode,
        originX: e.clientX,
        originStart: item.start,
        originEnd: item.end,
        dayWidth,
        startPropertyId,
        endPropertyId,
        milestoneMode: milestoneMode ?? undefined,
        moved: false,
      };
      setPreview({
        rowId: item.row.id,
        start: item.start,
        end: item.end,
      });
      setDragging(true);
    },
    [editable, onCommitDates, startPropertyId, endPropertyId],
  );

  const shouldSuppressClick = useCallback(() => suppressClickRef.current, []);

  const clearPreviewIfSynced = useCallback(
    (dated: GanttDatedRow[]) => {
      setPreview((prev) => {
        if (!prev) return prev;
        const item = dated.find((d) => d.row.id === prev.rowId);
        if (!item) return prev;
        if (
          item.start.getTime() === prev.start.getTime() &&
          item.end.getTime() === prev.end.getTime()
        ) {
          return null;
        }
        return prev;
      });
    },
    [],
  );

  return {
    preview,
    dragging,
    canEdit: editable && !!onCommitDates,
    beginEdit,
    shouldSuppressClick,
    clearPreviewIfSynced,
  };
}

export function applyPreviewToDated(
  dated: GanttDatedRow[],
  preview: GanttPreview | null,
): GanttDatedRow[] {
  if (!preview) return dated;
  return dated.map((item) => {
    if (item.row.id !== preview.rowId) return item;
    // Keep original kind so a same-day milestone never auto-expands to a bar.
    return {
      ...item,
      start: preview.start,
      end: preview.end,
      kind: item.kind,
    };
  });
}
