import type { FilterGroup, IBase, IBaseView } from "@/ee/base/types/base.types";
import { BaseKanban } from "@/ee/base/components/kanban/base-kanban";

type Props = {
  base: IBase;
  view: IBaseView;
  viewFilter?: FilterGroup;
  editable: boolean;
};

/** Native BaseKanban + KanbanColumn (Pragmatic DnD). Data via BaseDataPorts. */
export function TasksNativeKanban({ base, view, viewFilter, editable }: Props) {
  return (
    <BaseKanban
      base={base}
      view={view}
      pageId={base.id}
      embedded
      editable={editable}
      viewFilter={viewFilter}
    />
  );
}
