import type { FilterGroup, IBase, IBaseRow, IBaseView } from "@/ee/base/types/base.types";
import { BaseGantt } from "@/ee/base/components/gantt/base-gantt";

type Props = {
  base: IBase;
  view: IBaseView;
  rows: IBaseRow[];
  viewFilter?: FilterGroup;
  editable: boolean;
};

/** Tasks Gantt — same renderer as Base; data already Task-filtered. */
export function TasksNativeGantt({
  base,
  view,
  rows,
  viewFilter,
  editable,
}: Props) {
  return (
    <BaseGantt
      base={base}
      view={view}
      rows={rows}
      pageId={base.id}
      editable={editable}
      viewFilter={viewFilter}
    />
  );
}
