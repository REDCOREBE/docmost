import { useCallback, useEffect, useRef } from "react";
import type { FilterGroup, IBase, IBaseRow, IBaseView } from "@/ee/base/types/base.types";
import { useBaseDataPorts } from "@/ee/base/context/base-data-ports";
import { useRowDetailModal } from "@/ee/base/hooks/use-row-detail-modal";
import { useUpdateViewMutation } from "@/ee/base/queries/base-view-query";
import { GanttView } from "@/ee/base/components/gantt/gantt-view";
import type { GanttViewConfig } from "@/ee/base/types/base.types";

type BaseGanttProps = {
  base: IBase;
  view: IBaseView;
  rows: IBaseRow[];
  pageId: string;
  editable: boolean;
  /** Reserved — filtering is applied by the parent pipeline before rows. */
  viewFilter?: FilterGroup;
};

/**
 * Soft-migrate R22 `gantt.barPropertyIds` → `visiblePropertyIds` once,
 * so Card properties becomes the sole control without silent config loss.
 * Legacy barPropertyIds remain readable until the write succeeds.
 */
function useMigrateBarPropertyIds(
  view: IBaseView,
  pageId: string,
  editable: boolean,
  persist: (config: {
    visiblePropertyIds: string[];
  }) => void,
) {
  const doneRef = useRef(false);
  useEffect(() => {
    if (doneRef.current || !editable) return;
    const legacy = view.config?.gantt?.barPropertyIds;
    if (!legacy?.length) return;
    if (view.config?.visiblePropertyIds !== undefined) return;
    doneRef.current = true;
    persist({ visiblePropertyIds: [...legacy] });
  }, [view, pageId, editable, persist]);
}

/** Thin Base shell around generic GanttView. */
export function BaseGantt({
  base,
  view,
  rows,
  pageId,
  editable,
}: BaseGanttProps) {
  const ports = useBaseDataPorts();
  const { openRow: openRowFromUrl } = useRowDetailModal(pageId);
  const updateView = useUpdateViewMutation();

  const handleOpenRow = useCallback(
    (rowId: string) => {
      if (ports?.openRow) {
        ports.openRow(rowId);
        return;
      }
      openRowFromUrl(rowId);
    },
    [ports, openRowFromUrl],
  );

  const handleGanttConfigChange = useCallback(
    (gantt: GanttViewConfig) => {
      if (!editable) return;
      if (ports?.persistViewConfig) {
        ports.persistViewConfig({
          viewId: view.id,
          pageId,
          config: { gantt },
        });
        return;
      }
      updateView.mutate({ viewId: view.id, pageId, config: { gantt } });
    },
    [editable, ports, view.id, pageId, updateView],
  );

  const persistVisible = useCallback(
    (config: { visiblePropertyIds: string[] }) => {
      if (ports?.persistViewConfig) {
        ports.persistViewConfig({ viewId: view.id, pageId, config });
        return;
      }
      updateView.mutate({ viewId: view.id, pageId, config });
    },
    [ports, view.id, pageId, updateView],
  );

  useMigrateBarPropertyIds(view, pageId, editable, persistVisible);

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <GanttView
        rows={rows}
        properties={base.properties}
        viewConfig={view.config ?? {}}
        editable={editable}
        onOpenRow={handleOpenRow}
        onGanttConfigChange={handleGanttConfigChange}
      />
    </div>
  );
}
